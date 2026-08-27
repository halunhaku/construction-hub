import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createUser, deleteUser, listUsers, updateUserPassword, type AccountItem } from '../api'
import { useAuth } from '../auth'
import AppHeader from '../components/AppHeader'
import { formatTime } from '../util'

export default function UsersPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<AccountItem[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)

  function refresh() {
    return listUsers()
      .then(setItems)
      .catch((reason) => setError(reason instanceof Error ? reason.message : '加载失败'))
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createUser(username.trim(), password)
      setUsername('')
      setPassword('')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '添加失败')
    } finally {
      setSaving(false)
    }
  }

  function startReset(item: AccountItem) {
    setResetId(item.id)
    setResetPassword('')
    setResetConfirm('')
    setError('')
  }

  async function submitReset(item: AccountItem) {
    if (resetPassword.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (resetPassword !== resetConfirm) {
      setError('两次输入的新密码不一致')
      return
    }
    setResetting(true)
    setError('')
    try {
      await updateUserPassword(item.id, resetPassword)
      setResetId(null)
      setResetPassword('')
      setResetConfirm('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '改密失败')
    } finally {
      setResetting(false)
    }
  }

  async function remove(item: AccountItem) {
    if (item.id === user?.id) return
    if (!window.confirm(`确定删除账号「${item.username}」吗？此操作不可恢复。`)) return
    setError('')
    try {
      await deleteUser(item.id)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败')
    }
  }

  return (
    <div className="app-frame">
      <AppHeader trail={['首页', '账号']} />
      <main className="registry-page">
        <section className="registry-heading">
          <div>
            <p className="eyebrow">管理员</p>
            <h1>账号</h1>
            <p>只有管理员能添加、改密、删除。新账号默认不是管理员。</p>
          </div>
        </section>

        <form className="form" onSubmit={(e) => void addUser(e)}>
          <h2 className="form-section-title">添加账号</h2>
          <div className="card form-card">
            <div className="form-row">
              <label>
                用户名
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="登录名" />
              </label>
              <label>
                密码
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </label>
            </div>
          </div>
          {error ? <div className="notice error">{error}</div> : null}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '添加中…' : '添加'}
          </button>
        </form>

        {loading ? <div className="table-empty">正在加载账号…</div> : null}

        {!loading ? (
          <section className="zone-list" aria-label="账号列表">
            {items.map((item) => (
              <div key={item.id} className="zone-list-item user-row">
                <span className="zone-list-main">
                  <strong>{item.username}</strong>
                  <span className="zone-list-range">
                    {item.is_admin ? '管理员' : '普通账号'}
                    {item.created_at ? ` · ${formatTime(item.created_at)}` : ''}
                  </span>
                </span>
                {resetId === item.id ? (
                  <form
                    className="user-reset-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void submitReset(item)
                    }}
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="新密码"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="再输入一次"
                      value={resetConfirm}
                      onChange={(e) => setResetConfirm(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={resetting}>
                      {resetting ? '保存中…' : '保存'}
                    </button>
                    <button type="button" className="btn" onClick={() => setResetId(null)}>
                      取消
                    </button>
                  </form>
                ) : (
                  <span className="user-row-actions">
                    <button type="button" className="btn" onClick={() => startReset(item)}>
                      改密
                    </button>
                    {item.id === user?.id ? null : (
                      <button type="button" className="btn btn-danger" onClick={() => void remove(item)}>
                        <Trash2 />
                        删除
                      </button>
                    )}
                  </span>
                )}
              </div>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  )
}
