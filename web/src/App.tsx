import { useEffect, useState } from 'react'
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

  if (path === 'new') return <NewRecordPage />
  if (path === 'record' && id && sub === 'zone') {
    return <ZoneEditorPage id={decodeURIComponent(id)} />
  }
  if (path === 'record' && id) return <RecordPage id={decodeURIComponent(id)} />
  return <ListPage />
}
