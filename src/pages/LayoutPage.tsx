import { useEffect, useState } from 'react'
import { createZone } from '../api'
import { useAuth } from '../auth'
import AppHeader from '../components/AppHeader'
import {
  clearGuestZone,
  goToLogin,
  loadGuestZone,
  readGuestSaveError,
  saveGuestZone,
} from '../guestZone'
import type { ZoneParams } from '../types'
import { useUnsavedGuard } from '../useUnsavedGuard'
import { defaults } from '../zone/utils'
import { validateZone } from '../zone/validation'
import { RoadWorkbench } from '../zone/3d/RoadWorkbench'

function initialZone(): ZoneParams {
  return loadGuestZone() ?? { ...defaults, start: '' }
}

export default function LayoutPage() {
  const { user } = useAuth()
  const [zone, setZone] = useState<ZoneParams>(initialZone)
  const [error, setError] = useState(readGuestSaveError)
  const [showZoneErrors, setShowZoneErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [baseline] = useState(() => JSON.stringify(initialZone()))
  const allowLeave = useUnsavedGuard(JSON.stringify(zone) !== baseline)
  useEffect(() => {
    saveGuestZone(zone)
  }, [zone])

  async function save() {
    const errors = validateZone(zone)
    if (Object.keys(errors).length > 0) {
      setShowZoneErrors(true)
      setError(errors.start ? `起始桩号：${errors.start}` : errors.work ? `作业区长度：${errors.work}` : '布置参数有误，请修正')
      return
    }
    saveGuestZone(zone)
    if (!user) {
      allowLeave()
      goToLogin({ save: true })
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await createZone({ zone })
      clearGuestZone()
      allowLeave()
      window.location.hash = `#/zones/${result.id}`
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败')
      setSaving(false)
    }
  }
  return (
    <div className="app-frame workbench-app-frame">
      <AppHeader trail={[{ label: '布置图' }]} />
      <div className="workbench-container">
        <RoadWorkbench
          params={zone}
          onChange={(next) => {
            setZone(next)
            setError('')
          }}
          onSave={() => void save()}
          saving={saving}
          saveLabel={user ? '保存布控区域' : '登录后保存'}
          saveError={error}
          showErrors={showZoneErrors}
          backHref="#/"
        />
      </div>
    </div>
  )
}
