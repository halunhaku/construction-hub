import { useMemo, useRef, useState } from 'react'
import { Download, FileImage, FileText, Hand, Layers3, Maximize2, MousePointer2, Pencil, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { ZoneDiagrams } from '../zone/RoadDiagram'
import { buildZones, mirrorZones, stake, zoneExtent } from '../zone/utils'
import { buildExportPages, downloadImages, downloadPdf, signSchedule, signScheduleDouble, snapshotDiagram } from '../zone/export'
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
    const svgs = [...(diagramRef.current?.querySelectorAll<SVGSVGElement>('.roadSvg') ?? [])]
    if (svgs.length === 0) {
      setFlash('导出失败：布置图未就绪，请稍后重试')
      return
    }
    setExporting(true)
    // 规程图式为纵向。单侧：布置图 + 一览表；双侧：上行图 + 下行图 + 一览表
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
    const finish = () => setExporting(false)
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

      <div className="zone-card-body">
        <div ref={diagramRef} className="diagram-stage zone-stage-vertical">
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
          <ZoneDiagrams
            zones={zones}
            direction={params.direction}
            workSide={params.workSide}
            doubleSide={params.doubleSide}
            zoom={zoom}
            coneGap={params.coneGap}
            speed={params.speed}
            vertical
          />
        </div>

        {!workspace ? <div className="zone-tables">
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
            导出为 A4 纵向图纸（300dpi）：单侧为布置图 + 一览表；双侧占路为上行图、下行图、一览表共三页。每张布置图角落带双侧总平面缩略图（本方向高亮）。图面按《公路养护安全作业规程》JTG H30—2015 示意。图中锥桶数量仅表示布置走向，现场数量按设定的 1-4m 间距放样确定。正式实施前，请依据道路等级、设计速度、施工类型及当地现行规范复核。
          </p>
        </div> : null}
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
    </div>
  )
}
