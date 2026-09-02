import { useEffect, useRef } from 'react'

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
    const origin = window.location.hash || '#/'
    function onClick(event: MouseEvent) {
      if (!dirtyRef.current || allowRef.current) return
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]')
      if (!(link instanceof HTMLAnchorElement)) return
      const href = link.getAttribute('href') || ''
      if (!href.startsWith('#') || href === origin) return
      if (!window.confirm(MESSAGE)) {
        event.preventDefault()
        event.stopPropagation()
      } else {
        allowRef.current = true
      }
    }
    function onHashChange() {
      if (allowRef.current) {
        allowRef.current = false
        return
      }
      if (!dirtyRef.current) return
      const next = window.location.hash || '#/'
      if (next === origin) return
      if (!window.confirm(MESSAGE)) {
        allowRef.current = true
        window.location.hash = origin
      }
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  return allowLeave
}
