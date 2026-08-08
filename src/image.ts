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

export interface WatermarkInfo {
  /** 主信息行：桩号 方向 · 施工内容 */
  main: string
  /** 项目名称 */
  project: string
  /** 次要信息行：道路 · 路段 · 施工日期 */
  road: string
  /** 阶段标签：施工前 / 施工过程中 / 施工后 */
  phase: string
  /** 阶段徽章颜色 */
  phaseColor: string
  /** 拍摄时间（含前缀，如「拍摄 2026-08-08 09:39」） */
  takenAt: string
}

/** 超长文字截断为省略号 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

/**
 * 给照片加底部通栏水印（渐变暗角 + 左侧主/次信息 + 右侧阶段徽章与拍摄时间），返回 JPEG Blob。
 */
export async function watermarkImage(url: string, info: WatermarkInfo): Promise<Blob> {
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

  const W = canvas.width
  const H = canvas.height
  const font = (weight: number, size: number) => `${weight} ${size}px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`
  const fsMain = Math.min(40, Math.max(20, Math.round(W / 55))) // 主行字号
  const fsSub = Math.min(20, Math.max(11, Math.round(fsMain * 0.52))) // 次行字号
  const pad = fsMain * 0.8

  // 先量右侧徽章，确定左列可用宽度
  ctx.font = font(700, fsSub * 1.05)
  const pillW = ctx.measureText(info.phase).width + fsSub * 1.5
  const pillH = fsSub * 1.9
  const rightColW = pillW + fsMain * 1.2
  const leftMaxW = W - pad * 2 - rightColW

  // 左列：主行 + 项目名 + 路段/日期
  const mainH = fsMain * 1.35
  const subH = fsSub * 1.55
  const leftH = mainH + subH * 2
  // 右列：阶段徽章 + 拍摄时间
  const rightH = pillH + fsSub * 1.7

  const padTop = fsMain * 1.1
  const padBottom = fsMain * 0.7
  const barH = padTop + padBottom + Math.max(leftH, rightH)
  const barTop = H - barH

  // 底部渐变暗角
  const gradient = ctx.createLinearGradient(0, barTop, 0, H)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.28)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.78)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, barTop, W, barH)

  // 左侧信息
  const textX = pad
  let y = barTop + padTop
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = font(700, fsMain)
  ctx.fillText(fitText(ctx, info.main, leftMaxW), textX, y + fsMain)
  y += mainH

  ctx.font = font(500, fsSub)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(fitText(ctx, info.project, leftMaxW), textX, y + fsSub)
  y += subH
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.fillText(fitText(ctx, info.road, leftMaxW), textX, y + fsSub)

  // 右侧：阶段徽章 + 拍摄时间
  const rightX = W - pad
  const pillY = barTop + padTop
  ctx.fillStyle = info.phaseColor
  ctx.beginPath()
  ctx.roundRect(rightX - pillW, pillY, pillW, pillH, pillH / 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = font(700, fsSub * 1.05)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(info.phase, rightX - pillW / 2, pillY + pillH / 2 + 0.5)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = font(500, fsSub)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(info.takenAt, rightX, pillY + pillH + fsSub * 1.45)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('水印生成失败'))), 'image/jpeg', 0.92)
  })
}
