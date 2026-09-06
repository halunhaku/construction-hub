import { toPng } from 'html-to-image'

export function pngFilename(label: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const safe = label.replace(/[^\w+\u4e00-\u9fff-]+/g, '_')
  return `roadzone-${safe}-${stamp}.png`
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const { promise, resolve, reject } = Promise.withResolvers<Blob>()
  canvas.toBlob((blob) => {
    if (blob && blob.size > 0) {
      resolve(blob)
      return
    }
    try {
      const data = canvas.toDataURL('image/png')
      const bytes = atob(data.split(',')[1] ?? '')
      const buf = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
      resolve(new Blob([buf], { type: 'image/png' }))
    } catch (err) {
      reject(err instanceof Error ? err : new Error('截图失败'))
    }
  }, 'image/png')
  return promise
}

function loadImg(src: string): Promise<HTMLImageElement> {
  const { promise, resolve, reject } = Promise.withResolvers<HTMLImageElement>()
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('image load failed'))
  img.src = src
  return promise
}

/** 3D 画面垫底，再把参数面板、顶栏、图例逐块叠上去。 */
export async function overlayUiOnScene(sceneBlob: Blob, app: HTMLElement, _sceneCanvas: HTMLCanvasElement): Promise<Blob> {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = app.clientWidth
  const h = app.clientHeight
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(w * dpr))
  out.height = Math.max(1, Math.round(h * dpr))
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('截图失败')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#f0ede5'
  ctx.fillRect(0, 0, w, h)

  const sceneUrl = URL.createObjectURL(sceneBlob)
  app.classList.add('capture-flat')
  try {
    ctx.drawImage(await loadImg(sceneUrl), 0, 0, w, h)
    const nodes = ['.panel-sidebar', '.viewbar', '.legend-box', '.sign-card', '.hint-bar']
      .map((sel) => app.querySelector(sel))
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
    for (const el of nodes) {
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const prev = {
        background: el.style.background,
        backdrop: el.style.backdropFilter,
        transform: el.style.transform,
      }
      el.style.background = 'rgba(250, 248, 242, 0.96)'
      el.style.backdropFilter = 'none'
      el.style.setProperty('-webkit-backdrop-filter', 'none')
      try {
        const piece = await toPng(el, {
          pixelRatio: dpr,
          skipFonts: true,
          fontEmbedCSS: '/* local */',
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
          style: {
            transform: 'none',
            left: '0px',
            top: '0px',
            right: 'auto',
            bottom: 'auto',
            position: 'relative',
            margin: '0',
            background: 'rgba(250, 248, 242, 0.96)',
            backdropFilter: 'none',
          },
          onImageErrorHandler: () => undefined,
        })
        ctx.drawImage(await loadImg(piece), rect.left, rect.top, rect.width, rect.height)
      } catch {
        /* 单块 UI 失败时仍保留 3D 画面 */
      } finally {
        el.style.background = prev.background
        el.style.backdropFilter = prev.backdrop
        el.style.transform = prev.transform
        el.style.removeProperty('-webkit-backdrop-filter')
      }
    }
  } finally {
    app.classList.remove('capture-flat')
    URL.revokeObjectURL(sceneUrl)
  }

  return canvasToPng(out)
}
