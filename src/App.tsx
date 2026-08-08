import { useEffect, useState } from 'react'
import CalendarPage from './pages/CalendarPage'
import DashboardPage from './pages/DashboardPage'
import HelpPage from './pages/HelpPage'
import ListPage from './pages/ListPage'
import NewRecordPage from './pages/NewRecordPage'
import RecordPage from './pages/RecordPage'
import ZoneEditorPage from './pages/ZoneEditorPage'

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const hash = useHashRoute()
  const [path, id, sub] = hash.replace(/^#\/?/, '').split('/')

  if (path === 'help') return <HelpPage />
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
  return <DashboardPage />
}
