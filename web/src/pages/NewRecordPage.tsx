import { useEffect, useState } from 'react'
import { createRecord, getOptions } from '../api'
import { today } from '../util'

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
    stake: '',
    direction: '',
    content: '',
    work_date: today(),
  })
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
    setSaving(true)
    setError('')
    try {
      const { id } = await createRecord(form)
      window.location.hash = `#/record/${id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setSaving(false)
    }
  }

  return (
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

        {error && <div className="notice error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? '保存中…' : '保存，并拍摄三照'}
        </button>
      </form>
    </div>
  )
}
