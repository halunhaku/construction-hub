import { useRef, useState } from 'react'
import { KeyRound, LogOut, Signpost, User, Users } from 'lucide-react'
import { changeOwnPassword, logout } from '../api'
import { useAuth } from '../auth'
import AppHeader from '../components/AppHeader'
import { focusFirstIssue } from '../focus'

export default function AccountPage() {
  const { user, setUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)


  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('新密码至少 6 位')
      requestAnimationFrame(() => focusFirstIssue(formRef.current, ['new_password']))
      return
    }
    if (password !== confirm) {
      setError('两次输入的新密码不一致')
      requestAnimationFrame(() => focusFirstIssue(formRef.current, ['confirm']))
      return
    }
    setBusy(true)
    setError('')
    setOk('')
    try {
      await changeOwnPassword(current, password)
      setCurrent('')
      setPassword('')
      setConfirm('')
      setOk('密码已更新')
      setEditing(false)

    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '改密失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      /* 即使接口失败也清掉本地登录态 */
    }
    setUser(null)
    window.location.hash = '#/'
  }

  return (
    <div className="app-frame">
      <AppHeader trail={[{ label: '首页', href: '#/' }, { label: '我的' }]} />
      <main className="page account-page">
        <section className="account-hero card">
          <span className="account-avatar" aria-hidden="true">
            <User />
          </span>
          <div className="account-hero-meta">
            <strong>{user?.username ?? '未登录'}</strong>
            <span>{user?.is_admin ? '管理员' : '成员'}</span>
          </div>
        </section>
        {!editing && ok ? <div className="notice">{ok}</div> : null}


        <nav className="account-links" aria-label="账号快捷入口">
          {user?.is_admin ? (
            <a className="account-link" href="#/users">
              <Users aria-hidden="true" />
              账号管理
            </a>
          ) : null}
          <a className="account-link" href="#/signs">
            <Signpost aria-hidden="true" />
            标志牌库
          </a>
          {!editing ? (
            <button type="button" className="account-link" onClick={() => setEditing(true)}>
              <KeyRound aria-hidden="true" />
              修改密码
            </button>
          ) : null}
        </nav>

        {editing ? (
          <form ref={formRef} className="form login-form" onSubmit={(e) => void submit(e)}>
            <h2 className="form-section-title">
              <KeyRound aria-hidden="true" />
              修改密码
            </h2>
            <div className="card form-card">
              <label>
                当前密码
                <input name="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </label>
              <label>
                新密码
                <input name="new_password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <label>
                确认新密码
                <input name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </label>
            </div>
            {error ? <div className="notice error">{error}</div> : null}
            {ok ? <div className="notice">{ok}</div> : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? '保存中…' : '更新密码'}
            </button>
            <button
              type="button"
              className="btn btn-block"
              onClick={() => {
                setEditing(false)
                setCurrent('')
                setPassword('')
                setConfirm('')
                setError('')
                setOk('')
              }}
            >
              取消
            </button>
          </form>
        ) : null}


        <button type="button" className="btn btn-danger btn-block account-logout" onClick={() => void handleLogout()}>
          <LogOut aria-hidden="true" />
          退出登录
        </button>
      </main>
    </div>
  )
}
