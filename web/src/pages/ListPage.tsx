import { useEffect, useState } from 'react'
import { getOptions, listRecords, photoUrl, type ListQuery } from '../api'
import { directionLabel, PHASES, type RecordItem } from '../types'
import { APP_VERSION } from '../version'

function isComplete(r: RecordItem): boolean {
  return PHASES.every((p) => r.photos[p.key].length > 0)
}

function missingPhases(r: RecordItem): string[] {
  return PHASES.filter((p) => r.photos[p.key].length === 0).map((p) => p.label)
}

export default function ListPage() {
  const [form, setForm] = useState<ListQuery>({})
  const [records, setRecords] = useState<RecordItem[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<string[]>([])
  const [highways, setHighways] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [contents, setContents] = useState<string[]>([])

  useEffect(() => {
    load({})
    getOptions()
      .then((o) => {
        setProjects(o.projects)
        setHighways(o.highways)
        setSections(o.sections)
        setContents(o.contents)
      })
      .catch(() => {
        /* ignore */
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(q: ListQuery) {
    setLoading(true)
    setError('')
    try {
      setRecords(await listRecords(q))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    load(form)
  }

  function reset() {
    const empty = {
      project: '',
      highway: '',
      section: '',
      stake: '',
      direction: '',
      content: '',
      from: '',
      to: '',
      photo: '',
    }
    setForm(empty)
    load({})
  }

  // 照片状态筛选在前端过滤（列表已带全部照片数据）
  const visible =
    records?.filter((r) => {
      if (form.photo === 'complete') return isComplete(r)
      if (form.photo === 'incomplete') return !isComplete(r)
      return true
    }) ?? []

  const totalPhotos = visible.reduce((n, r) => n + PHASES.reduce((m, p) => m + r.photos[p.key].length, 0), 0)
  const completeCount = visible.filter(isComplete).length

  function exportCsv() {
    const esc = (s: string | number) => `"${String(s ?? '').replace(/"/g, '""')}"`
    const header = ['项目名称', '高速公路', '路段', '桩号', '方向', '施工内容', '施工日期', '施工前照片', '施工中照片', '施工后照片', '照片总数', '完整性']
    const rows = visible.map((r) => [
      r.project_name,
      r.highway,
      r.section,
      r.stake,
      directionLabel(r.direction),
      r.content,
      r.work_date,
      r.photos.before.length,
      r.photos.during.length,
      r.photos.after.length,
      PHASES.reduce((m, p) => m + r.photos[p.key].length, 0),
      isComplete(r) ? '完整' : '缺：' + missingPhases(r).join('/'),
    ])
    const csv = '\ufeff' + [header, ...rows].map((row) => row.map(esc).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `三照台账_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>三照系统</h1>
          <p className="subtitle">
            施工前 · 施工过程中 · 施工后 影像台账
            <span className="version"> · {APP_VERSION}</span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => (window.location.hash = '#/new')}>
          ＋ 新建记录
        </button>
      </header>

      <form className="filter card" onSubmit={submit}>
        <div className="filter-grid">
          <input
            list="fl-project-options"
            placeholder="项目名称"
            value={form.project ?? ''}
            onChange={(e) => setForm({ ...form, project: e.target.value })}
          />
          <datalist id="fl-project-options">
            {projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <input
            list="fl-highway-options"
            placeholder="高速公路"
            value={form.highway ?? ''}
            onChange={(e) => setForm({ ...form, highway: e.target.value })}
          />
          <datalist id="fl-highway-options">
            {highways.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
          <input
            list="fl-section-options"
            placeholder="路段"
            value={form.section ?? ''}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
          />
          <datalist id="fl-section-options">
            {sections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input
            placeholder="桩号"
            value={form.stake ?? ''}
            onChange={(e) => setForm({ ...form, stake: e.target.value })}
          />
          <input
            list="fl-content-options"
            placeholder="施工内容"
            value={form.content ?? ''}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <datalist id="fl-content-options">
            {contents.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <select
            value={form.direction ?? ''}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
          >
            <option value="">方向：全部</option>
            <option value="up">上行</option>
            <option value="down">下行</option>
          </select>
          <select
            value={form.photo ?? ''}
            onChange={(e) => setForm({ ...form, photo: e.target.value })}
          >
            <option value="">照片：全部</option>
            <option value="complete">照片完整</option>
            <option value="incomplete">照片不完整</option>
          </select>
          <input
            type="date"
            value={form.from ?? ''}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
          <input
            type="date"
            value={form.to ?? ''}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </div>
        <div className="filter-actions">
          <button type="submit" className="btn btn-primary">查询</button>
          <button type="button" className="btn" onClick={reset}>重置</button>
        </div>
      </form>

      {error && <div className="notice error">{error}</div>}
      {loading && <div className="notice">加载中…</div>}

      {visible.length > 0 && (
        <div className="summary-bar">
          <span className="summary-item">共 <b>{visible.length}</b> 条记录</span>
          <span className="summary-item">照片 <b>{totalPhotos}</b> 张</span>
          <span className="summary-item">
            完整 <b className="ok">{completeCount}</b> 条
          </span>
          <button className="btn btn-small" onClick={exportCsv}>
            ⬇ 导出 Excel
          </button>
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="notice">暂无记录，点击右上角「新建记录」开始建档</div>
      )}

      <div className="record-list">
        {visible.map((r) => {
          const missing = missingPhases(r)
          return (
            <div
              key={r.id}
              className="card record-card"
              onClick={() => (window.location.hash = `#/record/${r.id}`)}
            >
              <div className="record-head">
                <div>
                  <div className="record-project">{r.project_name}</div>
                  <div className="record-meta">
                    {r.highway} · {r.section} · {r.stake}
                    {r.direction && `（${directionLabel(r.direction)}）`}
                    {r.content && <> · {r.content}</>}
                  </div>
                </div>
                <div className="record-date-col">
                  <div className="record-date">{r.work_date}</div>
                  {missing.length === 0 ? (
                    <span className="badge badge-ok">完整</span>
                  ) : (
                    <span className="badge badge-warn">缺 {missing.join('/')}</span>
                  )}
                </div>
              </div>
              <div className="slot-grid">
                {PHASES.map((p) => {
                  const list = r.photos[p.key]
                  return (
                    <div className="slot" key={p.key}>
                      <div className="slot-head">
                        <span className="slot-label">{p.label}</span>
                      </div>
                      <div className="slot-body">
                        {list.length > 0 ? (
                          <>
                            <img src={photoUrl(list[0].id)} alt={p.label} loading="lazy" />
                            {list.length > 1 && <span className="slot-count">{list.length}张</span>}
                          </>
                        ) : (
                          <div className="slot-empty">待拍</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
