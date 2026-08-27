import { useEffect, useState } from 'react'
import { fetchMe, type AuthUser } from './api'
import { AuthProvider } from './auth'
import { goToLogin } from './guestZone'
import AccountPage from './pages/AccountPage'
import CalendarPage from './pages/CalendarPage'
import DashboardPage from './pages/DashboardPage'
import GuestHome from './pages/GuestHome'
import HelpPage from './pages/HelpPage'
import NotFoundPage from './pages/NotFoundPage'
import LayoutPage from './pages/LayoutPage'
import LayoutViewPage from './pages/LayoutViewPage'
import ListPage from './pages/ListPage'
import LoginPage from './pages/LoginPage'
import NewRecordPage from './pages/NewRecordPage'
import RecordPage from './pages/RecordPage'
import SignsPage from './pages/SignsPage'
import ZoneDetailPage from './pages/ZoneDetailPage'
import ZoneEditPage from './pages/ZoneEditPage'
import ZoneEditorPage from './pages/ZoneEditorPage'
import UsersPage from './pages/UsersPage'
import ZonesPage from './pages/ZonesPage'

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function LoginRedirect() {
  useEffect(() => {
    goToLogin()
  }, [])
  return <div className="page-loading">请先登录…</div>
}

function Router({ user }: { user: AuthUser | null }) {
  const hash = useHashRoute()
  const [path, id, sub] = hash.replace(/^#\/?/, '').split('/')

  if (path === 'login') return user ? <DashboardPage /> : <LoginPage />
  if (path === 'help') return <HelpPage />
  if (path === 'signs') return <SignsPage />
  if (path === 'layout' && id === 'view') return <LayoutViewPage />
  if (path === 'layout' || (path === 'zones' && id === 'new')) return <LayoutPage />

  const known =
    !path ||
    path === 'account' ||
    path === 'calendar' ||
    path === 'new' ||
    path === 'project' ||
    path === 'record' ||
    path === 'zones' ||
    path === 'users'
  if (path && !known) return <NotFoundPage />

  if (!user) return path ? <LoginRedirect /> : <GuestHome />

  if (path === 'account') return <AccountPage />
  if (path === 'calendar') return <CalendarPage />
  if (path === 'new') return <NewRecordPage key={id ?? ''} project={id ? decodeURIComponent(id) : undefined} />
  if (path === 'project' && id) return <ListPage project={decodeURIComponent(id)} />
  if (path === 'record' && id && sub === 'zone') {
    return <ZoneEditorPage id={decodeURIComponent(id)} />
  }
  if (path === 'record' && id && sub === 'edit') {
    return <NewRecordPage key={id} id={decodeURIComponent(id)} />
  }
  if (path === 'record' && id) return <RecordPage id={decodeURIComponent(id)} />
  if (path === 'zones' && id && sub === 'edit') return <ZoneEditPage key={id} id={decodeURIComponent(id)} />
  if (path === 'zones' && id) return <ZoneDetailPage id={decodeURIComponent(id)} />
  if (path === 'zones') return <ZonesPage />
  if (path === 'users') return user.is_admin ? <UsersPage /> : <DashboardPage />
  if (!path) return <DashboardPage />
  return <NotFoundPage />
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchMe()
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true))
  }, [])

  if (!ready) {
    return <div className="page-loading">正在加载…</div>
  }

  return (
    <AuthProvider user={user} setUser={setUser}>
      <Router user={user} />
    </AuthProvider>
  )
}
