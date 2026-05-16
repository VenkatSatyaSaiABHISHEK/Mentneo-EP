import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode, type Html5QrcodeCamera } from 'html5-qrcode'

const buildScannerId = () => `qr-reader-${Math.random().toString(36).slice(2)}`

type QrScannerProps = {
  onScan: (decodedText: string) => Promise<void> | void
  onDecode?: (decodedText: string) => void
}

export default function QrScanner({ onScan, onDecode }: QrScannerProps) {
  const [error, setError] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [, setNeedsUserGesture] = useState(false)
  const [cameras, setCameras] = useState<Html5QrcodeCamera[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [, setHasUserStarted] = useState(false)
  const scannerId = useMemo(() => buildScannerId(), [])
  const isProcessingRef = useRef(false)
  const isStartedRef = useRef(false)
  const isStoppingRef = useRef(false)
  const isStartingRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const createScanner = useCallback(() => {
    const html5Qr = new Html5Qrcode(scannerId)
    scannerRef.current = html5Qr
    return html5Qr
  }, [scannerId])

  const ensureCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Unable to access camera. Check permissions.')
      } else {
        setError('Unable to access camera. Check permissions.')
      }
      return false
    }
  }, [])

  const requestCameraAccess = useCallback(async () => {
    if (!selectedCameraId || !navigator.mediaDevices?.getUserMedia) {
      return
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: selectedCameraId } },
      audio: false,
    })
    stream.getTracks().forEach((track) => track.stop())
  }, [selectedCameraId])

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current || !isStartedRef.current) {
      return
    }
    if (isStoppingRef.current || isStartingRef.current) {
      return
    }
    isStoppingRef.current = true
    try {
      const videoElement = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      await scannerRef.current.stop()
    } catch {
      // Ignore stop errors.
    }
    isStartedRef.current = false
    setIsActive(false)
    isStoppingRef.current = false
  }, [scannerId])


  const startScanner = useCallback(async (cameraIdOverride?: string) => {
    if (!scannerRef.current || isStarting || isActive || isStoppingRef.current) {
      return
    }

    isStartingRef.current = true
    setIsStarting(true)
    try {
      setNeedsUserGesture(false)
      const onDecoded = async (decodedText: string) => {
        console.log('SCANNER DETECTED:', decodedText)
        onDecode?.(decodedText)
        if (isProcessingRef.current) {
          return
        }
        isProcessingRef.current = true
        try {
          scannerRef.current?.pause(true)
          await onScan(decodedText)
        } finally {
          setTimeout(() => {
            scannerRef.current?.resume()
            isProcessingRef.current = false
          }, 3000)
        }
      }

      const config = {
        fps: 30,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      }

      const cameraId = cameraIdOverride ?? selectedCameraId

      if (!cameraId) {
        throw new Error('No camera selected. Choose a camera source.')
      }

      if (cameraId === selectedCameraId) {
        await requestCameraAccess()
      }

      await scannerRef.current.start(cameraId, config, onDecoded)
      setError('')
      setIsActive(true)
      isStartedRef.current = true
    } catch (err) {
      if (err instanceof Error) {
        const detail = err.message ? `${err.name}: ${err.message}` : err.name
        setError(detail || 'Unable to start camera scan.')
        if (err.name === 'NotAllowedError') {
          setNeedsUserGesture(true)
        }
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('Unable to start camera scan.')
      }
      setIsActive(false)
    } finally {
      isStartingRef.current = false
      setIsStarting(false)
    }
  }, [isActive, isStarting, onScan, onDecode, selectedCameraId, requestCameraAccess])

  const loadCameras = useCallback(async () => {
    try {
      const list = await Html5Qrcode.getCameras()
      setCameras(list)

      if (!list.length) {
        setError('No cameras detected. Check permissions and try again.')
        return ''
      }

      // Default to back camera if available
      const backCamera = list.find((c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'))
      const defaultId = backCamera ? backCamera.id : list[0].id

      const nextId = selectedCameraId || defaultId
      if (nextId && nextId !== selectedCameraId) {
        setSelectedCameraId(nextId)
      }
      return nextId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to list cameras.')
      return ''
    }
  }, [selectedCameraId])

  useEffect(() => {
    const html5Qr = new Html5Qrcode(scannerId)
    scannerRef.current = html5Qr

    void loadCameras()

    return () => {
      void (async () => {
        try {
          const videoElement = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
          if (isStartedRef.current) {
            await html5Qr.stop()
          }
          html5Qr.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerId]) // Only run once on mount!

  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scanner</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">Live check-in</h3>
      <p className="mt-2 text-sm text-muted">
        Point the camera at the employee QR code to mark attendance.
      </p>
      <style>{`
        #${scannerId} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 1rem;
        }
      `}</style>
      <div
        className={`qr-scanner relative mt-4 h-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/90 ${
          !isActive ? 'cursor-pointer' : ''
        }`}
        onClick={() => {
          setHasUserStarted(true)
          void (async () => {
            await ensureCameraPermission()
            const cameraId = await loadCameras()
            await startScanner(cameraId)
          })()
        }}
      >
        <div id={scannerId} className="qr-scanner-target h-full w-full" />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 text-sm font-semibold text-white">
            Click to enable camera
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
        <span
          className={`h-2 w-2 rounded-full ${
            isActive ? 'bg-emerald-400' : 'bg-slate-300'
          }`}
        />
        <span>
          {isStarting
            ? 'Starting camera...'
            : isActive
              ? 'Camera active'
              : 'Camera not started'}
        </span>
      </div>
      {selectedCameraId && cameras.length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          Selected: {cameras.find((camera) => camera.id === selectedCameraId)?.label ?? 'Camera'}
        </div>
      )}
      {cameras.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Camera source
          </label>
          <select
            value={selectedCameraId}
            onChange={(event) => {
              setSelectedCameraId(event.target.value)
              void stopScanner()
              setHasUserStarted(false)
            }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || 'Camera'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              void (async () => {
                await ensureCameraPermission()
                await loadCameras()
              })()
            }
            className="self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            Refresh cameras
          </button>
          <button
            type="button"
            onClick={async () => {
              setHasUserStarted(true)
              await stopScanner()
              createScanner()
              await ensureCameraPermission()
              const cameraId = await loadCameras()
              await startScanner(cameraId)
            }}
            className="self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            Reset camera
          </button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void stopScanner()}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Stop camera
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  )
}
