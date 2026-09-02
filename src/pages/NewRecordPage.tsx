import { useEffect, useRef, useState } from 'react'
import { createRecord, getOptions, getRecord, updateRecord } from '../api'
import AppHeader from '../components/AppHeader'
import ZoneForm from '../components/ZoneForm'
import type { ZoneParams } from '../types'
import { focusFirstIssue, ZONE_ERROR_ORDER } from '../focus'
import { useUnsavedGuard } from '../useUnsavedGuard'
import { isValidWorkDate, today } from '../util'
import { validateZone } from '../zone/validation'
import { defaults, parseZoneParams, parseStake, stake } from '../zone/utils'

type RecordForm = {
  project_name: string
  highway: string
  section: string
  work_location: string
  stake: string
  end_stake: string
  direction: string
  content: string
  work_date: string
}

function recordSnapshot(form: RecordForm, zone: ZoneParams | null) {
  const { end_stake: _end, ...rest } = form
  return JSON.stringify({ form: rest, zone })
}

const DIRECTIONS = [
  { value: 'up', label: '上行' },
  { value: 'down', label: '下行' },
]

export default function NewRecordPage({ project, id }: { project?: string; id?: string }) {
  const editing = Boolean(id)
  const [form, setForm] = useState<RecordForm>({
    project_name: project ?? '',
    highway: '',
    section: '',
    work_location: '',
    stake: '',
    end_stake: '',
    direction: 'up',
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
  const [showZoneErrors, setShowZoneErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(editing)
  const formRef = useRef<HTMLFormElement>(null)
  const [baseline, setBaseline] = useState<string | null>(null)
  const snapshot = recordSnapshot(form, zone)
  const dirty = baseline !== null && snapshot !== baseline
  const allowLeave = useUnsavedGuard(dirty)

  useEffect(() => {
    if (loading || baseline !== null) return
    setBaseline(snapshot)
  }, [baseline, loading, snapshot])

  // 编辑模式：加载记录并预填表单与布置参数
  useEffect(() => {
    if (!id) return
    let cancelled = false
    getRecord(id)
      .then((record) => {
        if (cancelled) return
        const parsedZone = record.zone_params ? parseZoneParams(record.zone_params) : null
        const direction =
          record.direction === 'down' || record.direction === 'up'
            ? record.direction
            : parsedZone?.direction ?? 'up'
        setForm({
          project_name: record.project_name,
          highway: record.highway,
          section: record.section,
          work_location: record.work_location || '',
          stake: record.stake,
          end_stake: record.end_stake || '',
          direction,
          content: record.content || '',
          work_date: record.work_date,
        })
        setZone(parsedZone ? { ...parsedZone, direction } : null)
        setLoading(false)
      })
      .catch((reason) => {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : '加载记录失败')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

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
      // 下行桩号递减，结束桩号 = 起点 − 作业区长度
      const es = stake(s + (zone?.direction === 'down' ? -w : w))
      setForm((f) => (f.end_stake === es ? f : { ...f, end_stake: es }))
    }
  }, [zone?.start, zone?.work, zone?.direction])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const missing: { name: string; label: string }[] = [
      !form.project_name.trim() ? { name: 'project_name', label: '项目名称' } : null,
      !form.highway.trim() ? { name: 'highway', label: '高速公路' } : null,
      !form.section.trim() ? { name: 'section', label: '路段' } : null,
      !form.stake.trim() ? { name: 'stake', label: '起始桩号' } : null,
      !form.work_date ? { name: 'work_date', label: '施工日期' } : null,
    ].filter((item): item is { name: string; label: string } => item != null)
    if (missing.length > 0) {
      setError(`请填写必填项：${missing.map((item) => item.label).join('、')}`)
      requestAnimationFrame(() => focusFirstIssue(formRef.current, missing.map((item) => item.name)))
      return
    }
    if (!isValidWorkDate(form.work_date)) {
      setError('施工日期必须是真实日期')
      requestAnimationFrame(() => focusFirstIssue(formRef.current, ['work_date']))
      return
    }
    setShowZoneErrors(true)
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
      const names = ZONE_ERROR_ORDER.filter((key) => zoneErrors[key]).map((key) => (key === 'start' ? 'stake' : key))
      requestAnimationFrame(() => focusFirstIssue(formRef.current, names))
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = {
        ...form,
        zone_params: zone ? JSON.stringify(zone) : null,
      }
      if (editing && id) {
        await updateRecord(id, data)
        allowLeave()
        window.location.hash = `#/record/${id}`
      } else {
        const { id: newId } = await createRecord(data)
        allowLeave()
        window.location.hash = `#/record/${newId}`
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="app-frame">
        <AppHeader trail={[{ label: '首页', href: '#/' }, { label: '编辑记录' }]} />
        <div className="page-loading">正在加载记录…</div>
      </div>
    )
  }

  return (
    <div className="app-frame">
      <AppHeader
        trail={
          editing && id
            ? [
                { label: '首页', href: '#/' },
                { label: '记录详情', href: `#/record/${id}` },
                { label: '编辑记录' },
              ]
            : project
              ? [
                  { label: '首页', href: '#/' },
                  { label: project, href: `#/project/${encodeURIComponent(project)}` },
                  { label: '新建记录' },
                ]
              : [{ label: '首页', href: '#/' }, { label: '新建记录' }]
        }
      />
      <div className="page">
      <header className="topbar">
        <a className="btn" href={editing && id ? `#/record/${id}` : project ? `#/project/${encodeURIComponent(project)}` : '#/'}>
          ← 返回
        </a>
        <h1>{editing ? '编辑施工记录' : '新建施工记录'}</h1>
        <span className="topbar-spacer" />
      </header>

      <form ref={formRef} className="form" onSubmit={submit} onChange={() => setError('')} noValidate>
        <h2 className="form-section-title">基本信息</h2>
        <div className="card form-card">
        <label>
          项目名称 <b className="req">*</b>
          <input
            required
            name="project_name"
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
            name="highway"
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
            name="section"
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
              name="stake"
              placeholder="例如：K12+345"
              value={form.stake}
              onChange={(e) => handleStake(e.target.value)}
            />
          </label>
          <label>
            作业区长度（m）
            <input
              name="work"
              type="number"
              min={10}
              max={4000}
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
            name="work_date"
            type="date"
            required
            value={form.work_date}
            onChange={(e) => setForm({ ...form, work_date: e.target.value })}
          />
        </label>

        </div>

        <h2 className="form-section-title">作业区布置</h2>
        <div className="card form-card">
          {zone ? (
            <ZoneForm value={zone} onChange={setZone} allowDisable={false} linked showErrors={showZoneErrors} />
          ) : (
            <p className="inspector-empty">该记录暂无作业区布置图，保存后可在详情页创建。</p>
          )}
        </div>

        {error && <div className="notice error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving || loading}>
          {saving ? '保存中…' : editing ? '保存修改' : '保存，并拍摄三照'}
        </button>
      </form>
      </div>
    </div>
  )
}
