import { useCallback, useEffect, useRef, useState } from 'react'
import { AR } from 'js-aruco2'

type AprilTagScannerProps = {
  onScan: (decodedText: string) => Promise<void> | void
  onDecode?: (decodedText: string) => void
}

export default function AprilTagScanner({ onScan, onDecode }: AprilTagScannerProps) {
  const [error, setError] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number>()
  const isProcessingRef = useRef(false)
  const detectorRef = useRef<any>(null)

  useEffect(() => {
    // Initialize the detector once
    detectorRef.current = new AR.Detector()
  }, [])

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === 'videoinput')
      setCameras(videoDevices)
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId)
      }
    } catch (err) {
      setError('Failed to enumerate cameras.')
    }
  }, [selectedCameraId])

  const processFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const detector = detectorRef.current

    if (!video || !canvas || !detector || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(processFrame)
      }
      return
    }

    const context = canvas.getContext('2d', { willReadFrequently: true })
    const overlayCanvas = overlayCanvasRef.current
    if (!context || !overlayCanvas) return

    const overlayCtx = overlayCanvas.getContext('2d')
    if (!overlayCtx) return

    // Match overlay canvas to actual video dimensions for accurate drawing
    if (overlayCanvas.width !== video.videoWidth || overlayCanvas.height !== video.videoHeight) {
      overlayCanvas.width = video.videoWidth
      overlayCanvas.height = video.videoHeight
    }

    // We use a fixed, smaller width for processing to massively increase speed
    const processWidth = 400
    const processHeight = Math.floor((video.videoHeight / video.videoWidth) * processWidth)

    // Match hidden processing canvas size
    if (canvas.width !== processWidth || canvas.height !== processHeight) {
      canvas.width = processWidth
      canvas.height = processHeight
    }

    // Draw the video frame downscaled to the processing canvas
    context.drawImage(video, 0, 0, processWidth, processHeight)
    
    // Clear the overlay for the new frame
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
    
    if (!isProcessingRef.current) {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      let markers = detector.detect(imageData)

      // If no markers found, try an inverted pass for white-on-black tags!
      if (!markers || markers.length === 0) {
        const invertedData = context.getImageData(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < invertedData.data.length; i += 4) {
          invertedData.data[i] = 255 - invertedData.data[i]       // R
          invertedData.data[i + 1] = 255 - invertedData.data[i + 1] // G
          invertedData.data[i + 2] = 255 - invertedData.data[i + 2] // B
        }
        markers = detector.detect(invertedData)
      }

      if (markers && markers.length > 0) {
        // Draw the green bounding box
        const scaleX = video.videoWidth / processWidth
        const scaleY = video.videoHeight / processHeight
        const corners = markers[0].corners
        
        overlayCtx.strokeStyle = '#34d399' // Emerald 400
        overlayCtx.lineWidth = Math.max(4, video.videoWidth / 100)
        overlayCtx.beginPath()
        overlayCtx.moveTo(corners[0].x * scaleX, corners[0].y * scaleY)
        overlayCtx.lineTo(corners[1].x * scaleX, corners[1].y * scaleY)
        overlayCtx.lineTo(corners[2].x * scaleX, corners[2].y * scaleY)
        overlayCtx.lineTo(corners[3].x * scaleX, corners[3].y * scaleY)
        overlayCtx.closePath()
        overlayCtx.stroke()

        const markerId = markers[0].id.toString()
        const formattedId = `EPMN${markerId.padStart(4, '0')}`
        onDecode?.(formattedId)
        
        isProcessingRef.current = true
        try {
          await onScan(formattedId)
        } finally {
          setTimeout(() => {
            isProcessingRef.current = false
          }, 3000)
        }
      }
    }

    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(processFrame)
    }
  }, [isActive, onDecode, onScan])

  const startCamera = useCallback(async (deviceId?: string) => {
    stopCamera()
    setError('')
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsActive(true)
          animationFrameRef.current = requestAnimationFrame(processFrame)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access camera.')
    }
  }, [processFrame, stopCamera])

  useEffect(() => {
    getCameras()
    return () => stopCamera()
  }, [getCameras, stopCamera])

  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AprilTag Scanner</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">Live check-in</h3>
      <p className="mt-2 text-sm text-muted">
        Show the student's AprilTag to the camera to mark attendance.
      </p>
      
      <div 
        className={`relative mt-4 h-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/90 ${
          !isActive ? 'cursor-pointer' : ''
        }`}
        onClick={() => !isActive && startCamera(selectedCameraId)}
      >
        <video 
          ref={videoRef} 
          playsInline 
          muted 
          className="absolute inset-0 h-full w-full object-cover"
        />
        <canvas ref={overlayCanvasRef} className="absolute inset-0 h-full w-full object-cover pointer-events-none" />
        <canvas ref={canvasRef} className="hidden" />
        
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 text-sm font-semibold text-white transition-colors hover:bg-slate-900/50">
            Click to start scanner
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
          {isActive ? 'Scanner active' : 'Scanner paused'}
        </span>
      </div>

      {cameras.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Camera source
          </label>
          <select
            value={selectedCameraId}
            onChange={(event) => {
              const newId = event.target.value
              setSelectedCameraId(newId)
              if (isActive) startCamera(newId)
            }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            {cameras.map((camera, index) => (
              <option key={camera.deviceId || index} value={camera.deviceId}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isActive && (
          <button
            type="button"
            onClick={stopCamera}
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-100"
          >
            Stop scanner
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  )
}
