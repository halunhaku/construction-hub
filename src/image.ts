/**
 * 手机拍照后压缩为 JPEG，减少上传流量。
 * 最长边限制 maxSize，质量 quality。
 */
export async function compressImage(file: File, maxSize = 1600, quality = 0.8): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    try {
      source = await createImageBitmap(file)
    } catch {
      source = await loadViaImg(file)
    }
  }

  const scale = Math.min(1, maxSize / Math.max(source.width, source.height))
  const w = Math.max(1, Math.round(source.width * scale))
  const h = Math.max(1, Math.round(source.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas')
  // 先铺白底：透明 PNG 转 JPEG 时透明区域会渲染成黑色
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
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

function utcSql(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

function exifLocalToUtc(exif: string): string | undefined {
  const match = exif.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (!match) return undefined
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  )
  if (Number.isNaN(date.getTime())) return undefined
  return utcSql(date)
}

function readU16(view: DataView, offset: number, little: boolean): number {
  return little ? view.getUint16(offset, true) : view.getUint16(offset, false)
}

function readU32(view: DataView, offset: number, little: boolean): number {
  return little ? view.getUint32(offset, true) : view.getUint32(offset, false)
}

function readExifAscii(view: DataView, offset: number, count: number): string {
  const chars: string[] = []
  for (let i = 0; i < count; i++) {
    const code = view.getUint8(offset + i)
    if (code === 0) break
    chars.push(String.fromCharCode(code))
  }
  return chars.join('')
}

function readIfdDate(view: DataView, tiffStart: number, ifdOffset: number, little: boolean, tags: number[]): string | null {
  if (ifdOffset <= 0 || tiffStart + ifdOffset + 2 > view.byteLength) return null
  const count = readU16(view, tiffStart + ifdOffset, little)
  let exifOffset = 0
  const found: Record<number, string> = {}
  for (let i = 0; i < count; i++) {
    const entry = tiffStart + ifdOffset + 2 + i * 12
    if (entry + 12 > view.byteLength) break
    const tag = readU16(view, entry, little)
    const type = readU16(view, entry + 2, little)
    const size = readU32(view, entry + 4, little)
    const value = readU32(view, entry + 8, little)
    if (tag === 0x8769 && type === 4) exifOffset = value
    if (tags.includes(tag) && type === 2 && size >= 10) {
      const dataOffset = size <= 4 ? entry + 8 : tiffStart + value
      if (dataOffset + size <= view.byteLength) found[tag] = readExifAscii(view, dataOffset, size)
    }
  }
  for (const tag of tags) {
    if (found[tag]) return found[tag]!
  }
  if (exifOffset) return readIfdDate(view, tiffStart, exifOffset, little, tags)
  return null
}

function readJpegExifDate(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let offset = 2
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break
    const marker = bytes[offset + 1]!
    const size = (bytes[offset + 2]! << 8) | bytes[offset + 3]!
    if (marker === 0xe1 && size >= 8) {
      const start = offset + 4
      if (
        bytes[start] === 0x45 &&
        bytes[start + 1] === 0x78 &&
        bytes[start + 2] === 0x69 &&
        bytes[start + 3] === 0x66 &&
        bytes[start + 4] === 0x00 &&
        bytes[start + 5] === 0x00
      ) {
        const tiffStart = start + 6
        if (tiffStart + 8 > bytes.length) return null
        const view = new DataView(buffer)
        const endian = view.getUint16(tiffStart, false)
        const little = endian === 0x4949
        if (!little && endian !== 0x4d4d) return null
        const ifd0 = readU32(view, tiffStart + 4, little)
        return readIfdDate(view, tiffStart, ifd0, little, [0x9003, 0x9004, 0x0132])
      }
    }
    if (marker === 0xda) break
    offset += 2 + size
  }
  return null
}

/** 优先用 EXIF 拍摄时间，否则文件修改时间；存 UTC，供水印按本地时区显示。 */
export async function photoTakenAtUtc(file: File): Promise<string | undefined> {
  try {
    const buffer = await file.slice(0, 256 * 1024).arrayBuffer()
    const exif = readJpegExifDate(buffer)
    if (exif) {
      const utc = exifLocalToUtc(exif)
      if (utc) return utc
    }
  } catch {
    /* 读 EXIF 失败则退回文件时间 */
  }
  if (file.lastModified) {
    const date = new Date(file.lastModified)
    if (!Number.isNaN(date.getTime())) return utcSql(date)
  }
  return undefined
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
  /** 第一行主信息：桩号 ｜ 方向（SemiBold，最突出） */
  main: string
  /** 第二行：施工内容（次一级） */
  content: string
  /** 第三行：路线（弱化） */
  route: string
  /** 第四行：单位 · 施工日期（弱化） */
  unit: string
  /** 阶段短标签：施工前 / 施工中 / 施工后 */
  phase: string
  /** 阶段徽章颜色 */
  phaseColor: string
  /** 拍摄时间（本地时间，YYYY-MM-DD HH:MM:SS，24 小时制） */
  takenAt: string
  /** 照片唯一编号：路线-桩号-日期-序号（如 S50-96350-0808-003） */
  photoNo: string
}

/** 超长文字截断为省略号 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

/**
 * 工程照片底部通栏水印：
 * 左下为四行层级信息（桩号方向 / 施工内容 / 路线 / 单位·日期），
 * 右下为阶段胶囊 + 拍摄时间 + 照片编号，底部渐变轻暗角。
 * 字号基于图片短边等比缩放，横图/竖图/4K 均自适应。
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

  // 按原图自然尺寸绘制，不做缩放，避免高 DPI 文字模糊
  ctx.drawImage(img, 0, 0)

  const W = canvas.width
  const H = canvas.height
  const font = (weight: number, size: number) => `${weight} ${size}px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`
  // 字号基于短边，保证横竖图与不同分辨率下比例协调（主行约短边/42，偏大保证可读）
  const base = Math.min(W, H)
  const fsMain = Math.min(72, Math.max(24, Math.round(base / 42))) // 主行：SemiBold
  const fsContent = Math.max(15, Math.round(fsMain * 0.68)) // 内容行
  const fsSub = Math.max(12, Math.round(fsMain * 0.48)) // 弱化行
  const pad = Math.max(20, Math.round(fsMain * 0.8)) // 左右安全距离
  const padBottom = Math.max(18, Math.round(fsMain * 0.6)) // 底边距

  // 右列宽度（胶囊 / 时间 / 编号 取最宽）
  ctx.font = font(700, Math.round(fsSub * 0.95))
  const pillW = ctx.measureText(info.phase).width + fsSub * 1.3
  const pillH = Math.round(fsSub * 1.7)
  ctx.font = font(500, fsSub)
  const timeW = ctx.measureText(info.takenAt).width
  ctx.font = font(400, Math.round(fsSub * 0.88))
  const noW = ctx.measureText(info.photoNo).width
  const rightColW = Math.max(pillW, timeW, noW)
  const leftMaxW = W - pad * 2 - rightColW - fsMain * 0.5

  // 行高
  const mainH = fsMain * 1.4
  const contentH = fsContent * 1.5
  const subH = fsSub * 1.6
  const leftH = mainH + contentH + subH * 2
  const noH = fsSub * 0.88 * 1.5
  const gap = fsSub * 0.45
  const rightH = pillH + fsSub * 1.5 + noH + gap * 2

  const padTop = fsMain * 0.55 // 渐变区高度压低
  const barH = padTop + padBottom + Math.max(leftH, rightH)
  const barTop = H - barH

  // 底部轻渐变暗角：向上快速过渡，最大透明度 50%
  const gradient = ctx.createLinearGradient(0, barTop, 0, H)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(0.35, 'rgba(0,0,0,0.14)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, barTop, W, barH)

  // 文字轻微阴影，提升复杂背景可读性
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = Math.max(2, Math.round(fsMain * 0.12))
  ctx.shadowOffsetY = 1

  // 左列四行，自下而上定位，底部基线与右列编号对齐
  const leftX = pad
  const unitBaseline = H - padBottom
  const routeBaseline = unitBaseline - subH
  const contentBaseline = routeBaseline - subH
  const mainBaseline = contentBaseline - contentH
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  ctx.fillStyle = '#ffffff'
  ctx.font = font(600, fsMain)
  ctx.fillText(fitText(ctx, info.main, leftMaxW), leftX, mainBaseline)

  ctx.font = font(500, fsContent)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(fitText(ctx, info.content, leftMaxW), leftX, contentBaseline)

  ctx.font = font(400, fsSub)
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.fillText(fitText(ctx, info.route, leftMaxW), leftX, routeBaseline)

  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.fillText(fitText(ctx, info.unit, leftMaxW), leftX, unitBaseline)

  // 右列自下而上：照片编号 → 拍摄时间 → 阶段胶囊
  const rightX = W - pad
  ctx.font = font(400, Math.round(fsSub * 0.88))
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(info.photoNo, rightX, unitBaseline)

  ctx.font = font(500, fsSub)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(info.takenAt, rightX, unitBaseline - noH - gap)

  const pillY = unitBaseline - noH - gap - fsSub * 1.5 - gap - pillH
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = info.phaseColor
  ctx.beginPath()
  ctx.roundRect(rightX - pillW, pillY, pillW, pillH, pillH / 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = font(700, Math.round(fsSub * 0.95))
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(info.phase, rightX - pillW / 2, pillY + pillH / 2 + 0.5)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('水印生成失败'))), 'image/jpeg', 0.92)
  })
}
