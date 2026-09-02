import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, Images, MapPin, Plus, Search } from 'lucide-react'
import { getOptions, listRecords, type ListQuery } from '../api'
import AppHeader from '../components/AppHeader'
import ExcelImportButton from '../components/ExcelImportButton'
import { directionLabel, isPhotoComplete, photoTotal, type RecordSummary } from '../types'

export default function ListPage({ project }: { project?: string }) {
  const projectQuery = project ? { project } : {}
  const [form, setForm] = useState<ListQuery>(projectQuery)
  const [records, setRecords] = useState<RecordSummary[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastImport, setLastImport] = useState<{ filename: string; count: number } | null>(null)
  const [options, setOptions] = useState({ projects: [] as string[], highways: [] as string[], sections: [] as string[] })

  async function load(query: ListQuery = form) {
    setLoading(true)
    setError('')
    try {
      setRecords(await listRecords(query))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([
      load(projectQuery),
      getOptions().then((result) => setOptions(result)).catch(() => undefined),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  const visible = useMemo(() => records.filter((record) => {
    if (form.photo === 'complete') return isPhotoComplete(record.photo_counts)
    if (form.photo === 'incomplete') return !isPhotoComplete(record.photo_counts)
    return true
  }), [form.photo, records])

  const completeCount = useMemo(() => visible.filter((record) => isPhotoComplete(record.photo_counts)).length, [visible])
  const totalPhotos = useMemo(() => visible.reduce((total, record) => total + photoTotal(record.photo_counts), 0), [visible])

  function reset() {
    const empty: ListQuery = { project: project ?? '', highway: '', section: '', stake: '', direction: '', photo: '' }
    setForm(empty)
    void load(empty)
  }

  return (
    <div className="app-frame">
      <AppHeader
        trail={project
          ? [{ label: '首页', href: '#/' }, { label: project }]
          : [{ label: '首页', href: '#/' }, { label: '施工记录' }]}
        project={project}
      />
      <main className="registry-page">
        <section className="registry-heading">
          <div>
            <p className="eyebrow">{project ? '项目施工台账' : '施工位置台账'}</p>
            <h1>{project ?? '施工记录'}</h1>
            <p>{project ? '管理该项目的作业桩号、作业区布置图与三阶段照片证据。' : '统一管理作业桩号、作业区布置图与三阶段照片证据。'}</p>
          </div>
          <div className="heading-actions">
            <ExcelImportButton
              onImported={(summary) => {
                setLastImport(summary)
                void load(projectQuery)
              }}
            />
            <a className="btn btn-primary" href={project ? `#/new/${encodeURIComponent(project)}` : '#/new'}>
              <Plus />
              新建记录
            </a>
          </div>
        </section>

        {lastImport ? (
          <div className="import-success" role="status">
            <CircleCheck />
            已从「{lastImport.filename}」导入 {lastImport.count} 条施工位置。
          </div>
        ) : null}
        {error ? <div className="notice error">{error}</div> : null}

        <form
          className="registry-filter"
          onSubmit={(event) => {
            event.preventDefault()
            void load(form)
          }}
        >
          <label className="filter-search">
            <Search aria-hidden="true" />
            <input
              placeholder="搜索桩号"
              value={form.stake ?? ''}
              onChange={(event) => setForm({ ...form, stake: event.target.value })}
            />
          </label>
          {!project ? (
            <select value={form.project ?? ''} onChange={(event) => setForm({ ...form, project: event.target.value })}>
              <option value="">全部项目</option>
              {options.projects.map((item) => <option key={item}>{item}</option>)}
            </select>
          ) : null}
          <select value={form.highway ?? ''} onChange={(event) => setForm({ ...form, highway: event.target.value })}>
            <option value="">全部道路</option>
            {options.highways.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={form.section ?? ''} onChange={(event) => setForm({ ...form, section: event.target.value })}>
            <option value="">全部路段</option>
            {options.sections.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={form.direction ?? ''} onChange={(event) => setForm({ ...form, direction: event.target.value })}>
            <option value="">全部方向</option>
            <option value="up">上行</option>
            <option value="down">下行</option>
          </select>
          <select value={form.photo ?? ''} onChange={(event) => setForm({ ...form, photo: event.target.value })}>
            <option value="">全部状态</option>
            <option value="complete">资料完整</option>
            <option value="incomplete">资料待补充</option>
          </select>
          <button className="btn btn-secondary" type="submit">查询</button>
          <button className="text-button" type="button" onClick={reset}>重置</button>
        </form>

        <section className="registry-table" aria-busy={loading}>
          <div className="registry-summary">
            <span>共 <strong>{visible.length}</strong> 条记录</span>
            <span>照片 <strong>{totalPhotos}</strong> 张</span>
            <span>完整 <strong>{completeCount}</strong> 条</span>
          </div>
          <div className="registry-columns" aria-hidden="true">
            <span>作业桩号</span><span>项目 / 位置</span><span>施工内容</span><span>日期</span><span>证据</span><span>状态</span>
          </div>
          {loading ? <div className="table-empty">正在加载施工记录…</div> : null}
          {!loading && visible.length === 0 ? <div className="table-empty">暂无匹配记录，可直接导入 Excel 施工计划。</div> : null}
          {!loading ? visible.map((record) => {
            const complete = isPhotoComplete(record.photo_counts)
            return (
              <a
                className="registry-row"
                key={record.id}
                href={`#/record/${record.id}`}
              >
                <span className="stake-cell">
                  <MapPin aria-hidden="true" />
                  <span><strong>{record.stake}{record.end_stake ? ` — ${record.end_stake}` : ''}</strong><small>{directionLabel(record.direction)}</small></span>
                </span>
                <span><strong>{record.project_name}</strong><small>{record.highway} · {record.section}{record.work_location ? ` · ${record.work_location}` : ''}</small></span>
                <span>{record.content || '—'}</span>
                <span className="numeric">{record.work_date}</span>
                <span className="photo-cell"><Images aria-hidden="true" /> {photoTotal(record.photo_counts)} 张</span>
                <span className={`status-chip ${complete ? 'complete' : 'incomplete'}`}>
                  {complete ? <CircleCheck /> : <CircleAlert />}
                  {complete ? '已完整' : '待补充'}
                </span>
              </a>
            )
          }) : null}
        </section>
      </main>
    </div>
  )
}
