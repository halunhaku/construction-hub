import { useEffect, useRef } from 'react'
import { currentPath, navigate } from './route.ts'

const MESSAGE = '有未保存的修改，确定离开？'

/** 表单有未保存修改时：关页/刷新走浏览器提示；站内跳转（链接、后退）先确认。保存成功后先调 `allowLeave()`。 */
export function useUnsavedGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const allowRef = useRef(false)

  function allowLeave() {
    allowRef.current = true
    dirtyRef.current = false
  }

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current || allowRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    const origin = currentPath()
    function onClick(event: MouseEvent) {
      if (!dirtyRef.current || allowRef.current) return
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!(link instanceof HTMLAnchorElement)) return
      if (link.target && link.target !== '_self') return
      if (link.hasAttribute('download')) return
      const href = link.getAttribute('href')
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return
      const url = new URL(link.href, window.location.origin)
      if (url.origin !== window.location.origin) return
      if (url.pathname === origin) return
      if (!window.confirm(MESSAGE)) {
        event.preventDefault()
        event.stopPropagation()
      } else {
        allowRef.current = true
      }
    }
    function onPopState() {
      if (allowRef.current) {
        allowRef.current = false
        return
      }
      if (!dirtyRef.current) return
      const next = currentPath()
      if (next === origin) return
      if (!window.confirm(MESSAGE)) {
        allowRef.current = true
        navigate(origin)
      }
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  return allowLeave
}
