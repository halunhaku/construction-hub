import { useEffect, useState } from 'react'
import { getOptions, listRecords, photoUrl, type ListQuery } from '../api'
import { directionLabel, PHASES, type RecordItem } from '../types'
import { APP_VERSION } from '../version'

export default function ListPage() {
  const [form, setForm] = useState<ListQuery>({})
  const [records, setRecords] = useState<RecordItem[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<string[]>([])
  const [highways, setHighways] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])

  useEffect(() => {
    load({})
    getOptions()
      .then((o) => {
        setProjects(o.projects)
        setHighways(o.highways)
        setSections(o.sections)
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
    const empty = { project: '', highway: '', section: '', stake: '', from: '', to: '' }
    setForm(empty)
    load({})
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

      {records && records.length === 0 && (
        <div className="notice">暂无记录，点击右上角「新建记录」开始建档</div>
      )}

      <div className="record-list">
        {records?.map((r) => (
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
              <div className="record-date">{r.work_date}</div>
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
        ))}
      </div>
    </div>
  )
}
