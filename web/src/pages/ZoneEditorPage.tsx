import { useEffect, useMemo, useState } from 'react'
import { getRecord, saveZone } from '../api'
import { RoadDiagram } from '../zone/RoadDiagram'
import { buildZones, defaults, parseZoneParams, validate } from '../zone/utils'
import type { ZoneParams } from '../types'

type FormState = ZoneParams

export default function ZoneEditorPage({ id }: { id: string }) {
  const [form, setForm] = useState<FormState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [paste, setPaste] = useState('')
  const [pasteMsg, setPasteMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getRecord(id)
      .then((record) => {
        const zone = record.zone_params ? parseZoneParams(record.zone_params) : null
        setForm(zone ?? defaults)
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : '加载失败'))
  }, [id])

  const zones = useMemo(() => (form ? buildZones(form) : []), [form])

  if (loadError) return <div className="page notice error">{loadError}</div>
  if (!form) return <div className="page">加载中…</div>

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    // computed key 的 spread 会被 TS 推断为 Partial，这里断言回完整类型
    setForm({ ...form, [key]: value } as FormState)
  }

  function applyPaste() {
    const zone = parseZoneParams(paste)
    if (!zone) {
      setPasteMsg('参数格式无效：请粘贴 RoadZone Control 复制出的布置参数 JSON')
      return
    }
    setForm(zone)
    setPasteMsg('✅ 已应用粘贴的参数')
    setPaste('')
    setErrors({})
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      await saveZone(id, form)
      window.location.hash = `#/record/${id}`
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '保存失败')
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <button className="btn" onClick={() => (window.location.hash = `#/record/${id}`)}>
          ← 返回
        </button>
        <h1>作业区布置</h1>
        <span className="topbar-spacer" />
      </header>

      <form className="card form" onSubmit={submit}>
        <label>
          作业区起点（桩号）<b className="req">*</b>
          <input
            required
            placeholder="例如：K123+800"
            value={form.start}
            onChange={(e) => set('start', e.target.value)}
          />
        </label>
        {errors.start && <p className="field-error">{errors.start}</p>}

        <label>
          作业区长度（m）<b className="req">*</b>
          <input
            type="number"
            min={10}
            required
            value={form.work}
            onChange={(e) => set('work', Number(e.target.value))}
          />
        </label>
        {errors.work && <p className="field-error">{errors.work}</p>}

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

        <div className="field-block">
          <span className="field-label">施工位置</span>
          <div className="seg" role="radiogroup" aria-label="施工位置">
            <button
              type="button"
              role="radio"
              aria-checked={form.workSide === 'roadside'}
              className={form.workSide === 'roadside' ? 'active' : ''}
              onClick={() => set('workSide', 'roadside')}
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
            <label>
              警告区长度（m）
              <input
                type="number"
                min={50}
                value={form.warning}
                onChange={(e) => set('warning', Number(e.target.value))}
              />
            </label>
            {errors.warning && <p className="field-error">{errors.warning}</p>}
            <label>
              下游过渡区长度（m）
              <input
                type="number"
                min={10}
                value={form.downstream}
                onChange={(e) => set('downstream', Number(e.target.value))}
              />
            </label>
            {errors.downstream && <p className="field-error">{errors.downstream}</p>}
            <label>
              终止区长度（m）
              <input
                type="number"
                min={10}
                value={form.terminal}
                onChange={(e) => set('terminal', Number(e.target.value))}
              />
            </label>
            {errors.terminal && <p className="field-error">{errors.terminal}</p>}
            <label>
              锥桶间距（m）
              <input
                type="number"
                min={1}
                value={form.coneGap}
                onChange={(e) => set('coneGap', Number(e.target.value))}
              />
            </label>
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

        <div className="paste-zone">
          <span className="field-label">从 RoadZone Control 粘贴参数（可选）</span>
          <textarea
            rows={3}
            placeholder='例如 {"start":"K123+800","work":1000,...}'
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <button type="button" className="btn" onClick={applyPaste}>
            应用粘贴参数
          </button>
          {pasteMsg && <p className="paste-msg">{pasteMsg}</p>}
        </div>

        {loadError && <div className="notice error">{loadError}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? '保存中…' : '保存布置图'}
        </button>
      </form>

      <div className="card zone-preview">
        <h2>布置图预览</h2>
        <p className="zone-meta">
          {form.start} · {form.direction === 'up' ? '上行' : '下行'} ·{' '}
          {form.workSide === 'median' ? '中央分隔带' : '路侧'}
        </p>
        <RoadDiagram
          zones={zones}
          direction={form.direction}
          workSide={form.workSide}
          zoom={1}
          coneGap={form.coneGap}
        />
      </div>
    </div>
  )
}
