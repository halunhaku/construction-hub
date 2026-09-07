export function ViewBar({
  onExport,
  exporting,
  onRotate,
  onZoom,
  onReset,
}: {
  onExport: () => void
  exporting: boolean
  onRotate: (azimDelta: number) => void
  onZoom: (factor: number) => void
  onReset: () => void
}) {
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
      <button
        type="button"
        className="export-btn"
        disabled={exporting}
        title="截取当前 3D 画面"
        onClick={onExport}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h1.6l1-1.5h4L11.1 4h1.4A1.5 1.5 0 0 1 14 5.5v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-6z" />
          <circle cx="8" cy="8.5" r="2.4" />
        </svg>
        <span>截图</span>
      </button>
    </div>
  )
}
