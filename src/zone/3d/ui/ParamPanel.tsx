import { useState, type ReactNode } from 'react'
import { defaults, stake, validate } from '../../utils'
import type { Params } from '../../types'
import type { RoadLayout } from '../layout/buildLayout'

export interface ParamPanelProps {
  params: Params
  onChange: (next: Params) => void
  layout: RoadLayout
  folded?: boolean
  onToggleFold?: () => void
  onSave?: () => void
  saving?: boolean
  saveLabel?: string
  saveError?: string
  showErrors?: boolean
  backHref?: string
  headerExtra?: ReactNode
}

export function ParamPanel({
  params,
  onChange,
  layout,
  folded: externalFolded,
  onToggleFold,
  onSave,
  saving = false,
  saveLabel,
  saveError,
  showErrors = false,
  backHref,
  headerExtra,
}: ParamPanelProps) {
  const [internalFolded, setInternalFolded] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  const isFolded = externalFolded !== undefined ? externalFolded : internalFolded
  const toggleFold = onToggleFold || (() => setInternalFolded((f) => !f))
  const errors = showErrors ? validate(params) : {}
  const startM = params.start
  const endStake =
    layout.zones[3] && Number.isFinite(layout.zones[3].end) ? stake(layout.zones[3].end) : '—'

  function set<K extends keyof Params>(key: K, value: Params[K]) {
    onChange({ ...params, [key]: value })
  }

  return (
    <aside
      className={isFolded ? 'panel-sidebar panel panel-folded' : 'panel-sidebar panel'}
      onWheel={(e) => e.stopPropagation()}
    >
      {isFolded ? (
        <button
          type="button"
          className="fold-tab"
          aria-expanded={false}
          aria-label="展开参数面板"
          title="展开参数面板"
          onClick={toggleFold}
        >
          <div className="fold-tab-icon">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="2.5" width="12" height="11" rx="2" />
              <path d="M6 2.5v11" />
            </svg>
          </div>
          <span className="fold-tab-title">作业参数</span>
          <svg className="fold-tab-arrow" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 3.5l4.5 4.5L6 12.5" />
          </svg>
        </button>
      ) : (
        <>
          <div className="panel-header">
            <div className="eyebrow-badge">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="8" cy="8" r="4.5" />
                <path d="M8 5.5v2.5l1.5 1.5" />
              </svg>
              <span>JTG H30 · 3D 规程</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {backHref && (
                <a href={backHref} className="fold-btn" title="返回" style={{ textDecoration: 'none' }}>
                  <span>← 返回</span>
                </a>
              )}
              <button
                type="button"
                className="fold-btn"
                aria-expanded={true}
                title="收起参数侧栏"
                aria-label="收起参数侧栏"
                onClick={toggleFold}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="2" y="2.5" width="12" height="11" rx="2" />
                  <path d="M6 2.5v11" />
                </svg>
                <span>收起</span>
              </button>
            </div>
          </div>
          <header className="panel-brand">
            <h1>作业区布置</h1>
            <p className="sub">高精三维数字孪生 · 锥桶 / 标牌 / 占道</p>
          </header>

          {headerExtra}

          <div className="panel-body">
            <label className="field">
              <span>作业区起点（桩号）</span>
              <input
                value={params.start}
                placeholder="K123+800"
                aria-invalid={Boolean(errors.start)}
                onChange={(e) => set('start', e.target.value)}
              />
              {errors.start ? <em>{errors.start}</em> : null}
            </label>

            <div className="row">
              <label className="field">
                <span>作业区长度（m）</span>
                <input
                  type="number"
                  min={10}
                  max={4000}
                  value={Number.isFinite(params.work) ? params.work : ''}
                  aria-invalid={Boolean(errors.work)}
                  onChange={(e) => set('work', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                />
                {errors.work ? <em>{errors.work}</em> : null}
              </label>
              <label className="field">
                <span>结束桩号</span>
                <input readOnly value={endStake} />
              </label>
            </div>

            <fieldset className="seg-field">
              <legend>作业区行车方向</legend>
              <div className="seg" role="radiogroup" aria-label="作业区行车方向">
                <SegBtn active={params.direction === 'up'} onClick={() => set('direction', 'up')}>
                  ↑ 上行 (桩号递增)
                </SegBtn>
                <SegBtn active={params.direction === 'down'} onClick={() => set('direction', 'down')}>
                  ↓ 下行 (桩号递减)
                </SegBtn>
              </div>
            </fieldset>

            <fieldset className="seg-field">
              <legend>施工位置</legend>
              <div className="seg" role="radiogroup" aria-label="施工位置">
                <SegBtn
                  active={params.workSide === 'roadside'}
                  onClick={() => onChange({ ...params, workSide: 'roadside', doubleSide: false })}
                >
                  路侧
                </SegBtn>
                <SegBtn active={params.workSide === 'median'} onClick={() => set('workSide', 'median')}>
                  中央分隔带
                </SegBtn>
              </div>
              {errors.workSide ? <em className="err">{errors.workSide}</em> : null}
            </fieldset>

            {params.workSide === 'median' ? (
              <fieldset className="seg-field">
                <legend>占路方式</legend>
                <div className="seg" role="radiogroup" aria-label="占路方式">
                  <SegBtn active={!params.doubleSide} onClick={() => set('doubleSide', false)}>
                    单侧占路
                  </SegBtn>
                  <SegBtn active={params.doubleSide} onClick={() => set('doubleSide', true)}>
                    双侧占路
                  </SegBtn>
                </div>
              </fieldset>
            ) : null}

            <div className="row">
              <label className="field">
                <span>过渡区（m）</span>
                <input
                  type="number"
                  min={120}
                  max={200}
                  value={Number.isFinite(params.taper) ? params.taper : ''}
                  aria-invalid={Boolean(errors.taper)}
                  onChange={(e) => set('taper', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                />
                {errors.taper ? <em>{errors.taper}</em> : null}
              </label>
              <label className="field">
                <span>缓冲区（m）</span>
                <input
                  type="number"
                  min={100}
                  max={150}
                  value={Number.isFinite(params.buffer) ? params.buffer : ''}
                  aria-invalid={Boolean(errors.buffer)}
                  onChange={(e) => set('buffer', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                />
                {errors.buffer ? <em>{errors.buffer}</em> : null}
              </label>
            </div>

            <details className="advanced">
              <summary>高级参数 (警告区/终止区/限速)</summary>
              <div className="row" style={{ marginTop: 8 }}>
                <label className="field">
                  <span>警告区（m）</span>
                  <input
                    type="number"
                    min={800}
                    max={1600}
                    step={100}
                    value={Number.isFinite(params.warning) ? params.warning : ''}
                    aria-invalid={Boolean(errors.warning)}
                    onChange={(e) => set('warning', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                  />
                  {errors.warning ? <em>{errors.warning}</em> : null}
                </label>
                <label className="field">
                  <span>下游过渡区（m）</span>
                  <input
                    type="number"
                    min={30}
                    value={Number.isFinite(params.downstream) ? params.downstream : ''}
                    aria-invalid={Boolean(errors.downstream)}
                    onChange={(e) => set('downstream', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                  />
                  {errors.downstream ? <em>{errors.downstream}</em> : null}
                </label>
              </div>
              <div className="row">
                <label className="field">
                  <span>终止区（m）</span>
                  <input
                    type="number"
                    min={30}
                    value={Number.isFinite(params.terminal) ? params.terminal : ''}
                    aria-invalid={Boolean(errors.terminal)}
                    onChange={(e) => set('terminal', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                  />
                  {errors.terminal ? <em>{errors.terminal}</em> : null}
                </label>
                <label className="field">
                  <span>锥桶间距（m）</span>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={Number.isFinite(params.coneGap) ? params.coneGap : ''}
                    aria-invalid={Boolean(errors.coneGap)}
                    onChange={(e) => set('coneGap', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                  />
                  {errors.coneGap ? <em>{errors.coneGap}</em> : null}
                </label>
              </div>
              <div className="row">
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>设计速度</span>
                  <select value={params.speed} onChange={(e) => set('speed', Number(e.target.value))}>
                    <option value={100}>100 km/h (逐级限速 80 → 60)</option>
                    <option value={80}>80 km/h (逐级限速 60 → 40)</option>
                  </select>
                </label>
              </div>
            </details>

            <dl className="stats">
              <div>
                <dt>单侧布置</dt>
                <dd>{layout.totalMeters.toLocaleString()} m</dd>
              </div>
              <div>
                <dt>作业区</dt>
                <dd>
                  {startM} → {endStake}
                </dd>
              </div>
              <div>
                <dt>影响路段</dt>
                <dd>
                  {stake(layout.extent.min)} — {stake(layout.extent.max)}
                </dd>
              </div>
            </dl>

            {saveError && <div className="notice error" style={{ margin: '8px 0' }}>{saveError}</div>}

            <div className="panel-actions">
              {onSave && (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={saving}
                  onClick={onSave}
                  style={{ marginBottom: 8 }}
                >
                  {saving ? '保存中…' : (saveLabel || '保存布控区域')}
                </button>
              )}
              <button type="button" className="btn-reset" onClick={() => onChange(defaults)}>
                ↺ 恢复规程默认配置
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button type="button" role="radio" aria-checked={active} className={active ? 'on' : ''} onClick={onClick}>
      {children}
    </button>
  )
}
