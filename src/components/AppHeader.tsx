import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, CircleHelp, KeyRound, LogIn, LogOut, ShieldCheck, Signpost, User, Users } from 'lucide-react'
import { listProjects, logout } from '../api'
import { useAuth } from '../auth'
import { safeReturnHash, setLoginIntent } from '../guestZone'

export type Crumb = { label: string; href?: string }

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function hashPath(hash: string): string {
  return hash.replace(/^#\/?/, '').split('/')[0] ?? ''
}

function rememberLoginReturn() {
  const hash = window.location.hash || '#/'
  if (hash.startsWith('#/login')) return
  setLoginIntent({ returnHash: safeReturnHash(hash), save: false })
}

export default function AppHeader({
  trail = [],
  project,
  projectKey,
}: {
  trail?: Crumb[]
  project?: string
  /** 用于项目切换器高亮匹配的项目名（默认取 project，详情页会传「项目名 · 路段」） */
  projectKey?: string
}) {
  const { user, setUser } = useAuth()
  const hash = useHash()
  const path = hashPath(hash)
  const activeName = projectKey ?? project
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [projects, setProjects] = useState<{ name: string; count: number }[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const userWrapRef = useRef<HTMLDivElement>(null)

  const projectActive = Boolean(user) && (path === '' || path === 'project' || path === 'record' || path === 'new')
  const layoutActive = path === 'layout' || path === 'zones' || (!user && path === '')
  const calendarActive = path === 'calendar'
  const signsActive = path === 'signs'
  const helpActive = path === 'help'
  const usersActive = path === 'users'
  const crumbs = trail.filter((item) => item.label)
  const showCrumbs = crumbs.length > 1

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

  // 点击外部或 Escape 关闭下拉
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
      if (userWrapRef.current && !userWrapRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpen(false)
      setUserOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <header className="app-header">
      <a className="app-brand" href="#/">
        <ShieldCheck aria-hidden="true" />
        <span>路安施工管理</span>
      </a>
      <nav className="app-nav" aria-label="主导航">
        {user ? (
          <a href="#/" className={projectActive ? 'active' : undefined} aria-current={projectActive ? 'page' : undefined}>
            项目
          </a>
        ) : null}
        <a
          href={user ? '#/zones' : '#/layout'}
          className={layoutActive ? 'active' : undefined}
          aria-current={layoutActive ? 'page' : undefined}
        >
          布置
        </a>
        {user ? (
          <a href="#/calendar" className={calendarActive ? 'active' : undefined} aria-current={calendarActive ? 'page' : undefined}>
            日历
          </a>
        ) : null}
      </nav>
      {showCrumbs ? (
        <nav className="breadcrumbs" aria-label="面包屑">
          {crumbs.map((item, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <span key={`${item.label}-${index}`}>
                {index > 0 ? <ChevronRight aria-hidden="true" /> : null}
                {item.href && !isLast ? <a href={item.href}>{item.label}</a> : item.label}
              </span>
            )
          })}
        </nav>
      ) : null}
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
                    <a
                      key={p.name}
                      href={`#/project/${encodeURIComponent(p.name)}`}
                      role="option"
                      aria-selected={p.name === activeName}
                      className={`project-switcher-item${p.name === activeName ? ' active' : ''}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="project-switcher-item-name">{p.name}</span>
                      {p.name === activeName ? (
                        <Check className="project-switcher-check" aria-hidden="true" />
                      ) : (
                        <span className="project-switcher-count">{p.count}</span>
                      )}
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}
        {user?.is_admin ? (
          <a className={`icon-btn${usersActive ? ' active' : ''}`} href="#/users" aria-label="账号" title="账号">
            <Users />
          </a>
        ) : null}
        <a className={`icon-btn${signsActive ? ' active' : ''}`} href="#/signs" aria-label="标志牌" title="标志牌">
          <Signpost />
        </a>
        <a className={`icon-btn${helpActive ? ' active' : ''}`} href="#/help" aria-label="帮助" title="帮助">
          <CircleHelp />
        </a>
        {user ? (
          <div className="user-menu-wrap" ref={userWrapRef}>
            <button
              className="user-button"
              title={user.username}
              aria-label={user.username}
              aria-haspopup="menu"
              aria-expanded={userOpen}
              onClick={() => setUserOpen((value) => !value)}
            >
              <User />
              <span>{user.username}</span>
            </button>
            {userOpen ? (
              <div className="user-menu" role="menu">
                <a
                  href="#/account"
                  role="menuitem"
                  className="project-switcher-item"
                  onClick={() => setUserOpen(false)}
                >
                  <KeyRound aria-hidden="true" />
                  修改密码
                </a>
                <button
                  type="button"
                  role="menuitem"
                  className="project-switcher-item"
                  onClick={() => {
                    setUserOpen(false)
                    void handleLogout()
                  }}
                >
                  <LogOut aria-hidden="true" />
                  退出
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <a className="user-button" href="#/login" aria-label="登录" onClick={rememberLoginReturn}>
            <LogIn />
            <span>登录</span>
          </a>
        )}
      </div>
    </header>
  )
}
