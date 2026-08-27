import { useState } from 'react'
import { login } from '../api'
import { useAuth } from '../auth'
import AppHeader from '../components/AppHeader'

export default function LoginPage() {
  const { setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await login(username.trim(), password)
      setUser(result.user)
      window.location.hash = '#/'
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败')
      setBusy(false)
    }
  }

  return (
    <div className="app-frame">
      <AppHeader trail={['登录']} />
      <div className="page">
        <header className="topbar">
          <button className="btn" onClick={() => (window.location.hash = '#/layout')}>
            ← 布置图
          </button>
          <h1>登录</h1>
          <span className="topbar-spacer" />
        </header>
        <form className="form login-form" onSubmit={(e) => void submit(e)}>
          <div className="card form-card">
            <div className="form-row">
              <label>
                用户名
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="内部账号"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                密码
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>
          </div>
          {error ? <div className="notice error">{error}</div> : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? '登录中…' : '登录'}
          </button>
          <p className="pin-hint">未登录可使用布置图和标志牌；项目台账、三照和已保存布控需登录后使用。</p>
        </form>
      </div>
    </div>
  )
}
