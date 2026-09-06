import { useEffect, useState } from 'react'
import { getRecord, saveZone } from '../api'
import AppHeader from '../components/AppHeader'
import { useUnsavedGuard } from '../useUnsavedGuard'
import { defaults, parseStake, parseZoneParams } from '../zone/utils'
import type { ZoneParams } from '../types'
import { validateZone } from '../zone/validation'
import { RoadWorkbench } from '../zone/3d/RoadWorkbench'
export default function ZoneEditorPage({ id }: { id: string }) {
  const [zone, setZone] = useState<ZoneParams | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [showZoneErrors, setShowZoneErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [baseline, setBaseline] = useState<string | null>(null)
  const snapshot = zone ? JSON.stringify(zone) : ''
  const dirty = baseline !== null && snapshot !== baseline
  const allowLeave = useUnsavedGuard(dirty)
  useEffect(() => {
    if (!loaded || !zone || baseline !== null) return
    setBaseline(JSON.stringify(zone))
  }, [baseline, loaded, zone])

  useEffect(() => {
    getRecord(id)
      .then((record) => {
        const start = parseStake(record.stake)
        const end = parseStake(record.end_stake)
        const importedDefaults: ZoneParams = {
          ...defaults,
          start: record.stake || defaults.start,
          work: start != null && end != null ? Math.max(10, Math.abs(end - start)) : defaults.work,
          direction: record.direction === 'down' ? 'down' : 'up',
          workSide: record.work_location.includes('中央') ? 'median' : 'roadside',
        }
        setZone(record.zone_params ? parseZoneParams(record.zone_params) ?? importedDefaults : importedDefaults)
        setLoaded(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
  }, [id])

  async function submit() {
    if (!loaded || !zone) return
    setShowZoneErrors(true)
    const errs = validateZone(zone)
    if (Object.keys(errs).length > 0) {
      setError('布置参数有误，请修正')
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveZone(id, zone)
      allowLeave()
      window.location.hash = `#/record/${id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setSaving(false)
    }
  }

  const trail = [{ label: '首页', href: '#/' }, { label: '记录详情', href: `#/record/${id}` }, { label: '布置编辑' }]
  if (error && !loaded) return <div className="app-frame"><AppHeader trail={trail} /><div className="page notice error">{error}</div></div>
  if (!loaded || !zone) return <div className="app-frame"><AppHeader trail={trail} /><div className="page table-empty">正在加载布置图…</div></div>

  return (
    <div className="app-frame workbench-app-frame">
      <AppHeader trail={trail} />
      <div className="workbench-container">
        <RoadWorkbench
          params={zone}
          onChange={(next) => {
            setZone(next)
            setError('')
          }}
          onSave={() => void submit()}
          saving={saving}
          saveLabel="保存布置图"
          saveError={error}
          showErrors={showZoneErrors}
          backHref={`#/record/${id}`}
        />
      </div>
    </div>
  )
}
