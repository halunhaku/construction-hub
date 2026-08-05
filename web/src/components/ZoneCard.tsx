import { useMemo, useRef, useState } from 'react'
import { RoadDiagram } from '../zone/RoadDiagram'
import { buildZones, stake } from '../zone/utils'
import { buildExportPage, downloadJpg, downloadPng, downloadPdf, signSchedule } from '../zone/export'
import type { ZoneParams } from '../types'

export default function ZoneCard({ params, onEdit, onClear }: {
  params: ZoneParams
  onEdit: () => void
  onClear: () => void
}) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [flash, setFlash] = useState('')

  const zones = useMemo(() => buildZones(params), [params])
  const total = useMemo(() => zones.reduce((s, z) => s + z.length, 0), [zones])
  const signRows = useMemo(() => signSchedule(zones, params.direction), [zones, params.direction])

  function exportDrawing(type: 'png' | 'jpg' | 'pdf') {
    const svg = diagramRef.current?.querySelector('.roadSvg')
    const viewBox = svg?.getAttribute('viewBox')
    if (!svg || !viewBox) {
      setFlash('导出失败：布置图未就绪，请稍后重试')
      return
    }
    setExporting(true)
    const page = buildExportPage({
      svgViewBox: viewBox,
      svgInner: svg.innerHTML,
      params,
      zones,
      signRows,
      total,
    })
    const filename = `A4横向-作业区布置图-${params.start}.${type}`
    const finish = () => setExporting(false)
    if (type === 'pdf') downloadPdf(page, 3508, 2480, 842, 595, filename, finish)
    else if (type === 'jpg') downloadJpg(page, 3508, 2480, filename, finish)
    else downloadPng(page, 3508, 2480, filename, finish)
  }

  const meta = `起点 ${params.start} · ${params.direction === 'up' ? '上行' : '下行'} · ${
    params.workSide === 'median' ? '中央分隔带' : '路侧'
  } · 总长 ${total.toLocaleString()}m`

  return (
    <div className="card zone-card">
      <div className="zone-head">
        <div>
          <h2>作业区布置图</h2>
          <p className="zone-meta">{meta}</p>
        </div>
        <div className="zone-head-actions">
          <button className="btn" onClick={onEdit}>
            编辑
          </button>
          <button className="btn btn-danger" onClick={onClear}>
            清除
          </button>
        </div>
      </div>

      <div ref={diagramRef}>
        <RoadDiagram
          zones={zones}
          direction={params.direction}
          workSide={params.workSide}
          zoom={1}
          coneGap={params.coneGap}
        />
      </div>

      <div className="zone-export">
        <button className="btn btn-primary" onClick={() => exportDrawing('png')} disabled={exporting}>
          {exporting ? '生成中…' : '⬇ 导出图纸'}
        </button>
        <button className="btn" onClick={() => exportDrawing('jpg')} disabled={exporting}>
          JPG
        </button>
        <button className="btn" onClick={() => exportDrawing('pdf')} disabled={exporting}>
          PDF
        </button>
      </div>
      {flash && <div className="notice error">{flash}</div>}

      <div className="zone-table">
        <h3>各区域起止点</h3>
        <table>
          <thead>
            <tr>
              <th>序号</th>
              <th>分区名称</th>
              <th>长度</th>
              <th>起点桩号</th>
              <th>终点桩号</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z, i) => (
              <tr key={z.key}>
                <td>{i + 1}</td>
                <td>
                  <span className="zone-name">
                    <i style={{ background: z.color }} />
                    {z.name}
                  </span>
                </td>
                <td>{z.length}m</td>
                <td>{stake(z.start)}</td>
                <td>{stake(z.end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="zone-table">
        <h3>各标志牌位置</h3>
        <table>
          <thead>
            <tr>
              <th>序号</th>
              <th>标志牌名称</th>
              <th>设置桩号</th>
              <th>位置说明</th>
            </tr>
          </thead>
          <tbody>
            {signRows.map((row) => (
              <tr key={`${row[0]}-${row[1]}`}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tip">
        导出为 A4 横向图纸（300dpi）。正式实施前，请依据道路等级、设计速度、施工类型及当地现行规范复核。
      </p>
    </div>
  )
}
