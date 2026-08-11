import { useEffect, useState } from 'react'
import { getOptions, createZone, getZone, updateZone } from '../api'
import AppHeader from '../components/AppHeader'
import ZoneForm from '../components/ZoneForm'
import type { ZoneParams } from '../types'
import { defaults, parseZoneParams, parseStake, stake } from '../zone/utils'
import { validateZone } from '../zone/validation'

export default function ZoneEditPage({ id }: { id?: string }) {
  const editing = Boolean(id)
  const [projectName, setProjectName] = useState('')
  const [highway, setHighway] = useState('')
  const [section, setSection] = useState('')
  const [zone, setZone] = useState<ZoneParams>({ ...defaults, start: '' })
  const [options, setOptions] = useState<{
    projects: string[]
    highways: string[]
    sections: string[]
    contents: string[]
  }>({ projects: [], highways: [], sections: [], contents: [] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(editing)

  useEffect(() => {
    getOptions()
      .then(setOptions)
      .catch(() => undefined) // 选项加载失败不阻塞录入
  }, [])

  // 编辑模式：加载布控区域并预填
  useEffect(() => {
    if (!id) return
    let cancelled = false
    getZone(id)
      .then((item) => {
        if (cancelled) return
        setProjectName(item.project_name)
        setHighway(item.highway || '')
        setSection(item.section || '')
        setZone(parseZoneParams(item.zone_params) ?? { ...defaults, start: '' })
        setLoading(false)
      })
      .catch((reason) => {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : '布控区域加载失败')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // 结束桩号 = 起始桩号 + 作业区长度（自动计算，只读展示，无需手输）
  const endStake = (() => {
    const s = parseStake(zone.start)
    return s != null && zone.work >= 10 ? stake(s + zone.work) : ''
  })()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const zoneErrors = validateZone(zone)
    if (!projectName.trim()) {
      setError('请填写项目名称')
      return
    }
    if (Object.keys(zoneErrors).length > 0) {
      const messages = [
        zoneErrors.start ? `起始桩号：${zoneErrors.start}` : '',
        zoneErrors.work ? `作业区长度：${zoneErrors.work}` : '',
      ].filter(Boolean)
      setError(messages.length ? `布置参数有误，请修正（红色提示处）：${messages.join('；')}` : '布置参数有误，请修正（红色提示处）')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = {
        project_name: projectName.trim(),
        highway: highway.trim(),
        section: section.trim(),
        zone,
      }
      const result = editing && id
        ? await updateZone(id, data).then(() => ({ id }))
        : await createZone(data)
      window.location.hash = `#/zones/${result.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setSaving(false)
    }
  }

  return (
    <div className="app-frame">
      <AppHeader trail={['首页', '布控区域', editing ? '编辑布控' : '新建布控']} />
      <div className="page">
        <header className="topbar">
          <button className="btn" onClick={() => (window.location.hash = editing && id ? `#/zones/${id}` : '#/zones')}>
            ← 返回
          </button>
          <h1>{editing ? '编辑布控区域' : '新建布控区域'}</h1>
          <span className="topbar-spacer" />
        </header>

        {error && !loading ? <div className="notice error">{error}</div> : null}
        {loading ? <div className="table-empty">正在加载布控区域…</div> : null}

        {!loading && (
          <form className="form" onSubmit={submit}>
            <h2 className="form-section-title">基本信息</h2>
            <div className="card form-card">
              <label>
                项目名称 <b className="req">*</b>
                <input
                  required
                  list="ze-project-options"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="选择或输入项目名称"
                />
              </label>
              <datalist id="ze-project-options">
                {options.projects.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <label>
                高速公路
                <input
                  list="ze-highway-options"
                  value={highway}
                  onChange={(event) => setHighway(event.target.value)}
                  placeholder="例如：S50 太临高速太佳段"
                />
              </label>
              <datalist id="ze-highway-options">
                {options.highways.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <label>
                路段
                <input
                  list="ze-section-options"
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  placeholder="例如：K96+350 段"
                />
              </label>
              <datalist id="ze-section-options">
                {options.sections.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <h2 className="form-section-title">作业区布置</h2>
            <div className="card form-card">
              <div className="form-row">
                <label className="readonly-stake">
                  结束桩号
                  <input readOnly value={endStake || '填写起始桩号与长度后自动计算'} />
                </label>
              </div>
              <ZoneForm value={zone} onChange={(z) => z && setZone(z)} allowDisable={false} linked={false} />
            </div>

            {error ? <div className="notice error">{error}</div> : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
              {saving ? '保存中…' : editing ? '保存修改' : '保存布控区域'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
