import { useRef, useState } from 'react'
import { createZone, login } from '../api'
import { useAuth } from '../auth'
import AppHeader from '../components/AppHeader'
import {
  clearGuestZone,
  consumeLoginIntent,
  loadGuestZone,
  isPublicHash,
  peekLoginIntent,
  safeReturnHash,
  setGuestSaveError,
} from '../guestZone'
import { validateZone } from '../zone/validation'
import { focusFirstIssue } from '../focus'

export default function LoginPage() {
  const { setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const intended = safeReturnHash(peekLoginIntent()?.returnHash)
  const backHash = isPublicHash(intended) ? intended : '#/'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) {
      setError('请填写用户名')
      requestAnimationFrame(() => focusFirstIssue(formRef.current, ['username']))
      return
    }
    if (!password) {
      setError('请填写密码')
      requestAnimationFrame(() => focusFirstIssue(formRef.current, ['password']))
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await login(username.trim(), password)
      setUser(result.user)
      const intent = consumeLoginIntent()
      if (intent?.save) {
        const zone = loadGuestZone()
        if (!zone || Object.keys(validateZone(zone)).length > 0) {
          window.location.hash = '#/layout'
          return
        }
        try {
          const created = await createZone({ zone })
          clearGuestZone()
          window.location.hash = `#/zones/${created.id}`
          return
        } catch (reason) {
          setGuestSaveError(reason instanceof Error ? reason.message : '保存失败')
          window.location.hash = '#/layout'
          return
        }
      }
      window.location.hash = safeReturnHash(intent?.returnHash)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败')
      setBusy(false)
      requestAnimationFrame(() => focusFirstIssue(formRef.current, ['password']))
    }
  }

  return (
    <div className="app-frame">
      <AppHeader trail={[{ label: '登录' }]} />
      <div className="page">
        <header className="topbar">
          <a className="btn" href={backHash}>
            ← 返回
          </a>
          <h1>登录</h1>
          <span className="topbar-spacer" />
        </header>
        <form ref={formRef} className="form login-form" onSubmit={(e) => void submit(e)}>
          <div className="card form-card">
            <label>
              用户名
              <input
                name="username"
                autoComplete="username"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="内部账号"
              />
            </label>
            <label>
              密码
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </div>
          {error ? <div className="notice error" role="alert">{error}</div> : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? '登录中…' : '登录'}
          </button>
          <p className="pin-hint">未登录可使用布置图和标志牌；项目台账、三照和已保存布控需登录后使用。</p>
        </form>
      </div>
    </div>
  )
}
