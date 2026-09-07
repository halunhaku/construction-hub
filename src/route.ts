const NAV_EVENT = 'app:navigate'

export function currentPath(): string {
  return normalizePath(window.location.pathname)
}

export function normalizePath(value: string | undefined): string {
  if (!value) return '/'
  let path = value.trim()
  if (path.startsWith('http:') || path.startsWith('https:') || path.startsWith('//')) return '/'
  if (path.startsWith('#')) path = path.slice(1)
  if (!path.startsWith('/')) return '/'
  path = path.split(/[?#]/)[0] ?? '/'
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path || '/'
}


export function migrateHashRoute() {
  const hash = window.location.hash
  if (!hash.startsWith('#/')) return
  const next = normalizePath(hash)
  window.history.replaceState(null, '', next)
}

export function navigate(path: string, replace = false) {
  const next = normalizePath(path)
  if (next === currentPath() && !window.location.hash) {
    if (replace) window.history.replaceState(null, '', next)
    return
  }
  if (replace) window.history.replaceState(null, '', next)
  else window.history.pushState(null, '', next)
  window.dispatchEvent(new Event(NAV_EVENT))
}

export function subscribeRoute(listener: () => void) {
  window.addEventListener('popstate', listener)
  window.addEventListener(NAV_EVENT, listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener(NAV_EVENT, listener)
  }
}

export function installHistoryRouter() {
  migrateHashRoute()
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = (event.target as Element | null)?.closest?.('a[href]')
    if (!(link instanceof HTMLAnchorElement)) return
    if (link.target && link.target !== '_self') return
    if (link.hasAttribute('download')) return
    const href = link.getAttribute('href')
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return
    const url = new URL(link.href, window.location.origin)
    if (url.origin !== window.location.origin) return
    if (url.pathname.startsWith('/api')) return
    event.preventDefault()
    navigate(url.pathname + url.search)
  })
}
