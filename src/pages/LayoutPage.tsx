import { useState } from 'react'
import { createZone } from '../api'
import { useAuth } from '../auth'
import AppHeader from '../components/AppHeader'
import ZoneForm from '../components/ZoneForm'
import { saveGuestZone } from '../guestZone'
import type { ZoneParams } from '../types'
import { defaults, parseStake, stake } from '../zone/utils'
import { validateZone } from '../zone/validation'

export default function LayoutPage() {
  const { user } = useAuth()
  const [zone, setZone] = useState<ZoneParams>({ ...defaults, start: '' })
  const [error, setError] = useState('')
  const [showZoneErrors, setShowZoneErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  const endStake = (() => {
    const start = parseStake(zone.start)
    return start != null && zone.work >= 10 ? stake(start + (zone.direction === 'down' ? -zone.work : zone.work)) : ''
  })()

  function openPreview() {
    setShowZoneErrors(true)
    const errors = validateZone(zone)
    if (Object.keys(errors).length > 0) {
      setError(errors.start ? `起始桩号：${errors.start}` : errors.work ? `作业区长度：${errors.work}` : '布置参数有误，请修正')
      return
    }
    saveGuestZone(zone)
    window.location.hash = '#/layout/view'
  }

  async function save() {
    setShowZoneErrors(true)
    const errors = validateZone(zone)
    if (Object.keys(errors).length > 0) {
      setError(errors.start ? `起始桩号：${errors.start}` : errors.work ? `作业区长度：${errors.work}` : '布置参数有误，请修正')
      return
    }
    if (!user) {
      saveGuestZone(zone)
      window.location.hash = '#/login'
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await createZone({ zone })
      window.location.hash = `#/zones/${result.id}`
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败')
      setSaving(false)
    }
  }

  return (
    <div className="app-frame">
      <AppHeader trail={['布置图']} />
      <div className="page">
        <header className="topbar">
          <button className="btn" onClick={() => (window.location.hash = user ? '#/' : '#/layout')}>
            {user ? '← 首页' : '布置图'}
          </button>
          <h1>作业区布置</h1>
          <span className="topbar-spacer" />
        </header>

        <p className="layout-lead">
          {user
            ? '填写参数后可直接导出图纸，或保存到布控列表。'
            : '扫码或打开本页即可出图。不用登录也能预览和导出；保存到系统需要登录。'}
        </p>

        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
          onChange={() => setError('')}
          noValidate
        >
          <h2 className="form-section-title">作业区参数</h2>
          <div className="card form-card">
            <div className="form-row">
              <label className="readonly-stake">
                结束桩号
                <input readOnly value={endStake || '填写起始桩号与长度后自动计算'} />
              </label>
            </div>
            <ZoneForm
              value={zone}
              onChange={(next) => next && setZone(next)}
              allowDisable={false}
              linked={false}
              showErrors={showZoneErrors}
              allowExport
            />
          </div>

          {error ? <div className="notice error">{error}</div> : null}

          <div className="layout-actions">
            <button type="button" className="btn btn-secondary" onClick={openPreview}>
              查看布置图
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '保存中…' : user ? '保存布控区域' : '登录后保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
