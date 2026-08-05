/**
 * 手机拍照后压缩为 JPEG，减少上传流量。
 * 最长边限制 maxSize，质量 quality。
 */
export async function compressImage(file: File, maxSize = 1600, quality = 0.8): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await createImageBitmap(file)
  } catch {
    source = await loadViaImg(file)
  }

  const scale = Math.min(1, maxSize / Math.max(source.width, source.height))
  const w = Math.max(1, Math.round(source.width * scale))
  const h = Math.max(1, Math.round(source.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas')
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('图片压缩失败'))),
      'image/jpeg',
      quality,
    )
  })
  return blob
}

function loadViaImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败'))
    }
    img.src = url
  })
}
