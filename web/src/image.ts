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

/**
 * 给照片加左下角水印（半透明黑底白字），返回 JPEG Blob。
 * lines：每行文字（项目/位置/日期/阶段等）
 */
export async function watermarkImage(url: string, lines: string[]): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('照片加载失败'))
    el.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas')

  ctx.drawImage(img, 0, 0)

  const fs = Math.max(24, Math.round(canvas.width / 45))
  const pad = fs * 0.7
  const lineH = fs * 1.4
  ctx.font = `600 ${fs}px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const boxW = maxW + pad * 2
  const boxH = lines.length * lineH + pad * 2
  const x = pad
  const y = canvas.height - boxH - pad

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.beginPath()
  ctx.roundRect(x, y, boxW, boxH, fs * 0.4)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + lineH * (i + 0.5)))

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('水印生成失败'))), 'image/jpeg', 0.92)
  })
}
