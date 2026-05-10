declare module 'html5-qrcode' {
  export type Html5QrcodeCamera = {
    id: string
    label: string
  }

  export class Html5Qrcode {
    constructor(elementId: string, config?: { verbose?: boolean })
    static getCameras(): Promise<Html5QrcodeCamera[]>
    start(
      cameraConfig: { facingMode: 'environment' | 'user' } | string,
      configuration: {
        fps?: number
        qrbox?: number | { width: number; height: number }
        aspectRatio?: number
        disableFlip?: boolean
      },
      qrCodeSuccessCallback: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ): Promise<void>
    pause(shouldPauseVideo?: boolean): void
    resume(): void
    stop(): Promise<void>
    clear(): void
  }
}
