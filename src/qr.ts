import QRCode from 'qrcode'

const QR_DARK = '#061b35'
const QR_LIGHT = '#ffffff'

/** 当前站点下某 hash 页的绝对地址（扫码、复制链接用）。 */
export function appPageUrl(hash: string): string {
  const path = hash.startsWith('#') ? hash : `#/${hash.replace(/^\/+/, '')}`
  return `${window.location.origin}${window.location.pathname}${path}`
}

export function qrDataUrl(text: string, size = 512): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: QR_DARK, light: QR_LIGHT },
  })
}

export interface QrPosterInput {
  url: string
  title: string
  subtitle: string
  caption?: string
}

/** 带标题的方卡 PNG，方便发群或打印。 */
export async function qrPosterBlob(input: QrPosterInput): Promise<Blob> {
  const qrUrl = await qrDataUrl(input.url, 720)
  const qr = await loadImage(qrUrl)

  const width = 900
  const height = input.caption ? 1180 : 1120
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas')

  ctx.fillStyle = QR_LIGHT
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = QR_DARK
  ctx.fillRect(0, 0, width, 108)
  ctx.fillStyle = QR_LIGHT
  ctx.font = '700 36px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('路安施工管理', width / 2, 54)

  ctx.fillStyle = QR_DARK
  ctx.font = '700 40px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(input.title, width / 2, 168)

  ctx.fillStyle = '#647084'
  ctx.font = '400 26px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(input.subtitle, width / 2, 214)

  const qrSize = 640
  const qrX = (width - qrSize) / 2
  ctx.drawImage(qr, qrX, 250, qrSize, qrSize)

  let y = 250 + qrSize + 48
  if (input.caption) {
    ctx.fillStyle = QR_DARK
    ctx.font = '650 28px "PingFang SC","Microsoft YaHei",sans-serif'
    ctx.fillText(input.caption, width / 2, y)
    y += 44
  }

  ctx.fillStyle = '#8b95a5'
  ctx.font = '400 20px ui-monospace,Menlo,monospace'
  wrapCentered(ctx, input.url, width / 2, y, width - 80, 28)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error('二维码图片生成失败'))), 'image/png')
  })
  return blob
}

export function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('二维码图片读取失败'))
    img.src = src
  })
}

function wrapCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = [...text]
  const lines: string[] = []
  let line = ''
  for (const char of chars) {
    const next = line + char
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = char
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight))
}
