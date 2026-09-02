import { useMemo, useState } from 'react'
import { createZone } from '../api'
import { useAuth } from '../auth'
import AppHeader from '../components/AppHeader'
import ZoneCard from '../components/ZoneCard'
import { clearGuestZone, goToLogin, loadGuestZone } from '../guestZone'
import { parseStake, stake } from '../zone/utils'

export default function LayoutViewPage() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const params = useMemo(() => {
    return loadGuestZone()
  }, [])

  const endStake = useMemo(() => {
    if (!params) return ''
    const start = parseStake(params.start)
    return start != null && params.work >= 10
      ? stake(start + (params.direction === 'down' ? -params.work : params.work))
      : ''
  }, [params])

  async function save() {
    if (!params) return
    if (!user) {
      goToLogin({ save: true })
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await createZone({ zone: params })
      clearGuestZone()
      window.location.hash = `#/zones/${result.id}`
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败')
      setSaving(false)
    }
  }

  if (!params) {
    return (
      <div className="app-frame">
        <AppHeader trail={[{ label: '布置图' }]} />
        <div className="page">
          <div className="table-empty">还没有布置图，请先填写参数。</div>
          <a className="btn btn-primary" href="#/layout">
            去填写
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="app-frame">
      <AppHeader trail={[{ label: '布置图', href: '#/layout' }, { label: '预览' }]} />
      <div className="page">
        <header className="topbar">
          <a className="btn" href="#/layout">
            ← 修改参数
          </a>
          <h1>布置图</h1>
          <span className="topbar-spacer" />
        </header>

        <div className="card form-card zone-detail-head">
          <div>
            <strong>
              {params.start}
              {endStake ? ` — ${endStake}` : ''}
            </strong>
            <p>
              作业区 {params.work.toLocaleString()}m
              {user ? '' : ' · 未保存（仅本机本次有效）'}
            </p>
          </div>
        </div>

        {error ? <div className="notice error">{error}</div> : null}

        <ZoneCard
          params={params}
          editHref="#/layout"
          hideClear
        />

        <div className="layout-actions">
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? '保存中…' : user ? '保存布控区域' : '登录后保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
