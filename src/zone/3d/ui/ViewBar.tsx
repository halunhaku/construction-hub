import { useEffect, useRef, useState } from 'react'

export type ExportKind = 'scene' | 'ui' | 'plan'

export function ViewBar({
  onExport,
  exporting,
  onRotate,
  onZoom,
  onReset,
  showPlan = true,
}: {
  onExport: (kind: ExportKind) => void
  exporting: boolean
  onRotate: (azimDelta: number) => void
  onZoom: (factor: number) => void
  onReset: () => void
  showPlan?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <div className="viewbar">
      <div className="cam-pad" role="group" aria-label="视角调节">
        <button type="button" onClick={() => onRotate(0.18)} title="向左旋转视角">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 7.5A5.5 5.5 0 1 1 4 11.5" />
            <path d="M2.5 3.5v4h4" />
          </svg>
          <span>左转</span>
        </button>
        <button type="button" onClick={() => onRotate(-0.18)} title="向右旋转视角">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13.5 7.5A5.5 5.5 0 1 0 12 11.5" />
            <path d="M13.5 3.5v4h-4" />
          </svg>
          <span>右转</span>
        </button>
        <button type="button" onClick={() => onZoom(0.86)} title="拉近视角">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14M7 4.8v4.4M4.8 7h4.4" />
          </svg>
          <span>拉近</span>
        </button>
        <button type="button" onClick={() => onZoom(1.16)} title="拉远视角">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14M4.8 7h4.4" />
          </svg>
          <span>拉远</span>
        </button>
        <button type="button" onClick={onReset} title="复位到默认视角">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 6.5L8 2.5l5.5 4V13a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V6.5z" />
            <path d="M6 14V8.5h4V14" />
          </svg>
          <span>复位</span>
        </button>
      </div>
      {showPlan ? (
        <button
          type="button"
          className="plan-btn"
          disabled={exporting}
          title="导出 A4 规范布置图（双侧占路自动含上/下行两张）"
          onClick={() => onExport('plan')}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 2.5v7.5M4.5 7L8 10.5 11.5 7" />
            <path d="M2.5 11.5v1.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1.5" />
          </svg>
          <span>导出布置图</span>
        </button>
      ) : null}
      <div className="export-wrap" ref={menuRef}>
        <button
          type="button"
          className="export-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={exporting}
          title="截取当前画面"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h1.6l1-1.5h4L11.1 4h1.4A1.5 1.5 0 0 1 14 5.5v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-6z" />
            <circle cx="8" cy="8.5" r="2.4" />
          </svg>
          <span>截图</span>
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, marginLeft: -2 }} aria-hidden>
            <path d="M4 6.5l4 4 4-4" />
          </svg>
        </button>
        {menuOpen ? (
          <div className="export-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onExport('scene')
              }}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }} aria-hidden>
                <rect x="2" y="2.5" width="12" height="11" rx="2" />
                <circle cx="5.5" cy="6" r="1" />
                <path d="M14 11l-3.5-3.5-5 5" />
              </svg>
              <span>仅 3D 画面</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onExport('ui')
              }}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }} aria-hidden>
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <path d="M2 6h12M6 6v8" />
              </svg>
              <span>含面板和图例</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
