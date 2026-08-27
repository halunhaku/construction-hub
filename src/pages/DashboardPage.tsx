import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CircleAlert, Images, List, MapPin, Plus, Search, Signpost, TrafficCone } from 'lucide-react'
import { listRecords } from '../api'
import { useAuth } from '../auth'
import AppHeader from '../components/AppHeader'
import { PHASES, type RecordItem } from '../types'

type ProjectStatus = '进行中' | '资料待补充' | '已完成'

interface ProjectSummary {
  name: string
  location: string
  recordCount: number
  completeCount: number
  completeness: number
  missingCount: number
  dateRange: string
  updatedAt: string
  status: ProjectStatus
}

function isComplete(record: RecordItem): boolean {
  return PHASES.every((phase) => record.photos[phase.key].length > 0)
}

function dateLabel(value: string): string {
  if (!value) return '暂无日期'
  return value.slice(0, 10).replaceAll('-', '.')
}

// ── 最近访问：记录用户最近进入的项目（localStorage，最多 3 个）──
const RECENT_KEY = 'recent-projects-v1'
const RECENT_MAX = 3

function loadRecentNames(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function rememberProject(name: string): string[] {
  const next = [name, ...loadRecentNames().filter((item) => item !== name)].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* 存储失败不影响使用 */
  }
  return next
}

function summarize(name: string, records: RecordItem[]): ProjectSummary {
  const sortedDates = records.map((record) => record.work_date).filter(Boolean).sort()
  const completeCount = records.filter(isComplete).length
  const missingCount = records.length - completeCount
  const completeness = records.length ? Math.round((completeCount / records.length) * 100) : 0
  const highways = [...new Set(records.map((record) => record.highway).filter(Boolean))]
  const sections = [...new Set(records.map((record) => record.section).filter(Boolean))]
  const latest = records
    .map((record) => record.created_at || record.work_date)
    .filter(Boolean)
    .sort()
    .at(-1) ?? ''
  const latestWorkDate = sortedDates.at(-1) ?? ''
  const recentThreshold = new Date()
  recentThreshold.setDate(recentThreshold.getDate() - 45)
  const status: ProjectStatus = completeness === 100
    ? '已完成'
    : new Date(latestWorkDate).getTime() >= recentThreshold.getTime()
      ? '进行中'
      : '资料待补充'

  return {
    name,
    location: [...highways.slice(0, 1), ...sections.slice(0, 1)].join(' · ') || '未填写道路与路段',
    recordCount: records.length,
    completeCount,
    completeness,
    missingCount,
    dateRange: sortedDates.length
      ? `${dateLabel(sortedDates[0])} — ${dateLabel(sortedDates.at(-1) ?? sortedDates[0])}`
      : '暂无施工日期',
    updatedAt: dateLabel(latest),
    status,
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState<RecordItem[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProjectStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recentNames, setRecentNames] = useState<string[]>(loadRecentNames)

  useEffect(() => {
    listRecords()
      .then(setRecords)
      .catch((reason) => setError(reason instanceof Error ? reason.message : '项目加载失败'))
      .finally(() => setLoading(false))
  }, [])

  const projects = useMemo(() => {
    const groups = new Map<string, RecordItem[]>()
    for (const record of records) {
      const name = record.project_name.trim() || '未命名项目'
      groups.set(name, [...(groups.get(name) ?? []), record])
    }
    return [...groups.entries()]
      .map(([name, items]) => summarize(name, items))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [records])

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesKeyword = !keyword || `${project.name} ${project.location}`.toLowerCase().includes(keyword)
      return matchesKeyword && (!status || project.status === status)
    })
  }, [projects, search, status])

  // 最近访问：从访问记录映射回当前项目列表（已删除的项目自动过滤）
  const recent = useMemo(() => {
    return recentNames
      .map((name) => projects.find((project) => project.name === name))
      .filter((project): project is ProjectSummary => project != null)
  }, [recentNames, projects])

  function openProject(name: string) {
    setRecentNames(rememberProject(name))
    window.location.hash = `#/project/${encodeURIComponent(name)}`
  }

  return (
    <div className="app-frame">
      <AppHeader trail={['首页']} />
      <main className="dashboard-page">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">项目工作台</p>
            <h1>项目总览</h1>
            <p>选择项目后，进入施工位置清单与现场证据管理。</p>
          </div>
          <div className="heading-actions">
            <button className="btn btn-secondary" onClick={() => (window.location.hash = '#/layout')}>
              <TrafficCone />
              作业区布置
            </button>
            <button className="btn btn-secondary" onClick={() => (window.location.hash = '#/zones')}>
              <List />
              布控列表
            </button>
            <button className="btn btn-secondary" onClick={() => (window.location.hash = '#/signs')}>
              <Signpost />
              标志牌 SVG
            </button>
            {user?.is_admin ? (
              <button className="btn btn-secondary" onClick={() => (window.location.hash = '#/users')}>
                账号
              </button>
            ) : null}
            <button className="btn btn-primary" onClick={() => (window.location.hash = '#/new')}>
              <Plus />
              新建项目
            </button>
          </div>
        </section>

        <section className="dashboard-controls" aria-label="项目筛选">
          <label className="dashboard-search">
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索项目名称、道路或路段" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | '')}>
            <option value="">全部状态</option>
            <option value="进行中">进行中</option>
            <option value="资料待补充">资料待补充</option>
            <option value="已完成">已完成</option>
          </select>
        </section>

        {recent.length ? (
          <section className="recent-projects" aria-label="最近访问">
            <strong>最近访问</strong>
            <div>
              {recent.map((project) => (
                <button key={project.name} onClick={() => openProject(project.name)}>
                  {project.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {error ? <div className="notice error">{error}</div> : null}
        {loading ? <div className="dashboard-empty">正在加载项目…</div> : null}
        {!loading && !visible.length ? (
          <div className="dashboard-empty">
            <strong>{projects.length ? '没有匹配的项目' : '还没有项目'}</strong>
            <span>{projects.length ? '调整搜索或筛选条件。' : '新建第一条施工记录，项目会自动出现在这里。'}</span>
          </div>
        ) : null}

        {!loading && visible.length ? (
          <section className="project-grid" aria-label="项目列表">
            {visible.map((project) => (
              <button
                className="project-card"
                key={project.name}
                onClick={() => openProject(project.name)}
              >
                <span className="project-card-head">
                  <span>
                    <strong>{project.name}</strong>
                    <small><MapPin />{project.location}</small>
                  </span>
                  <i className={`project-status status-${project.status}`}>{project.status}</i>
                </span>
                <span className="project-card-date"><CalendarDays />{project.dateRange}</span>
                <span className="project-metrics">
                  <span><b>{project.recordCount}</b><small>施工位置</small></span>
                  <span><b>{project.completeCount}</b><small>证据完整</small></span>
                </span>
                <span className="project-progress-head">
                  <span><Images />证据完整度</span>
                  <strong>{project.completeness}%</strong>
                </span>
                <progress value={project.completeness} max="100" aria-label={`证据完整度 ${project.completeness}%`} />
                <span className="project-card-foot">
                  <small>更新于 {project.updatedAt}</small>
                  {project.missingCount ? <em><CircleAlert />{project.missingCount} 条待补充</em> : <em className="complete">资料完整</em>}
                </span>
              </button>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  )
}
