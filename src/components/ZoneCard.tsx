import { useMemo, useRef, useState } from 'react'
import { Download, FileImage, FileText, Hand, Layers3, Maximize2, MousePointer2, Pencil, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { RoadDiagram } from '../zone/RoadDiagram'
import { buildZones, mirrorZones, stake, zoneExtent } from '../zone/utils'
import { buildExportPage, downloadJpg, downloadPng, downloadPdf, signSchedule, signScheduleDouble, snapshotDiagram } from '../zone/export'
import type { ZoneParams } from '../types'

export default function ZoneCard({ params, onEdit, onClear, workspace = false, clearLabel = '清除' }: {
  params: ZoneParams
  onEdit: () => void
  onClear: () => void
  workspace?: boolean
  /** 清除按钮文案：记录语境默认「清除」，独立布控区域传「删除布控」 */
  clearLabel?: string
}) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [flash, setFlash] = useState('')
  const [zoom, setZoom] = useState(1)

  const zones = useMemo(() => buildZones(params), [params])
  const total = useMemo(() => zones.reduce((s, z) => s + z.length, 0), [zones])
  // 双侧占路：镜像对向车道分区（与主方向桩号范围重合的作业区、180° 对称）
  const mirrored = useMemo(
    () => (params.doubleSide ? mirrorZones(zones, params.direction) : null),
    [params.doubleSide, params.direction, zones],
  )
  const extent = useMemo(() => zoneExtent(zones, mirrored ?? undefined), [mirrored, zones])
  const primaryDir = params.direction === 'down' ? '下行' : '上行'
  const mirrorDir = primaryDir === '上行' ? '下行' : '上行'
  // 分区表行：单侧仅主方向；双侧两车道合并（方向前缀）
  const zoneRows = useMemo(() => {
    if (!mirrored) return null
    return [
      ...zones.map((z) => ({ z, dir: primaryDir })),
      ...mirrored.map((z) => ({ z, dir: mirrorDir })),
    ]
  }, [mirrored, zones, primaryDir, mirrorDir])
  const signRows = useMemo(
    () => (params.doubleSide ? signScheduleDouble(zones, params.direction, params.speed) : signSchedule(zones, params.direction, params.speed)),
    [params.doubleSide, params.direction, params.speed, zones],
  )

  function exportDrawing(type: 'png' | 'jpg' | 'pdf') {
    const svg = diagramRef.current?.querySelector<SVGSVGElement>('.roadSvg')
    if (!svg) {
      setFlash('导出失败：布置图未就绪，请稍后重试')
      return
    }
    setExporting(true)
    const page = buildExportPage({
      ...snapshotDiagram(svg),
      params,
      zones,
      signRows,
      total,
      doubleSide: params.doubleSide,
    })
    const filename = `A4横向-作业区布置图-${params.start}.${type}`
    const finish = () => setExporting(false)
    if (type === 'pdf') downloadPdf(page, 3508, 2480, 842, 595, filename, finish)
    else if (type === 'jpg') downloadJpg(page, 3508, 2480, filename, finish)
    else downloadPng(page, 3508, 2480, filename, finish)
  }

  const meta = `起点 ${params.start} · ${params.direction === 'up' ? '上行' : '下行'} · ${
    params.workSide === 'median' ? '中央分隔带' : '路侧'
  }${params.doubleSide ? ' · 双侧占路' : ''} · ${params.doubleSide ? '单侧长度' : '总长'} ${total.toLocaleString()}m${
    params.doubleSide ? ` · 整体影响 ${stake(extent.min)}—${stake(extent.max)}（${extent.span.toLocaleString()}m）` : ''
  }`

  return (
    <div className={`card zone-card${workspace ? ' zone-workspace' : ''}`}>
      <div className="zone-head">
        <div>
          <h2>作业区布置图</h2>
          <p className="zone-meta">{meta}</p>
        </div>
        <div className="zone-head-actions">
          <button className="btn" onClick={onEdit}>
            <Pencil /> 编辑
          </button>
          <button className="btn btn-danger" onClick={onClear}>
            <Trash2 /> {clearLabel}
          </button>
        </div>
      </div>

      <div ref={diagramRef} className="diagram-stage">
        {workspace ? (
          <div className="diagram-tools" aria-label="图纸工具">
            <button className="active" aria-label="选择"><MousePointer2 /></button>
            <button aria-label="拖移"><Hand /></button>
            <button aria-label="放大" onClick={() => setZoom((value) => Math.min(1.5, value + .1))}><ZoomIn /></button>
            <button aria-label="缩小" onClick={() => setZoom((value) => Math.max(.7, value - .1))}><ZoomOut /></button>
            <button aria-label="适应画布" onClick={() => setZoom(1)}><Maximize2 /></button>
            <button aria-label="图层"><Layers3 /></button>
          </div>
        ) : null}
        <RoadDiagram
          zones={zones}
          direction={params.direction}
          workSide={params.workSide}
          doubleSide={params.doubleSide}
          zoom={zoom}
          coneGap={params.coneGap}
          speed={params.speed}
        />
      </div>

      <div className="zone-export">
        <button className="btn btn-primary" onClick={() => exportDrawing('png')} disabled={exporting}>
          <Download /> {exporting ? '生成中…' : '导出图纸'}
        </button>
        <button className="btn" onClick={() => exportDrawing('jpg')} disabled={exporting}>
          <FileImage /> JPG
        </button>
        <button className="btn" onClick={() => exportDrawing('pdf')} disabled={exporting}>
          <FileText /> PDF
        </button>
      </div>
      {flash && <div className="notice error">{flash}</div>}

      {!workspace ? <div className="zone-table">
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
            {(zoneRows ?? zones.map((z) => ({ z, dir: '' }))).map((row, i) => (
              <tr key={`${row.dir}-${row.z.key}`}>
                <td>{i + 1}</td>
                <td>
                  <span className="zone-name">
                    <i style={{ background: row.z.color }} />
                    {row.dir ? `${row.dir} · ` : ''}{row.z.name}
                  </span>
                </td>
                <td>{row.z.length}m</td>
                <td>{stake(row.z.start)}</td>
                <td>{stake(row.z.end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> : null}

      {!workspace ? <div className="zone-table">
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
      </div> : null}
      {!workspace ? <p className="tip">
        导出为 A4 横向图纸（300dpi）。图中锥桶数量仅表示布置走向，现场数量按设定的 1-4m 间距放样确定。正式实施前，请依据道路等级、设计速度、施工类型及当地现行规范复核。
      </p> : null}
    </div>
  )
}
