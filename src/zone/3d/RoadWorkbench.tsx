import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildLayout } from './layout/buildLayout'
import { buildDevices, type SignSpot } from './layout/devices'
import { RoadScene, type CameraApi, type CaptureFn } from './scene/RoadScene'
import { Hud } from './ui/Hud'
import { ParamPanel } from './ui/ParamPanel'
import { PlanPanel } from './ui/PlanPanel'
import { ViewBar } from './ui/ViewBar'
import { pngFilename, saveBlob } from './ui/export3d'


import type { Params } from '../types'
import { stake } from '../utils'

export interface RoadWorkbenchProps {
  params: Params
  onChange: (next: Params) => void
  onSave?: () => void
  saving?: boolean
  saveLabel?: string
  saveError?: string
  showErrors?: boolean
  backHref?: string
  headerExtra?: ReactNode
}

export function RoadWorkbench({
  params,
  onChange,
  onSave,
  saving = false,
  saveLabel,
  saveError,
  showErrors = false,
  backHref,
  headerExtra,
}: RoadWorkbenchProps) {
  const [selected, setSelected] = useState<SignSpot | null>(null)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarFolded, setSidebarFolded] = useState(false)
  const [planFolded, setPlanFolded] = useState(false)



  const toastTimerRef = useRef<number | null>(null)
  const captureRef = useRef<CaptureFn | null>(null)
  const cameraRef = useRef<CameraApi | null>(null)
  const appRef = useRef<HTMLDivElement>(null)
  const planRef = useRef<HTMLDivElement>(null)

  const layout = useMemo(() => buildLayout(params, 'schematic'), [params])
  const devices = useMemo(() => buildDevices(layout, params), [layout, params])

  function showToast(msg: string, duration = 3000) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, duration)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function handleExport() {
    if (!captureRef.current || exporting) return
    setExporting(true)
    showToast('正在截取 3D 画面…', 5000)
    try {
      const scene = await captureRef.current()
      const work = layout.segments[3]
      const label = `${work ? stake(work.startStake) : 'zone'}-3D`
      saveBlob(scene, pngFilename(label))
      showToast('已导出 3D 截图')
    } catch (err) {
      console.error('export png failed', err)
      showToast('截图失败，请重试')
    } finally {
      setExporting(false)
    }
  }


  return (
    <div className={`app-workbench${sidebarFolded ? ' sidebar-collapsed' : ''}${onSave ? ' workbench-create' : ''}`} ref={appRef}>
      <ParamPanel
        params={params}
        onChange={onChange}
        layout={layout}
        folded={sidebarFolded}
        onToggleFold={() => setSidebarFolded((f) => !f)}
        onSave={onSave}
        saving={saving}
        saveLabel={saveLabel}
        saveError={saveError}
        showErrors={showErrors}
        backHref={backHref}
        headerExtra={headerExtra}
        title={onSave ? '新建布控' : undefined}
        subtitle={onSave ? '核对布置图后保存到布控列表' : undefined}
      />

      <main className="stage-card">
        <RoadScene
          layout={layout}
          params={params}
          devices={devices}
          selectedId={selected?.id ?? null}
          onSelectSign={setSelected}
          onMiss={() => setSelected(null)}
          captureRef={captureRef}
          cameraRef={cameraRef}
        />
        <ViewBar
          onExport={handleExport}
          exporting={exporting}
          onRotate={(d) => cameraRef.current?.rotate(d)}
          onZoom={(f) => cameraRef.current?.zoom(f)}
          onReset={() => cameraRef.current?.reset()}
        />
        <Hud layout={layout} selected={selected} onClear={() => setSelected(null)} />
        {toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null}
      </main>
      <PlanPanel
        params={params}
        layout={layout}
        folded={planFolded}
        onToggleFold={() => setPlanFolded((f) => !f)}
        hostRef={planRef}
      />
    </div>
  )
}
