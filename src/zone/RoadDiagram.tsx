import type { ReactElement } from 'react'
import type { Direction, SignType, WorkSide, Zone, ZoneBlock } from './types'
import { mirrorZones, speedLimits, stake, warningSignOffsets } from './utils'

/* ── 子组件 ──────────────────────────────────────────── */

function SignFace({ type }: { type: SignType }) {
  const labels: Record<SignType, string> = {
    construction1600: '1600', construction800: '800', length: '长度', smart: '智驾',
    limit80: '80', limit60: '60', limit40: '40', laneLeft: '减道', laneRight: '减道',
    noOvertake: '禁超', arrowLeft: '←', arrowRight: '→',
    end60: '解60', end40: '解40', endOvertake: '解禁',
  }
  const ended = type === 'end60' || type === 'end40' || type === 'endOvertake'
  const limit = type === 'limit80' || type === 'limit60' || type === 'limit40'
  return (
    <g>
      <circle r="22" fill={ended ? '#f2f2f7' : '#fff'} stroke={ended ? '#8e8e93' : limit ? '#ff3b30' : '#ff9f0a'} strokeWidth="3" />
      <circle r="18" fill={limit ? '#fff' : ended ? '#f2f2f7' : '#fff9f0'} stroke="#e5e5ea" />
      <text y="3.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1d1d1f">{labels[type] || '标志'}</text>
    </g>
  )
}

function Cone({ x, y }: { x: number; y: number }) {
  return <circle className="cone" cx={x} cy={y} r="3" fill="#ff9500" stroke="#fff" strokeWidth="1" />
}

function ZoneBadge({ block, y, textY }: { block: ZoneBlock; y: number; textY: number }) {
  // 字号统一（横排/竖排一致），不随分区宽度变化
  const fontSize = 9
  // 框宽跟随文字：文字宽 + 两侧边距，且不超过分区色块宽（避免与相邻分区重叠）
  const textWidth = Array.from(block.name).length * fontSize
  const width = Math.max(38, Math.min(textWidth + 14, block.w - 2))
  return (
    <>
      <rect className="zoneBadgeRect" x={block.x + block.w / 2 - width / 2} y={y} width={width} height="22" rx="4" fill={block.color} opacity=".13" stroke={block.color} />
      <text className="zoneBadgeText" x={block.x + block.w / 2} y={textY} textAnchor="middle" fontSize={fontSize} fill={block.color}>{block.name}</text>
    </>
  )
}

function CompactZoneCallout({ block, x, y, anchorY }: {
  block: ZoneBlock
  x: number
  y: number
  anchorY: number
}) {
  const label = `${block.name} ${block.length}m`
  const width = Math.max(74, Array.from(label).length * 9 + 14)
  const blockCenter = block.x + block.w / 2
  return (
    <g>
      <line x1={blockCenter} y1={anchorY} x2={x} y2={y + 11} stroke={block.color} strokeWidth="1" opacity=".7" />
      <rect x={x - width / 2} y={y} width={width} height="22" rx="4" fill={block.color} opacity=".13" stroke={block.color} />
      <text x={x} y={y + 15} textAnchor="middle" fontSize="9" fill={block.color}>{label}</text>
    </g>
  )
}

function RoadSign({ x, y = 48, type }: { x: number; y?: number; type: SignType }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <SignFace type={type} />
    </g>
  )
}

/* ── 单车道渲染（单侧 / 双侧各车道共用） ────────────── */

interface LaneGeom {
  upper: boolean
  zoneY: number
  workBoundaryY: number
  guardrailY: number
  signY: number
  oppositeSignY: number
}

function Lane({ geom, blocks, coneGap, workSide, lane, speed }: {
  geom: LaneGeom
  blocks: ZoneBlock[]
  coneGap: number
  workSide: WorkSide
  lane: 'up' | 'down'
  speed: number
}): ReactElement {
  const { upper, zoneY, workBoundaryY, guardrailY, signY, oppositeSignY } = geom
  const zoneHeight = 53
  const along = (b: ZoneBlock, t: number) => b.x + (upper ? 1 - t : t) * b.w
  const closedSide = Math.sign(zoneY + zoneHeight / 2 - workBoundaryY)
  // 锥桶贴近施工边界线（锥桶缩小后 2px 微偏即可，视觉上贴线）
  const coneBoundaryY = workBoundaryY + closedSide * 2

  const cones: ReactElement[] = []
  blocks.forEach((b, bi) => {
    if (bi < 1 || bi > 4) return
    // 锥桶密度随锥桶间距参数变化；coneGap=4 时每个锥桶间距 24px
    const spacing = 24 * (coneGap / 4)
    const count = Math.max(3, Math.min(30, Math.round(b.w / Math.max(1, spacing))))
    for (let i = 0; i <= count; i++) {
      const t = i / count
      const yy = bi === 1
        ? guardrailY + (coneBoundaryY - guardrailY) * t
        : bi === 4
          ? coneBoundaryY + (guardrailY - coneBoundaryY) * t
          : coneBoundaryY
      cones.push(<Cone key={`${lane}-${bi}-${i}`} x={along(b, t)} y={yy} />)
    }
  })

  const warnLen = blocks[0]!.length
  const limits = speedLimits(speed)
  const warnTypes: Record<number, SignType> = {
    0: 'construction1600', 400: 'smart', 600: 'limit80', 800: 'construction800',
    1000: 'limit60', 1200: workSide === 'median' ? 'laneLeft' : 'laneRight',
  }
  warnTypes[600] = limits.first === 80 ? 'limit80' : 'limit60'
  warnTypes[1000] = limits.final === 60 ? 'limit60' : 'limit40'
  const warningX = (offset: number) =>
    warnLen > 0 && offset <= warnLen ? along(blocks[0]!, offset / warnLen) : null
  const wx1200 = warningX(1200)
  const wx0 = warningX(0)
  const warningSigns = warningSignOffsets
    .filter(offset => offset <= warnLen)
    .map(offset => ({ x: warningX(offset)!, type: warnTypes[offset]! }))
  const terminalEnd = upper ? blocks[5]!.x : blocks[5]!.x + blocks[5]!.w
  // 车道远端（桩号最小端）边界：上行取警告区起点，下行取终止区终点
  const laneRightEdge = upper ? blocks[0]!.x + blocks[0]!.w : blocks[5]!.x + blocks[5]!.w

  const zoneBadgeY = upper ? 397 : 8
  const zoneBadgeTextY = zoneBadgeY + 15
  const dimensionY = upper ? 365 : 46
  const dimensionTextY = upper ? 358 : 40
  const stakeTextY = upper ? 385 : 58
  const guideStartY = upper ? 110 : 38
  const guideEndY = upper ? 352 : 310
  // 双侧图按同一桩号轴缩放时，30m 下游/终止区仅约 10px。
  // 将其名称和长度移到外侧错层标注，避免两个尺寸值和分区名称叠在一起。
  const compactTail = blocks[4]!.w < 48 || blocks[5]!.w < 48
  const tailEdge = upper
    ? Math.min(blocks[4]!.x, blocks[5]!.x)
    : Math.max(blocks[4]!.x + blocks[4]!.w, blocks[5]!.x + blocks[5]!.w)
  const tailCalloutX = tailEdge + (upper ? -62 : 62)
  const compactCalloutY = upper ? [384, 407] : [0, 23]

  return (
    <g>
      {blocks.map((b, bi) => {
        const compact = compactTail && (bi === 4 || bi === 5)
        return (
          <g key={`${lane}-${b.key}`}>
            <rect className="zoneColor" x={b.x} y={zoneY} width={b.w} height={zoneHeight} fill={b.color} opacity=".75" />
            <line x1={b.x} y1={guideStartY} x2={b.x} y2={guideEndY} stroke="#c7c7cc" />
            <line x1={b.x} y1={dimensionY} x2={b.x + b.w} y2={dimensionY} stroke="#6e6e73" />
            <path d={`M${b.x} ${dimensionY}l8 -4v8zM${b.x + b.w} ${dimensionY}l-8 -4v8z`} fill="#6e6e73" />
            {!compact ? (
              <text className="lengthLabel" x={b.x + b.w / 2} y={dimensionTextY} textAnchor="middle" fontSize="11" fontWeight="700" fill="#3a3a3c">{b.length}m</text>
            ) : null}
            {/* 窄分区（双侧占路时下游/终止区约 10px）省略桩号，避免与相邻桩号重叠 */}
            {b.w >= 48 ? (
              <text className="stakeLabel" x={b.x} y={stakeTextY} textAnchor="middle" fontSize="10" fill="#6e6e73">{stake(upper ? b.end : b.start)}</text>
            ) : null}
            {!compact ? <ZoneBadge block={b} y={zoneBadgeY} textY={zoneBadgeTextY} /> : null}
          </g>
        )
      })}
      {compactTail ? (
        <>
          <CompactZoneCallout block={blocks[4]!} x={tailCalloutX} y={compactCalloutY[0]!} anchorY={dimensionY} />
          <CompactZoneCallout block={blocks[5]!} x={tailCalloutX} y={compactCalloutY[1]!} anchorY={dimensionY} />
        </>
      ) : null}
      <line x1={laneRightEdge} y1={guideStartY} x2={laneRightEdge} y2={upper ? 391 : 66} stroke="#c7c7cc" />
      <text className="stakeLabel" x={laneRightEdge} y={stakeTextY} textAnchor="middle" fontSize="10" fill="#6e6e73">
        {stake(upper ? blocks[0]!.start : blocks[5]!.end)}
      </text>
      {cones}
      {/* 缓冲区入口：作业区长度标志；导向标志仅在下方位置表中列示 */}
      <RoadSign x={along(blocks[2]!, 0)} y={signY} type="length" />
      {warningSigns.map(s => (
        <RoadSign key={s.type} x={s.x} y={signY} type={s.type} />
      ))}
      {wx1200 != null && <RoadSign x={wx1200} y={oppositeSignY} type="noOvertake" />}
      {wx0 != null && <RoadSign x={wx0} y={oppositeSignY} type="construction1600" />}
      <RoadSign x={terminalEnd} y={signY} type={limits.final === 60 ? 'end60' : 'end40'} />
      <RoadSign x={terminalEnd} y={oppositeSignY} type="endOvertake" />
    </g>
  )
}

/* ── 主组件 ──────────────────────────────────────────── */

export function RoadDiagram({ zones, direction, workSide, doubleSide = false, zoom, coneGap, speed }: {
  zones: Zone[]
  direction: Direction
  workSide: WorkSide
  /** 双侧占路：上/下行同时布控（仅中央分隔带施工可用），两车道 180° 对称 */
  doubleSide?: boolean
  zoom: number
  coneGap: number
  speed: number
}) {
  const upper = direction === 'up'
  const total = zones.reduce((s, z) => s + z.length, 0)
  const left = 68

  // 每条车道独立几何：分区条位置/封闭边界/护栏/标志位
  let lanes: { geom: LaneGeom; blocks: ZoneBlock[]; lane: 'up' | 'down' }[]
  let roadRight: number

  if (doubleSide) {
    // 双侧：两车道共用同一桩号轴（作业区桩号范围重合），车道间等比例缩放
    const mirrored = mirrorZones(zones, direction)
    const all = [...zones, ...mirrored]
    let minStake = Infinity
    let maxStake = -Infinity
    for (const z of all) {
      minStake = Math.min(minStake, z.start, z.end)
      maxStake = Math.max(maxStake, z.start, z.end)
    }
    const span = Math.max(1, maxStake - minStake)
    const width = 1090 * zoom * (span / total)
    const ppm = width / span
    const xOf = (m: number) => left + (maxStake - m) * ppm
    const toBlocks = (laneZones: Zone[]): ZoneBlock[] =>
      laneZones.map(z => ({ ...z, x: xOf(Math.max(z.start, z.end)), w: Math.abs(z.end - z.start) * ppm }))
    const geomFor = (up: boolean): LaneGeom => ({
      upper: up,
      zoneY: up ? 133 : 204,
      workBoundaryY: up ? 133 : 257,
      guardrailY: up ? 186 : 204,
      signY: up ? 186 : 204,
      oppositeSignY: up ? 80 : 310,
    })
    lanes = [
      { geom: geomFor(upper), blocks: toBlocks(zones), lane: upper ? 'up' : 'down' },
      { geom: geomFor(!upper), blocks: toBlocks(mirrored), lane: upper ? 'down' : 'up' },
    ]
    roadRight = left + width
  } else {
    // 单侧：保持原有等比例布局
    const width = 1090 * zoom
    // 色块最小宽度 62px：保证 5 字 × 9px 字号 + 框边距（45+14=59）在任何参数下都能完整放下，字号恒为 9 不缩水
    const widths = zones.map(z => Math.max(62, z.length / total * width))
    roadRight = left + widths.reduce((s, w) => s + w, 0)
    let cursor = upper ? roadRight : left
    const blocks: ZoneBlock[] = zones.map((z, i) => {
      const w = widths[i]!
      const bx = upper ? cursor - w : cursor
      cursor += upper ? -w : w
      return { ...z, x: bx, w }
    })
    const zoneY = upper ? (workSide === 'median' ? 133 : 80) : (workSide === 'median' ? 204 : 257)
    const roadsideGuardrailY = upper ? 80 : 310
    const medianGuardrailY = upper ? 186 : 204
    const guardrailY = workSide === 'median' ? medianGuardrailY : roadsideGuardrailY
    const workBoundaryY = upper ? 133 : 257
    const signY = workSide === 'median' ? medianGuardrailY : roadsideGuardrailY
    const oppositeSignY = workSide === 'median' ? roadsideGuardrailY : medianGuardrailY
    lanes = [{
      geom: { upper, zoneY, workBoundaryY, guardrailY, signY, oppositeSignY },
      blocks,
      lane: upper ? 'up' : 'down',
    }]
  }

  const svgWidth = Math.max(1225, roadRight + 80)
  const minWidth = Math.max(1120, roadRight + 60)
  const viewTop = 0
  const viewBottom = 430

  return (
    <div className="diagramScroll">
      <svg
        className="roadSvg"
        viewBox={`0 ${viewTop} ${svgWidth} ${viewBottom - viewTop}`}
        style={{ minWidth }}
        role="img"
        aria-label="高速公路作业区布置图"
      >
        <rect x="0" y={viewTop} width="100%" height={viewBottom - viewTop} fill="#fafafa" />
        <rect x="30" y="80" width="100%" height="106" fill="#3a3a3c" />
        <rect x="30" y="204" width="100%" height="106" fill="#3a3a3c" />
        <rect x="30" y="186" width="100%" height="18" fill="#8e8e93" />
        <line x1="30" y1="186" x2="100%" y2="186" stroke="#d1d1d6" strokeWidth="2" />
        <line x1="30" y1="204" x2="100%" y2="204" stroke="#d1d1d6" strokeWidth="2" />
        <path d={`M30 195H${svgWidth}`} stroke="#aeaeb2" strokeWidth="3" strokeDasharray="5 8" />
        {[133, 257].map(y => (
          <line key={y} x1="30" y1={y} x2="100%" y2={y} stroke="#f2f2f7" strokeWidth="2" strokeDasharray="20 18" opacity=".8" />
        ))}
        {[80, 310].map(y => (
          <g key={`rail-${y}`}>
            <line x1="30" y1={y} x2="100%" y2={y} stroke="#d1d1d6" strokeWidth="6" />
            <line x1="30" y1={y} x2="100%" y2={y} stroke="#8e8e93" strokeWidth="2" />
            {Array.from({ length: 36 }, (_, i) => (
              <line key={i} x1={45 + i * 36} y1={y - 5} x2={45 + i * 36} y2={y + 5} stroke="#8e8e93" strokeWidth="2" />
            ))}
          </g>
        ))}
        {lanes.map(l => (
          <Lane key={l.lane} geom={l.geom} blocks={l.blocks} coneGap={coneGap} workSide={workSide} lane={l.lane} speed={speed} />
        ))}
        <text x="48" y="137" fill="#fff" fontSize="12" fontWeight="700">上行 ←</text>
        <text x="48" y="261" fill="#fff" fontSize="12" fontWeight="700">下行 →</text>
      </svg>
    </div>
  )
}
