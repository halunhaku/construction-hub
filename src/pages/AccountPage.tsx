import { useRef, useState } from 'react'
import { changeOwnPassword } from '../api'
import AppHeader from '../components/AppHeader'
import { focusFirstIssue } from '../focus'

export default function AccountPage() {
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '改密失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-frame">
      <AppHeader trail={[{ label: '首页', href: '#/' }, { label: '修改密码' }]} />
      <div className="page">
        <header className="topbar">
          <a className="btn" href="#/">
            ← 返回
          </a>
          <h1>修改密码</h1>
          <span className="topbar-spacer" />
        </header>
        <form ref={formRef} className="form login-form" onSubmit={(e) => void submit(e)}>
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
        </form>
      </div>
    </div>
  )
}
