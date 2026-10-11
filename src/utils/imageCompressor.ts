/**
 * Client-side high performance image compressor.
 * Constrains max dimension to 1024px and outputs optimized JPEG dataUrl.
 */
export const compressImage = (
  dataUrl: string,
  maxDimension = 1024,
  quality = 0.82
): Promise<string> => {
  return new Promise((resolve) => {
    // If not a dataUrl or image already very small, resolve directly
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl)
      return
    }

    const img = new Image()
    img.onload = () => {
      let width = img.width
      let height = img.height

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          maxDimension = height
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedDataUrl)
    }

    img.onerror = () => {
      resolve(dataUrl)
    }

    img.src = dataUrl
  })
}
