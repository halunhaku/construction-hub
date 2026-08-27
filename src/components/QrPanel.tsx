import { useEffect, useState } from 'react'
import { Check, Copy, Download, QrCode } from 'lucide-react'
import { appPageUrl, downloadBlob, qrDataUrl, qrPosterBlob } from '../qr'

export default function QrPanel({
  hash,
  title,
  subtitle,
  caption,
  filename,
  size = 'large',
}: {
  hash: string
  title: string
  subtitle: string
  caption?: string
  filename: string
  size?: 'large' | 'compact'
}) {
  const url = appPageUrl(hash)
  const [src, setSrc] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    qrDataUrl(url, size === 'large' ? 512 : 360)
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setError('二维码生成失败')
      })
    return () => {
      cancelled = true
    }
  }, [size, url])

  async function download() {
    setBusy(true)
    setError('')
    try {
      const blob = await qrPosterBlob({ url, title, subtitle, caption })
      downloadBlob(blob, filename)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '下载失败')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const area = document.createElement('textarea')
      area.value = url
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      document.body.removeChild(area)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className={`qr-panel qr-panel-${size}`}>
      <div className="qr-panel-code">
        {src ? (
          <img src={src} alt={title} width={size === 'large' ? 168 : 120} height={size === 'large' ? 168 : 120} />
        ) : (
          <span className="qr-panel-placeholder" aria-hidden="true">
            <QrCode />
          </span>
        )}
      </div>
      <div className="qr-panel-copy">
        <strong>{title}</strong>
        <p>{subtitle}</p>
        {caption ? <p className="qr-panel-caption">{caption}</p> : null}
        {error ? <p className="field-error">{error}</p> : null}
        <div className="qr-panel-actions">
          <button type="button" className="btn btn-secondary" onClick={() => void download()} disabled={busy || !src}>
            <Download />
            {busy ? '生成中…' : '下载二维码'}
          </button>
          <button type="button" className="btn" onClick={() => void copyLink()}>
            {copied ? <Check /> : <Copy />}
            {copied ? '已复制链接' : '复制链接'}
          </button>
        </div>
      </div>
    </section>
  )
}
