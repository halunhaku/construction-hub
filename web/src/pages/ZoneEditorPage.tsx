import { useEffect, useState } from 'react'
import { getRecord, saveZone } from '../api'
import ZoneForm, { validateZone } from '../components/ZoneForm'
import { defaults, parseZoneParams } from '../zone/utils'
import type { ZoneParams } from '../types'

export default function ZoneEditorPage({ id }: { id: string }) {
  const [zone, setZone] = useState<ZoneParams | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getRecord(id)
      .then((record) => {
        setZone(record.zone_params ? parseZoneParams(record.zone_params) ?? defaults : defaults)
        setLoaded(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!loaded || !zone) return
    const errs = validateZone(zone)
    if (Object.keys(errs).length > 0) {
      setError('布置参数有误，请修正（红色提示处）')
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveZone(id, zone)
      window.location.hash = `#/record/${id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setSaving(false)
    }
  }

  if (error && !loaded) return <div className="page notice error">{error}</div>

  return (
    <div className="page">
      <header className="topbar">
        <button className="btn" onClick={() => (window.location.hash = `#/record/${id}`)}>
          ← 返回
        </button>
        <h1>作业区布置</h1>
        <span className="topbar-spacer" />
      </header>

      {loaded && (
        <form className="card form" onSubmit={submit}>
          <ZoneForm value={zone} onChange={setZone} allowDisable={false} />
          {error && <div className="notice error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? '保存中…' : '保存布置图'}
          </button>
        </form>
      )}
    </div>
  )
}
