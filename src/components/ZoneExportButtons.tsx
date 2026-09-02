import { useState } from 'react'
import { Download, FileImage, FileText } from 'lucide-react'
import { buildZones } from '../zone/utils'
import { buildExportPages, downloadImages, downloadPdf, signSchedule, signScheduleDouble, snapshotDiagram } from '../zone/export'
import { validateZone } from '../zone/validation'
import type { ZoneParams } from '../types'

export default function ZoneExportButtons({
  params,
  getSvgs,
  onInvalid,
}: {
  params: ZoneParams
  getSvgs: () => SVGSVGElement[]
  onInvalid?: (message: string) => void
}) {
  const [exporting, setExporting] = useState<'png' | 'jpg' | 'pdf' | null>(null)
  const [flash, setFlash] = useState('')

  function exportDrawing(type: 'png' | 'jpg' | 'pdf') {
    const errors = validateZone(params)
    const first = Object.entries(errors)[0]
    if (first) {
      const message = `${first[0] === 'start' ? '起始桩号' : first[0] === 'work' ? '作业区长度' : '布置参数'}：${first[1]}`
      setFlash(message)
      onInvalid?.(message)
      return
    }
    const svgs = getSvgs()
    if (svgs.length === 0) {
      const message = '导出失败：布置图未就绪，请稍后重试'
      setFlash(message)
      onInvalid?.(message)
      return
    }
    setFlash('')
    setExporting(type)
    const zones = buildZones(params)
    const total = zones.reduce((sum, zone) => sum + zone.length, 0)
    const signRows = params.doubleSide
      ? signScheduleDouble(zones, params.direction, params.speed)
      : signSchedule(zones, params.direction, params.speed)
    const { diagramPages, tablePage } = buildExportPages({
      diagrams: svgs.map((svg) => ({
        ...snapshotDiagram(svg),
        caption: !params.doubleSide ? '' : svg.getAttribute('data-direction') === 'down' ? '下行' : '上行',
      })),
      params,
      zones,
      signRows,
      total,
      doubleSide: params.doubleSide,
      orientation: 'portrait',
    })
    const pw = 2480
    const ph = 3508
    const finish = () => setExporting(null)
    const stem = `A4纵向-作业区`
    const pages = [...diagramPages, tablePage]
    if (type === 'pdf') {
      downloadPdf(pages, pw, ph, 210, 297, `${stem}布置-${params.start}.pdf`, finish)
    } else {
      const ext = type === 'jpg' ? 'jpg' : 'png'
      const files = [
        ...diagramPages.map((page, index) => {
          const caption = params.doubleSide ? (index === 0 ? '布置图-上行' : '布置图-下行') : '布置图'
          return { page, filename: `${stem}${caption}-${params.start}.${ext}` }
        }),
        { page: tablePage, filename: `${stem}布置表-${params.start}.${ext}` },
      ]
      downloadImages(files, pw, ph, type === 'jpg' ? 'image/jpeg' : 'image/png', finish)
    }
  }

  return (
    <>
      <div className="zone-export">
        <button type="button" className="btn btn-primary" onClick={() => exportDrawing('png')} disabled={Boolean(exporting)}>
          <Download /> {exporting === 'png' ? '生成 PNG…' : '导出 PNG'}
        </button>
        <button type="button" className="btn" onClick={() => exportDrawing('jpg')} disabled={Boolean(exporting)}>
          <FileImage /> {exporting === 'jpg' ? '生成 JPG…' : '导出 JPG'}
        </button>
        <button type="button" className="btn" onClick={() => exportDrawing('pdf')} disabled={Boolean(exporting)}>
          <FileText /> {exporting === 'pdf' ? '生成 PDF…' : '导出 PDF'}
        </button>
      </div>
      {flash ? <div className="notice error">{flash}</div> : null}
    </>
  )
}
