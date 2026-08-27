import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, LogIn, LogOut, ShieldCheck, Users } from 'lucide-react'
import { listProjects, logout } from '../api'
import { useAuth } from '../auth'

export default function AppHeader({
  trail,
  project,
  projectKey,
}: {
  trail: string[]
  project?: string
  /** 用于项目切换器高亮匹配的项目名（默认取 project，详情页会传「项目名 · 路段」） */
  projectKey?: string
}) {
  const { user, setUser } = useAuth()
  const activeName = projectKey ?? project
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<{ name: string; count: number }[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  async function handleLogout() {
    try {
      await logout()
    } catch {
      /* 即使接口失败也清掉本地登录态 */
    }
    setUser(null)
    window.location.hash = '#/'
  }

  // 打开时拉取项目列表（每次刷新，保证新建项目立即可见）
  useEffect(() => {
    if (!open) return
    let cancelled = false
    listProjects()
      .then((list) => {
        if (!cancelled) setProjects(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open])

  // 点击外部关闭下拉
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function switchTo(name: string) {
    setOpen(false)
    window.location.hash = `#/project/${encodeURIComponent(name)}`
  }

  return (
    <header className="app-header">
      <button className="app-brand" onClick={() => (window.location.hash = '#/')}>
        <ShieldCheck aria-hidden="true" />
        <span>路安施工管理</span>
      </button>
      <nav className="breadcrumbs" aria-label="面包屑">
        {trail.map((item, index) => (
          <span key={item}>
            {index > 0 ? <ChevronRight aria-hidden="true" /> : null}
            {item}
          </span>
        ))}
      </nav>
      <div className="app-header-tools">
        {user && project ? (
          <div className="project-switcher-wrap" ref={wrapRef}>
            <button
              className="project-switcher"
              title={project}
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <span className="project-switcher-label">项目：{project}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {open && (
              <div className="project-switcher-menu" role="listbox" aria-label="切换项目">
                {projects.length === 0 ? (
                  <div className="project-switcher-empty">加载中…</div>
                ) : (
                  projects.map((p) => (
                    <button
                      key={p.name}
                      role="option"
                      aria-selected={p.name === activeName}
                      className={`project-switcher-item${p.name === activeName ? ' active' : ''}`}
                      onClick={() => switchTo(p.name)}
                    >
                      <span className="project-switcher-item-name">{p.name}</span>
                      {p.name === activeName ? (
                        <Check className="project-switcher-check" aria-hidden="true" />
                      ) : (
                        <span className="project-switcher-count">{p.count}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}
        {user?.is_admin ? (
          <button className="icon-btn" aria-label="账号" title="账号" onClick={() => (window.location.hash = '#/users')}>
            <Users />
          </button>
        ) : null}
        {user ? (
          <button className="icon-btn" aria-label="日历" onClick={() => (window.location.hash = '#/calendar')}>
            <CalendarDays />
          </button>
        ) : null}
        <button className="icon-btn" aria-label="帮助" onClick={() => (window.location.hash = '#/help')}>
          <CircleHelp />
        </button>
        {user ? (
          <button className="user-button" title={`${user.username} · 退出`} aria-label="退出登录" onClick={() => void handleLogout()}>
            <LogOut />
            <span>{user.username}</span>
          </button>
        ) : (
          <button className="user-button" aria-label="登录" onClick={() => (window.location.hash = '#/login')}>
            <LogIn />
            <span>登录</span>
          </button>
        )}
      </div>
    </header>
  )
}
