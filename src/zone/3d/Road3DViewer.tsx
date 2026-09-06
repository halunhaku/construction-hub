import { useMemo, useRef, useState } from 'react'
import { buildLayout } from './layout/buildLayout'
import { buildDevices, type SignSpot } from './layout/devices'
import { RoadScene, type CameraApi, type CaptureFn } from './scene/RoadScene'
import { Hud } from './ui/Hud'
import { ViewBar, type ExportKind } from './ui/ViewBar'
import { overlayUiOnScene, pngFilename, saveBlob } from './ui/export3d'
import type { Params } from '../types'

export interface Road3DViewerProps {
  params: Params
  height?: number | string
  className?: string
  showHud?: boolean
  showControls?: boolean
}

export function Road3DViewer({
  params,
  height = 520,
  className = '',
  showHud = true,
  showControls = true,
}: Road3DViewerProps) {
  const [selected, setSelected] = useState<SignSpot | null>(null)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const captureRef = useRef<CaptureFn | null>(null)
  const cameraRef = useRef<CameraApi | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  const layout = useMemo(() => buildLayout(params, 'schematic'), [params])
  const devices = useMemo(() => buildDevices(layout, params), [layout, params])

  function showToast(msg: string, duration = 2800) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, duration)
  }

  async function handleExport(kind: ExportKind) {
    if (!captureRef.current || exporting) return
    setExporting(true)
    showToast('正在渲染导出图片…', 5000)
    try {
      const sceneBlob = await captureRef.current()
      if (kind === 'scene') {
        saveBlob(sceneBlob, pngFilename(`${params.start || 'zone'}-3D全景`))
        showToast('3D 全景渲染图已导出')
      } else if (kind === 'ui' && viewerRef.current) {
        const canvas = viewerRef.current.querySelector('canvas')
        if (!canvas) throw new Error('未找到画布')
        const uiBlob = await overlayUiOnScene(sceneBlob, viewerRef.current, canvas)
        saveBlob(uiBlob, pngFilename(`${params.start || 'zone'}-3D界面`))
        showToast('含 UI 界面图已导出')
      } else {
        // 默认导出 3D 渲染
        saveBlob(sceneBlob, pngFilename(`${params.start || 'zone'}-3D`))
        showToast('3D 图像已导出')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      ref={viewerRef}
      className={`road-3d-viewer ${className}`}
      style={{ position: 'relative', width: '100%', height, minHeight: 360, borderRadius: 16, overflow: 'hidden' }}
    >
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

      {showControls && (
        <ViewBar
          showPlan={false}
          onExport={handleExport}
          exporting={exporting}
          onRotate={(delta) => cameraRef.current?.rotate(delta)}
          onZoom={(factor) => cameraRef.current?.zoom(factor)}
          onReset={() => cameraRef.current?.reset()}
        />
      )}

      {showHud && (
        <Hud
          layout={layout}
          selected={selected}
          onClear={() => setSelected(null)}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  )
}
