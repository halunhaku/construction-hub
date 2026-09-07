import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Home,
  KeyRound,
  Layers,
  LogIn,
  LogOut,
  Signpost,
  User,
  Users,
} from 'lucide-react'



import { listProjects, logout } from '../api'
import { useAuth } from '../auth'
import { safeReturnHash, setLoginIntent } from '../guestZone'
import { currentPath, navigate, subscribeRoute } from '../route.ts'

function useRoutePath() {
  const [path, setPath] = useState(currentPath)
  useEffect(() => subscribeRoute(() => setPath(currentPath())), [])
  return path
}

function firstSegment(path: string): string {
  return path.replace(/^\//, '').split('/')[0] ?? ''
}

function rememberLoginReturn() {
  const here = currentPath()
  if (here === '/login' || here.startsWith('/login/')) return
  setLoginIntent({ returnHash: safeReturnHash(here), save: false })
}

export default function AppHeader({
  project,
  projectKey,
}: {
  trail?: { label: string; href?: string }[]
  project?: string
  /** 用于项目切换器高亮匹配的项目名（默认取 project，详情页会传「项目名 · 路段」） */
  projectKey?: string
}) {
  const { user, setUser } = useAuth()
  const route = useRoutePath()
  const path = firstSegment(route)
  const activeName = projectKey ?? project
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [projects, setProjects] = useState<{ name: string; count: number }[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const userWrapRef = useRef<HTMLDivElement>(null)

  const homeActive = !user && path === ''
  const projectActive = Boolean(user) && (path === '' || path === 'project' || path === 'record' || path === 'new') && !route.includes('/zone')
  const layoutActive = path === 'layout'
  const threeDActive = path === 'layout' || (path === 'record' && route.includes('/zone'))
  const calendarActive = path === 'calendar'
  const signsActive = path === 'signs'
  const accountActive = path === 'account'
  const loginActive = path === 'login'

  async function handleLogout() {
    try {
      await logout()
    } catch {
      /* 即使接口失败也清掉本地登录态 */
    }
    setUser(null)
    navigate('/')
  }


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
    <>
      <header className="app-header">
        <a className="app-brand" href="/">
          <img className="app-brand-mark" src="/favicon.svg?v=3" alt="" width={25} height={25} />
          <span className="app-brand-full">陌上</span>
          <span className="app-brand-short">陌上</span>
        </a>

        <nav className="app-nav" aria-label="主导航">
          {user ? (
            <>
              <a href="/" className={projectActive ? 'active' : undefined} aria-current={projectActive ? 'page' : undefined}>
                项目台账
              </a>
              <a href="/layout" className={layoutActive ? 'active' : undefined} aria-current={layoutActive ? 'page' : undefined}>
                3D 布置
              </a>
              <a href="/calendar" className={calendarActive ? 'active' : undefined} aria-current={calendarActive ? 'page' : undefined}>
                日历
              </a>
              <a href="/signs" className={signsActive ? 'active' : undefined} aria-current={signsActive ? 'page' : undefined}>
                标志牌
              </a>

            </>
          ) : (
            <>
              <a href="/" className={homeActive ? 'active' : undefined} aria-current={homeActive ? 'page' : undefined}>
                首页
              </a>
              <a href="/layout" className={layoutActive ? 'active' : undefined} aria-current={layoutActive ? 'page' : undefined}>
                3D 布置
              </a>
              <a href="/signs" className={signsActive ? 'active' : undefined} aria-current={signsActive ? 'page' : undefined}>
                标志牌
              </a>
            </>
          )}
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
                      <a
                        key={p.name}
                        href={`/project/${encodeURIComponent(p.name)}`}
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
          <div className="header-desktop-actions">
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
                    {user.is_admin ? (
                      <a
                        href="/users"
                        role="menuitem"
                        className="project-switcher-item"
                        onClick={() => setUserOpen(false)}
                      >
                        <Users aria-hidden="true" />
                        账号管理
                      </a>
                    ) : null}
                    <a
                      href="/account"
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
              <a className="user-button" href="/login" aria-label="登录" onClick={rememberLoginReturn}>
                <LogIn />
                <span>登录</span>
              </a>
            )}
          </div>
        </div>
      </header>
      <nav className={`mobile-tabbar${user ? '' : ' mobile-tabbar-guest'}`} aria-label="移动导航">
        {user ? (
          <>
            <a href="/" className={projectActive ? 'active' : undefined} aria-current={projectActive ? 'page' : undefined}>
              <Home aria-hidden="true" />
              项目
            </a>
            <a href="/layout" className={threeDActive ? 'active' : undefined} aria-current={threeDActive ? 'page' : undefined}>
              <Layers aria-hidden="true" />
              3D
            </a>
            <a href="/calendar" className={calendarActive ? 'active' : undefined} aria-current={calendarActive ? 'page' : undefined}>
              <CalendarDays aria-hidden="true" />
              日历
            </a>
            <a href="/account" className={accountActive ? 'active' : undefined} aria-current={accountActive ? 'page' : undefined}>
              <User aria-hidden="true" />
              我的
            </a>
          </>
        ) : (
          <>
            <a href="/" className={homeActive ? 'active' : undefined} aria-current={homeActive ? 'page' : undefined}>
              <Home aria-hidden="true" />
              首页
            </a>
            <a href="/layout" className={threeDActive ? 'active' : undefined} aria-current={threeDActive ? 'page' : undefined}>
              <Layers aria-hidden="true" />
              3D
            </a>
            <a href="/signs" className={signsActive ? 'active' : undefined} aria-current={signsActive ? 'page' : undefined}>
              <Signpost aria-hidden="true" />
              标志
            </a>
            <a href="/login" className={loginActive ? 'active' : undefined} aria-current={loginActive ? 'page' : undefined} onClick={rememberLoginReturn}>
              <LogIn aria-hidden="true" />
              登录
            </a>
          </>
        )}
      </nav>
    </>
  )
}
