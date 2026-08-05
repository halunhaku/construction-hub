import { useEffect, useState } from 'react'
import { createRecord, getOptions } from '../api'
import AppHeader from '../components/AppHeader'
import ZoneForm from '../components/ZoneForm'
import type { ZoneParams } from '../types'
import { today } from '../util'
import { validateZone } from '../zone/validation'

const DIRECTIONS = [
  { value: '', label: '不指定' },
  { value: 'up', label: '上行' },
  { value: 'down', label: '下行' },
]

export default function NewRecordPage() {
  const [form, setForm] = useState({
    project_name: '',
    highway: '',
    section: '',
    work_location: '',
    stake: '',
    end_stake: '',
    direction: '',
    content: '',
    work_date: today(),
  })
  const [zone, setZone] = useState<ZoneParams | null>(null)
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // 布置图已勾选但参数无效时阻止保存，并在预览区提示
    const zoneErrors = validateZone(zone)
    if (Object.keys(zoneErrors).length > 0) {
      setError('作业区布置参数有误，请修正（红色提示处）')
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

      <form className="card form" onSubmit={submit}>
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
            桩号 <b className="req">*</b>
            <input
              required
              placeholder="例如：K12+345"
              value={form.stake}
              onChange={(e) => setForm({ ...form, stake: e.target.value })}
            />
          </label>
          <label>
            结束桩号
            <input
              placeholder="例如：K12+445（可选）"
              value={form.end_stake}
              onChange={(e) => setForm({ ...form, end_stake: e.target.value })}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            施工位置
            <input
              placeholder="例如：右侧路肩"
              value={form.work_location}
              onChange={(e) => setForm({ ...form, work_location: e.target.value })}
            />
          </label>
          <label>
            方向
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
            >
              {DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>

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

        <div className="zone-in-new">
          <ZoneForm value={zone} onChange={setZone} />
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
