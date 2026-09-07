import { useMemo, useRef, useState } from 'react'
import { buildLayout } from './layout/buildLayout'
import { buildDevices, type SignSpot } from './layout/devices'
import { RoadScene, type CameraApi, type CaptureFn } from './scene/RoadScene'
import { Hud } from './ui/Hud'
import { ViewBar } from './ui/ViewBar'
import { pngFilename, saveBlob } from './ui/export3d'

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

  async function handleExport() {
    if (!captureRef.current || exporting) return
    setExporting(true)
    showToast('正在截取 3D 画面…', 5000)
    try {
      const sceneBlob = await captureRef.current()
      saveBlob(sceneBlob, pngFilename(`${params.start || 'zone'}-3D`))
      showToast('已导出 3D 截图')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '截图失败')
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
