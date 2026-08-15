import { useMemo, useState } from 'react'
import { RoadDiagram } from '../zone/RoadDiagram'
import { buildZones, defaults } from '../zone/utils'
import type { ZoneParams } from '../types'

/**
 * 作业区布置参数表单 + 实时预览（新建记录页与布置编辑页共用）。
 * value 为 null 表示"未启用布置图"（折叠态）。
 */
export default function ZoneForm({
  value,
  onChange,
  allowDisable = true,
  linked = false,
}: {
  value: ZoneParams | null
  onChange: (zone: ZoneParams | null) => void
  allowDisable?: boolean
  /** linked：作业区起点/长度/方向已由外层表单输入联动，此处不再重复显示 */
  linked?: boolean
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const enabled = allowDisable ? value !== null : true
  const form = value ?? defaults

  const zones = useMemo(() => buildZones(form), [form])
  const total = useMemo(() => zones.reduce((s, z) => s + z.length, 0), [zones])

  function set<K extends keyof ZoneParams>(key: K, v: ZoneParams[K]) {
    onChange({ ...form, [key]: v })
  }

  function toggle(enable: boolean) {
    setErrors({})
    if (enable) onChange({ ...defaults })
    else onChange(null)
  }

  return (
    <div className="zone-form">
      {allowDisable && (
        <label className="zone-form-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggle(e.target.checked)}
          />
          <span>为本条记录生成作业区布置图</span>
        </label>
      )}

      {enabled && (
        <>
          {!linked && (
            <>
              <div className="form-row">
                <label>
                  作业区起点（桩号）
                  <input
                    placeholder="例如：K123+800"
                    value={form.start}
                    onChange={(e) => set('start', e.target.value)}
                  />
                </label>
                <label>
                  作业区长度（m）
                  <input
                    type="number"
                    min={10}
                    value={form.work}
                    onChange={(e) => set('work', Number(e.target.value))}
                  />
                </label>
              </div>
              {errors.start && <p className="field-error">{errors.start}</p>}
              {errors.work && <p className="field-error">{errors.work}</p>}
            </>
          )}

          <div className="form-row">
            {!linked && (
              <div className="field-block">
                <span className="field-label">作业区方向</span>
                <div className="seg" role="radiogroup" aria-label="作业区方向">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.direction === 'up'}
                    className={form.direction === 'up' ? 'active' : ''}
                    onClick={() => set('direction', 'up')}
                  >
                    上行
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.direction === 'down'}
                    className={form.direction === 'down' ? 'active' : ''}
                    onClick={() => set('direction', 'down')}
                  >
                    下行
                  </button>
                </div>
              </div>
            )}
            <div className="field-block">
              <span className="field-label">施工位置</span>
              <div className="seg" role="radiogroup" aria-label="施工位置">
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.workSide === 'roadside'}
                  className={form.workSide === 'roadside' ? 'active' : ''}
                  onClick={() => onChange({ ...form, workSide: 'roadside', doubleSide: false })}
                >
                  路侧
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.workSide === 'median'}
                  className={form.workSide === 'median' ? 'active' : ''}
                  onClick={() => set('workSide', 'median')}
                >
                  中央分隔带
                </button>
              </div>
            </div>
            {/* 双侧占路：仅中央分隔带施工可选（上/下行同时布控，180° 对称） */}
            {form.workSide === 'median' && (
              <div className="field-block">
                <span className="field-label">占路方式</span>
                <div className="seg" role="radiogroup" aria-label="占路方式">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!form.doubleSide}
                    className={!form.doubleSide ? 'active' : ''}
                    onClick={() => set('doubleSide', false)}
                  >
                    单侧占路
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.doubleSide}
                    className={form.doubleSide ? 'active' : ''}
                    onClick={() => set('doubleSide', true)}
                  >
                    双侧占路
                  </button>
                </div>
              </div>
            )}
            {errors.workSide && <p className="field-error">{errors.workSide}</p>}
          </div>

          <div className="form-row">
            <label>
              过渡区基准（m）
              <input
                type="number"
                min={120}
                max={200}
                value={form.taper}
                onChange={(e) => set('taper', Number(e.target.value))}
              />
            </label>
            <label>
              缓冲区基准（m）
              <input
                type="number"
                min={100}
                max={150}
                value={form.buffer}
                onChange={(e) => set('buffer', Number(e.target.value))}
              />
            </label>
          </div>
          {errors.taper && <p className="field-error">{errors.taper}</p>}
          {errors.buffer && <p className="field-error">{errors.buffer}</p>}

          <details className="advanced">
            <summary>高级参数（警告区 / 下游 / 终止区 / 锥桶间距 / 设计速度）</summary>
            <div className="advanced-body">
              <div className="form-row">
                <label>
                  警告区长度（m）
                  <input
                    type="number"
                    min={50}
                    value={form.warning}
                    onChange={(e) => set('warning', Number(e.target.value))}
                  />
                </label>
                <label>
                  下游过渡区（m）
                  <input
                    type="number"
                    min={10}
                    value={form.downstream}
                    onChange={(e) => set('downstream', Number(e.target.value))}
                  />
                </label>
              </div>
              {errors.warning && <p className="field-error">{errors.warning}</p>}
              {errors.downstream && <p className="field-error">{errors.downstream}</p>}
              <div className="form-row">
                <label>
                  终止区长度（m）
                  <input
                    type="number"
                    min={10}
                    value={form.terminal}
                    onChange={(e) => set('terminal', Number(e.target.value))}
                  />
                </label>
                <label>
                  锥桶间距（m）
                  <input
                    type="number"
                    min={1}
                    value={form.coneGap}
                    onChange={(e) => set('coneGap', Number(e.target.value))}
                  />
                </label>
              </div>
              {errors.terminal && <p className="field-error">{errors.terminal}</p>}
              {errors.coneGap && <p className="field-error">{errors.coneGap}</p>}
              <label>
                设计速度（km/h）
                <input
                  type="number"
                  min={20}
                  max={120}
                  value={form.speed}
                  onChange={(e) => set('speed', Number(e.target.value))}
                />
              </label>
              {errors.speed && <p className="field-error">{errors.speed}</p>}
            </div>
          </details>

          <div className="zone-preview-inline">
            <p className="zone-meta">
              {form.start} · {form.direction === 'up' ? '上行' : '下行'} ·{' '}
              {form.workSide === 'median' ? '中央分隔带' : '路侧'}
              {form.doubleSide ? ' · 双侧占路' : ''} · 总长{' '}
              {total.toLocaleString()}m
            </p>
            <RoadDiagram
              zones={zones}
              direction={form.direction}
              workSide={form.workSide}
              doubleSide={form.doubleSide}
              zoom={1}
              coneGap={form.coneGap}
            />
          </div>
        </>
      )}
    </div>
  )
}
