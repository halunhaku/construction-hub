import { useEffect, useState } from 'react'
import AppHeader from '../components/AppHeader'
import { loadGuestZone, saveGuestZone } from '../guestZone'
import type { ZoneParams } from '../types'
import { defaults } from '../zone/utils'
import { RoadWorkbench } from '../zone/3d/RoadWorkbench'

function initialZone(): ZoneParams {
  return loadGuestZone() ?? { ...defaults, start: '' }
}

export default function LayoutPage() {
  const [zone, setZone] = useState<ZoneParams>(initialZone)

  useEffect(() => {
    saveGuestZone(zone)
  }, [zone])

  return (
    <div className="app-frame workbench-app-frame">
      <AppHeader />
      <div className="workbench-container">
        <RoadWorkbench
          params={zone}
          onChange={setZone}
        />
      </div>
    </div>
  )
}
