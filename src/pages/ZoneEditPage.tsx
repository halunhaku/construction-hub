import { useEffect, useState } from 'react'
import { getZone, updateZone } from '../api'
import AppHeader from '../components/AppHeader'
import type { ZoneParams } from '../types'
import { useUnsavedGuard } from '../useUnsavedGuard'
import { defaults, parseZoneParams } from '../zone/utils'
import { validateZone } from '../zone/validation'
import { RoadWorkbench } from '../zone/3d/RoadWorkbench'
export default function ZoneEditPage({ id }: { id: string }) {

  const [zone, setZone] = useState<ZoneParams>({ ...defaults, start: '' })
  const [error, setError] = useState('')
  const [showZoneErrors, setShowZoneErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [baseline, setBaseline] = useState<string | null>(null)
  const snapshot = JSON.stringify(zone)
  const dirty = !loading && baseline !== null && snapshot !== baseline
  const allowLeave = useUnsavedGuard(dirty)

  useEffect(() => {
    if (loading || baseline !== null) return
    setBaseline(JSON.stringify(zone))
  }, [baseline, loading, zone])

  useEffect(() => {
    let cancelled = false
    getZone(id)
      .then((item) => {
        if (cancelled) return
        const parsed = parseZoneParams(item.zone_params)
        setZone(parsed ?? { ...defaults, start: item.stake, work: item.length })
        setLoading(false)
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : '加载失败')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function save() {
    const errs = validateZone(zone)
    if (Object.keys(errs).length > 0) {
      setShowZoneErrors(true)
      setError('布置参数有误，请修正')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateZone(id, { zone })
      allowLeave()
      window.location.hash = `#/zones/${id}`
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败')
      setSaving(false)
    }
  }

  const trail = [{ label: '首页', href: '#/' }, { label: '布控区域', href: '#/zones' }, { label: '编辑' }]
  if (loading) return <div className="app-frame"><AppHeader trail={trail} /><div className="page table-empty">正在加载布控配置…</div></div>

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
          onSave={() => void save()}
          saving={saving}
          saveLabel="保存修改"
          saveError={error}
          showErrors={showZoneErrors}
          backHref={`#/zones/${id}`}
        />
      </div>
    </div>
  )
}
