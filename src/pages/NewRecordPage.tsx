import { useEffect, useState } from 'react'
import { createRecord, getOptions } from '../api'
import AppHeader from '../components/AppHeader'
import ZoneForm from '../components/ZoneForm'
import type { ZoneParams } from '../types'
import { today } from '../util'
import { validateZone } from '../zone/validation'
import { defaults, parseStake, stake } from '../zone/utils'

const DIRECTIONS = [
  { value: '', label: '不指定' },
  { value: 'up', label: '上行' },
  { value: 'down', label: '下行' },
]

export default function NewRecordPage({ project }: { project?: string }) {
  const [form, setForm] = useState({
    project_name: project ?? '',
    highway: '',
    section: '',
    work_location: '',
    stake: '',
    end_stake: '',
    direction: '',
    content: '',
    work_date: today(),
  })
  // 布置图必选：初始为启用状态（defaults），起点桩号与长度由表单桩号联动
  const [zone, setZone] = useState<ZoneParams | null>({ ...defaults, start: '' })
  const [options, setOptions] = useState<{
    projects: string[]
    highways: string[]
    sections: string[]
    contents: string[]
  }>({ projects: [], highways: [], sections: [], contents: [] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOptions()
      .then(setOptions)
      .catch(() => {
        /* 选项加载失败不阻塞录入 */
      })
  }, [])

  // 起始桩号 → 布置图起点；作业区长度直接输入，结束桩号自动派生
  function handleStake(v: string) {
    setForm((f) => ({ ...f, stake: v }))
    setZone((z) => (z ? { ...z, start: v || z.start } : z))
  }

  function handleWork(v: number) {
    setZone((z) => (z ? { ...z, work: v } : z))
  }

  // 主表单方向（上行/下行）→ 布置图作业区方向联动
  function handleDirection(v: string) {
    setForm((f) => ({ ...f, direction: v }))
    setZone((z) => {
      if (!z) return z
      if (v === 'up' || v === 'down') return { ...z, direction: v }
      return z
    })
  }

  // 结束桩号 = 起始桩号 + 作业区长度（自动计算，无需手输）
  useEffect(() => {
    const s = parseStake(zone?.start ?? '')
    const w = zone?.work ?? 0
    if (s != null && w >= 10) {
      const es = stake(s + w)
      setForm((f) => (f.end_stake === es ? f : { ...f, end_stake: es }))
    }
  }, [zone?.start, zone?.work])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // 布置图必选：参数无效时阻止保存，并在预览区提示
    const zoneErrors = validateZone(zone)
    if (Object.keys(zoneErrors).length > 0) {
      // linked 模式下起点/长度错误不显示红点，直接在提示中说明
      const linkedMsg = [
        zoneErrors.start ? `起始桩号：${zoneErrors.start}` : '',
        zoneErrors.work ? `作业区长度：${zoneErrors.work}` : '',
      ]
        .filter(Boolean)
        .join('；')
      setError(linkedMsg || '作业区布置参数有误，请修正（红色提示处）')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { id } = await createRecord({
        ...form,
        zone_params: zone ? JSON.stringify(zone) : null,
      })
      window.location.hash = `#/record/${id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setSaving(false)
    }
  }

  return (
    <div className="app-frame">
      <AppHeader trail={['项目', '记录管理', '新建记录']} />
      <div className="page">
      <header className="topbar">
        <button className="btn" onClick={() => (window.location.hash = '#/')}>
          ← 返回
        </button>
        <h1>新建施工记录</h1>
        <span className="topbar-spacer" />
      </header>

      <form className="form" onSubmit={submit}>
        <h2 className="form-section-title">基本信息</h2>
        <div className="card form-card">
        <label>
          项目名称 <b className="req">*</b>
          <input
            required
            list="np-project-options"
            placeholder="从列表选择，或输入新项目名"
            value={form.project_name}
            onChange={(e) => setForm({ ...form, project_name: e.target.value })}
          />
          <datalist id="np-project-options">
            {options.projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>

        <label>
          高速公路 <b className="req">*</b>
          <input
            required
            list="np-highway-options"
            placeholder="例如：S50太临高速"
            value={form.highway}
            onChange={(e) => setForm({ ...form, highway: e.target.value })}
          />
          <datalist id="np-highway-options">
            {options.highways.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </label>

        <label>
          路段 <b className="req">*</b>
          <input
            required
            list="np-section-options"
            placeholder="例如：太佳西段"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
          />
          <datalist id="np-section-options">
            {options.sections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>

        <div className="form-row">
          <label>
            起始桩号 <b className="req">*</b>
            <input
              required
              placeholder="例如：K12+345"
              value={form.stake}
              onChange={(e) => handleStake(e.target.value)}
            />
          </label>
          <label>
            作业区长度（m）
            <input
              type="number"
              min={10}
              value={zone?.work ?? 1000}
              onChange={(e) => handleWork(Number(e.target.value))}
            />
          </label>
        </div>

        <label>
          方向
          <select
            value={form.direction}
            onChange={(e) => handleDirection(e.target.value)}
          >
            {DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          施工内容
          <input
            list="np-content-options"
            placeholder="从列表选择，或输入新内容"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <datalist id="np-content-options">
            {options.contents.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label>
          施工日期 <b className="req">*</b>
          <input
            type="date"
            required
            value={form.work_date}
            onChange={(e) => setForm({ ...form, work_date: e.target.value })}
          />
        </label>

        </div>

        <h2 className="form-section-title">作业区布置</h2>
        <div className="card form-card">
          <ZoneForm value={zone} onChange={setZone} allowDisable={false} linked />
        </div>

        {error && <div className="notice error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? '保存中…' : '保存，并拍摄三照'}
        </button>
      </form>
      </div>
    </div>
  )
}
