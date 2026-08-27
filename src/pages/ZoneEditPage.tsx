import { useEffect, useState } from 'react'
import { getZone, updateZone } from '../api'
import AppHeader from '../components/AppHeader'
import ZoneForm from '../components/ZoneForm'
import type { ZoneParams } from '../types'
import { defaults, parseZoneParams, parseStake, stake } from '../zone/utils'
import { validateZone } from '../zone/validation'

export default function ZoneEditPage({ id }: { id: string }) {

  const [zone, setZone] = useState<ZoneParams>({ ...defaults, start: '' })
  const [error, setError] = useState('')
  const [showZoneErrors, setShowZoneErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getZone(id)
      .then((item) => {
        if (cancelled) return
        setZone(parseZoneParams(item.zone_params) ?? { ...defaults, start: '' })
        setLoading(false)
      })
      .catch((reason) => {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : '布控区域加载失败')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const endStake = (() => {
    const start = parseStake(zone.start)
    return start != null && zone.work >= 10 ? stake(start + (zone.direction === 'down' ? -zone.work : zone.work)) : ''
  })()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setShowZoneErrors(true)
    const zoneErrors = validateZone(zone)
    if (Object.keys(zoneErrors).length > 0) {
      const messages = [
        zoneErrors.start ? `起始桩号：${zoneErrors.start}` : '',
        zoneErrors.work ? `作业区长度：${zoneErrors.work}` : '',
      ].filter(Boolean)
      setError(messages.length ? `布置参数有误，请修正（红色提示处）：${messages.join('；')}` : '布置参数有误，请修正（红色提示处）')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateZone(id, { zone })
      window.location.hash = `#/zones/${id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setSaving(false)
    }
  }

  return (
    <div className="app-frame">
      <AppHeader trail={['首页', '布控区域', '编辑布控']} />
      <div className="page">
        <header className="topbar">
          <button className="btn" onClick={() => (window.location.hash = `#/zones/${id}`)}>
            ← 返回
          </button>
          <h1>编辑布控区域</h1>
          <span className="topbar-spacer" />
        </header>

        {loading ? <div className="table-empty">正在加载布控区域…</div> : null}

        {!loading && (
          <form className="form" onSubmit={(e) => void submit(e)} onChange={() => setError('')} noValidate>
            <h2 className="form-section-title">作业区布置</h2>
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
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
              {saving ? '保存中…' : '保存修改'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
