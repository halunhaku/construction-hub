import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildLayout } from './layout/buildLayout'
import { buildDevices, type SignSpot } from './layout/devices'
import { RoadScene, type CameraApi, type CaptureFn } from './scene/RoadScene'
import { Hud } from './ui/Hud'
import { ParamPanel } from './ui/ParamPanel'
import { PlanPanel } from './ui/PlanPanel'
import { ViewBar, type ExportKind } from './ui/ViewBar'
import { overlayUiOnScene, pngFilename, saveBlob } from './ui/export3d'
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

  async function handleExport(kind: ExportKind) {
    if (!captureRef.current || exporting) return
    setExporting(true)
    showToast('正在生成渲染图片…', 5000)
    try {
      const scene = await captureRef.current()
      const app = appRef.current
      const sceneCanvas = app?.querySelector('.stage-card canvas') as HTMLCanvasElement | null
      const work = layout.segments[3]
      const label = `${work ? stake(work.startStake) : 'zone'}-3D`

      if (kind === 'ui' && app && sceneCanvas) {
        const uiBlob = await overlayUiOnScene(scene, app, sceneCanvas)
        saveBlob(uiBlob, pngFilename(`${label}-含界面`))
        showToast('已导出含 UI 界面截图 (PNG)')
      } else {
        saveBlob(scene, pngFilename(label))
        showToast('已导出 3D 全景渲染图 (PNG)')
      }
    } catch (err) {
      console.error('export png failed', err)
      showToast('导出图片失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={`app-workbench ${sidebarFolded ? 'sidebar-collapsed' : ''}`} ref={appRef}>
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
