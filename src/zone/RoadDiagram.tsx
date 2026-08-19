import { useId, type ReactElement } from 'react'
import type { Direction, SignType, WorkSide, Zone } from './types'
import { mirrorZones, speedLimits, stake, warningSignOffsets, zoneExtent } from './utils'
import { SIGNS } from '../signs'

/** SignType → 标志牌 SVG 标题映射（与 src/signs.ts 的 SIGNS.title 一一对应） */
const SIGN_BY_TYPE: Partial<Record<SignType, string>> = {
  construction1600: '前方施工 1600 米',
  construction800: '前方施工 800 米',
  length: '作业区长度',
  smart: '关闭智驾',
  limit80: '限速 80',
  limit60: '限速 60',
  limit40: '限速 40',
  laneLeft: '左侧车道并入右侧',
  laneRight: '右侧车道并入左侧',
  noOvertake: '禁止超车',
  end60: '解除限速 60',
  end40: '解除限速 40',
  endOvertake: '解除禁止超车',
  arrowRight: '右向导向',
  arrowLeft: '左向导向',
  fence: '路栏',
}

const ZONE_LETTER: Record<string, string> = {
  warning: 'S',
  taper: 'L₁',
  buffer: 'H',
  work: 'G',
  downstream: 'L₂',
  terminal: 'Z',
}

/** 按规程图示意比例，不按真实米数拉长，否则 1600m 警告区会把图纸撑得只看得见终止区 */
const SCHEME_PX: Record<string, number> = {
  warning: 500,
  taper: 76,
  buffer: 66,
  work: 176,
  downstream: 74,
  terminal: 74,
}

const C = {
  road: '#6DB5D1',
  shoulder: '#D4D4D4',
  median: '#C5C5C5',
  hatch: '#2F2F2F',
  cone: '#D42128',
  post: '#1A1A1A',
  mark: '#FFFFFF',
  dim: '#222222',
  muted: '#5A5A5A',
  bg: '#FFFFFF',
}

const LANE = 48
const SHOULDER = 30
const MEDIAN = 26
const SIGN_COL = 86
const DIM_COL = 82
const GUTTER = 14
const PAD = 24
const SIGN_SIZE = 42

const OVERVIEW_W = 124
const OVERVIEW_H = 276
const OVERVIEW_GAP = 10

/** 双侧占路总平面缩略图：上下行合画，本方向高亮，对向淡显 */
function OverviewSchematic({
  x,
  y,
  upZones,
  downZones,
  focus,
  hatchId,
}: {
  x: number
  y: number
  upZones: Zone[]
  downZones: Zone[]
  focus: Direction
  hatchId: string
}) {
  const extent = zoneExtent(upZones, downZones)
  const titleH = 18
  const footH = 16
  const innerY = y + titleH + 4
  const innerH = OVERVIEW_H - titleH - footH - 10
  const sh = 6
  const lane = 11
  const med = 8
  const roadW = sh + lane * 2 + med + lane * 2 + sh
  const ox = x + (OVERVIEW_W - roadW) / 2
  const yOf = (meters: number) => innerY + innerH - ((meters - extent.min) / Math.max(1, extent.span)) * innerH
  const band = (a: number, b: number) => {
    const y0 = Math.min(yOf(a), yOf(b))
    return { y: y0, h: Math.max(1.2, Math.abs(yOf(b) - yOf(a))) }
  }
  const down = { sh0: 0, open0: sh, open1: sh + lane, closed0: sh + lane, closed1: sh + lane * 2 }
  const up = {
    closed0: sh + lane * 2 + med,
    closed1: sh + lane * 2 + med + lane,
    open0: sh + lane * 2 + med + lane,
    open1: sh + lane * 2 + med + lane * 2,
    sh1: sh + lane * 2 + med + lane * 2,
  }

  const paintLane = (laneZones: Zone[], closed0: number, closed1: number) =>
    laneZones.map((zone) => {
      const box = band(zone.start, zone.end)
      const work = zone.key === 'work'
      return (
        <g key={`${zone.key}-${closed0}`}>
          <rect x={ox + closed0} y={box.y} width={closed1 - closed0} height={box.h} fill={work ? '#fff' : zone.color} opacity={work ? 1 : 0.72} />
          {work ? <rect x={ox + closed0} y={box.y} width={closed1 - closed0} height={box.h} fill={`url(#${hatchId})`} /> : null}
        </g>
      )
    })

  const arrow = (cx: number, cy: number, dir: 1 | -1) => {
    const tip = cy + dir * -7
    return `${cx},${tip} ${cx - 4},${tip + dir * 9} ${cx + 4},${tip + dir * 9}`
  }

  return (
    <g>
      <rect x={x} y={y} width={OVERVIEW_W} height={OVERVIEW_H} rx="3" fill="#f8fafc" stroke="#1d1d1f" strokeWidth="0.8" />
      <text x={x + 8} y={y + 14} fontSize="10" fontWeight="700" fill="#1d1d1f">总平面</text>
      <text x={x + OVERVIEW_W - 8} y={y + 14} textAnchor="end" fontSize="9" fill="#007aff">本图：{focus === 'up' ? '上行' : '下行'}</text>
      <rect x={ox} y={innerY} width={roadW} height={innerH} fill={C.shoulder} />
      <rect x={ox + down.open0} y={innerY} width={lane} height={innerH} fill={C.road} />
      <rect x={ox + down.closed0} y={innerY} width={lane} height={innerH} fill={C.road} />
      <rect x={ox + sh + lane * 2} y={innerY} width={med} height={innerH} fill={C.median} />
      <rect x={ox + up.closed0} y={innerY} width={lane} height={innerH} fill={C.road} />
      <rect x={ox + up.open0} y={innerY} width={lane} height={innerH} fill={C.road} />
      <g opacity={focus === 'down' ? 1 : 0.32}>{paintLane(downZones, down.closed0, down.closed1)}</g>
      <g opacity={focus === 'up' ? 1 : 0.32}>{paintLane(upZones, up.closed0, up.closed1)}</g>
      <rect
        x={ox + (focus === 'down' ? 0 : sh + lane * 2 + med) - 1.5}
        y={innerY - 1.5}
        width={sh + lane * 2 + 3}
        height={innerH + 3}
        fill="none"
        stroke="#007aff"
        strokeWidth="1.6"
      />
      <polygon points={arrow(ox + (down.open0 + down.open1) / 2, innerY + innerH * 0.22, -1)} fill={focus === 'down' ? '#007aff' : '#fff'} opacity={focus === 'down' ? 1 : 0.45} />
      <polygon points={arrow(ox + (up.open0 + up.open1) / 2, innerY + innerH * 0.78, 1)} fill={focus === 'up' ? '#007aff' : '#fff'} opacity={focus === 'up' ? 1 : 0.45} />
      <text x={ox + sh + lane} y={y + OVERVIEW_H - 6} textAnchor="middle" fontSize="9" fontWeight={focus === 'down' ? '700' : '400'} fill={focus === 'down' ? '#007aff' : '#3a3a3c'}>
        {focus === 'down' ? '下行·本图' : '下行'}
      </text>
      <text x={ox + sh + lane * 3 + med} y={y + OVERVIEW_H - 6} textAnchor="middle" fontSize="9" fontWeight={focus === 'up' ? '700' : '400'} fill={focus === 'up' ? '#007aff' : '#3a3a3c'}>
        {focus === 'up' ? '上行·本图' : '上行'}
      </text>
    </g>
  )
}

function SignFace({ type, size = SIGN_SIZE }: { type: SignType; size?: number }) {
  const signTitle = SIGN_BY_TYPE[type]
  const sign = signTitle ? SIGNS.find((item) => item.title === signTitle) : undefined
  const half = size / 2
  if (sign) {
    return (
      <g transform={`translate(${-half} ${-half})`}>
        <svg x="0" y="0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" dangerouslySetInnerHTML={{ __html: sign.svg }} />
      </g>
    )
  }
  return (
    <g>
      <circle r={half - 1} fill="#fff" stroke="#e08a1e" strokeWidth="2.5" />
      <text y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1d1d1f">标志</text>
    </g>
  )
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface SignMark {
  along: number
  type: SignType
  side: 'work' | 'opp'
  label?: string
  /** 牌面沿道路方向的位置；与 along 不同时，引线为斜线（同一桩号多块牌） */
  signAlong?: number
  shift?: number
  /** 黑块落在路面上（锥桶与护栏之间的封闭车道），而不是路肩 */
  onRoad?: boolean
}

interface Carriage {
  dir: Direction
  zones: Zone[]
  travel: 1 | -1
  inner0: number
  inner1: number
  outer0: number
  outer1: number
  laneLine: number
  closed0: number
  closed1: number
  open0: number
  open1: number
  openMid: number
  closedMid: number
  innerEdge: number
  outerEdge: number
}

function zonePixels(zones: Zone[], zoom: number): number[] {
  return zones.map((zone) => (SCHEME_PX[zone.key] ?? 54) * zoom)
}

function dotsAlong(
  a0: number,
  a1: number,
  c0: number,
  c1: number,
  spacing: number,
): { along: number; across: number }[] {
  const da = a1 - a0
  const dc = c1 - c0
  const len = Math.hypot(da, dc)
  const count = Math.max(3, Math.round(len / Math.max(8, spacing)))
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count
    return { along: a0 + da * t, across: c0 + dc * t }
  })
}

export function RoadDiagram({
  zones,
  direction,
  workSide,
  doubleSide = false,
  zoom,
  coneGap,
  speed,
  vertical = false,
  crossSectionFocus,
  overview,
  framed = true,
}: {
  zones: Zone[]
  direction: Direction
  workSide: WorkSide
  doubleSide?: boolean
  zoom: number
  coneGap: number
  speed: number
  /** 纵向：行车方向自下而上，与 JTG H30 图 6.2.1 一致；标志牌保持正向 */
  vertical?: boolean
  /** 双侧占路拆图时标出本图方向，并绘制总平面缩略图 */
  crossSectionFocus?: Direction
  overview?: { up: Zone[]; down: Zone[] }
  /** false 时只输出 SVG，由外层统一滚动 */
  framed?: boolean
}): ReactElement {
  const uid = useId().replace(/:/g, '')
  const closeInner = workSide === 'median' || doubleSide
  const limits = speedLimits(speed)
  const warnTypes: Record<number, SignType> = {
    0: 'construction1600',
    400: 'smart',
    600: limits.first === 80 ? 'limit80' : 'limit60',
    800: 'construction800',
    1000: limits.final === 60 ? 'limit60' : 'limit40',
    1200: closeInner ? 'laneLeft' : 'laneRight',
  }
  const guideType: SignType = closeInner ? 'arrowRight' : 'arrowLeft'
  const endSpeed: SignType = limits.final === 60 ? 'end60' : 'end40'
  const coneStep = Math.max(10, 15 * (coneGap / 4))

  const primaryPx = zonePixels(zones, zoom)
  const mirrored = doubleSide ? mirrorZones(zones, direction) : null
  const extent = zoneExtent(zones, mirrored ?? undefined)

  let totalAlong: number
  let alongOf: (meters: number) => number
  if (mirrored) {
    const ppm = primaryPx.reduce((sum, px) => sum + px, 0) / Math.max(1, zones.reduce((sum, zone) => sum + zone.length, 0))
    totalAlong = Math.max(1, extent.span) * ppm
    alongOf = (meters) => (meters - extent.min) * ppm
  } else {
    const starts = primaryPx.reduce<number[]>((list, px) => {
      list.push((list[list.length - 1] ?? 0) + px)
      return list
    }, [0])
    totalAlong = starts[starts.length - 1] ?? 1
    alongOf = (meters) => {
      for (let i = 0; i < zones.length; i++) {
        const zone = zones[i]!
        const span = zone.end - zone.start
        if (span === 0) continue
        const t = (meters - zone.start) / span
        if (t >= -1e-6 && t <= 1 + 1e-6) {
          return (starts[i] ?? 0) + t * primaryPx[i]!
        }
      }
      const first = zones[0]!
      const last = zones[zones.length - 1]!
      const firstT = (meters - first.start) / Math.max(1e-6, first.end - first.start)
      if (firstT < 0) return firstT * primaryPx[0]!
      return totalAlong + (meters - last.end) / Math.max(1e-6, last.end - last.start) * (primaryPx[primaryPx.length - 1] ?? 0)
    }
  }

  const alongAt = (laneZones: Zone[], index: number, offset: number) => {
    const zone = laneZones[index]!
    const t = offset / Math.max(1, zone.length)
    return alongOf(zone.start) + (alongOf(zone.end) - alongOf(zone.start)) * t
  }

  const roadW = doubleSide ? SHOULDER + LANE * 4 + MEDIAN + SHOULDER : MEDIAN + LANE * 2 + SHOULDER
  const overviewCol = overview && crossSectionFocus ? OVERVIEW_W + OVERVIEW_GAP : 0
  const leftCol = SIGN_COL + GUTTER + overviewCol
  const rightCol = SIGN_COL + DIM_COL + GUTTER + 88
  const topCol = vertical ? 28 : SIGN_COL + GUTTER
  const botCol = vertical ? 40 : SIGN_COL + DIM_COL + GUTTER + 56

  const viewW = vertical ? PAD + leftCol + roadW + rightCol + PAD : PAD + totalAlong + PAD
  const viewH = vertical ? PAD + topCol + totalAlong + botCol + PAD : PAD + topCol + roadW + botCol + PAD
  const roadX = vertical ? PAD + leftCol : PAD
  const roadY = vertical ? PAD + topCol : PAD + topCol
  const roadEndAlong = vertical ? roadY + totalAlong : roadX

  const xy = (along: number, across: number) => {
    if (vertical) return { x: roadX + across, y: roadEndAlong - along }
    return { x: roadX + along, y: roadY + across }
  }

  const strip = (a0: number, a1: number, c0: number, c1: number): Rect => {
    const lo = Math.min(a0, a1)
    const hi = Math.max(a0, a1)
    if (vertical) {
      return { x: roadX + Math.min(c0, c1), y: roadEndAlong - hi, w: Math.abs(c1 - c0), h: hi - lo }
    }
    return { x: roadX + lo, y: roadY + Math.min(c0, c1), w: hi - lo, h: Math.abs(c1 - c0) }
  }

  const line = (a0: number, c0: number, a1: number, c1: number) => {
    const p = xy(a0, c0)
    const q = xy(a1, c1)
    return { x1: p.x, y1: p.y, x2: q.x, y2: q.y }
  }

  const buildCarriage = (dir: Direction, laneZones: Zone[], across0: number, innerFirst: boolean): Carriage => {
    const travel: 1 | -1 = alongOf(laneZones[0]!.end) >= alongOf(laneZones[0]!.start) ? 1 : -1
    let inner0: number
    let inner1: number
    let outer0: number
    let outer1: number
    if (innerFirst) {
      inner0 = across0
      inner1 = across0 + LANE
      outer0 = inner1
      outer1 = inner1 + LANE
    } else {
      outer0 = across0
      outer1 = across0 + LANE
      inner0 = outer1
      inner1 = outer1 + LANE
    }
    const closed0 = closeInner ? inner0 : outer0
    const closed1 = closeInner ? inner1 : outer1
    const open0 = closeInner ? outer0 : inner0
    const open1 = closeInner ? outer1 : inner1
    return {
      dir,
      zones: laneZones,
      travel,
      inner0,
      inner1,
      outer0,
      outer1,
      laneLine: innerFirst ? inner1 : outer1,
      closed0,
      closed1,
      open0,
      open1,
      openMid: (open0 + open1) / 2,
      closedMid: (closed0 + closed1) / 2,
      innerEdge: innerFirst ? inner0 : inner1,
      outerEdge: innerFirst ? outer1 : outer0,
    }
  }

  const carriages: Carriage[] = []
  let median0 = 0
  let median1 = MEDIAN
  if (doubleSide) {
    const downZones = direction === 'down' ? zones : mirrored!
    const upZones = direction === 'up' ? zones : mirrored!
    const down = buildCarriage('down', downZones, SHOULDER, false)
    median0 = SHOULDER + LANE * 2
    median1 = median0 + MEDIAN
    const up = buildCarriage('up', upZones, median1, true)
    carriages.push(down, up)
  } else {
    carriages.push(buildCarriage(direction, zones, MEDIAN, true))
  }

  const roadStart = 0
  const roadEnd = roadW
  const alongStart = 0
  const alongEnd = totalAlong

  const collectSigns = (carriage: Carriage): SignMark[] => {
    const marks: SignMark[] = []
    const warn = carriage.zones[0]!
    const warnOffsets = warningSignOffsets.filter((offset) => offset <= warn.length)
    const warnStart = alongAt(carriage.zones, 0, 0)
    const warnLast = alongAt(carriage.zones, 0, warnOffsets[warnOffsets.length - 1] ?? 0)
    const warnDir = Math.sign(warnLast - warnStart) || 1
    const warnFirst = warnStart + warnDir * (SIGN_SIZE / 2 + 6)
    warnOffsets.forEach((offset, index) => {
      const t = warnOffsets.length === 1 ? 0 : index / (warnOffsets.length - 1)
      const type = warnTypes[offset]!
      const along = warnFirst + (warnLast - warnFirst) * t
      marks.push({ along, type, side: 'work' })
      if (type === 'construction1600' || type === 'construction800') {
        marks.push({ along, type, side: 'opp' })
      }
    })
    marks.push({
      along: alongAt(carriage.zones, 1, Math.min(50, carriage.zones[1]!.length)),
      type: guideType,
      side: 'work',
      label: '导向标志',
      onRoad: true,
    })
    const bufferStart = alongAt(carriage.zones, 2, 0)
    const bufferTravel = Math.sign(alongAt(carriage.zones, 2, carriage.zones[2]!.length) - bufferStart) || 1
    marks.push({ along: bufferStart, type: 'length', side: 'work' })
    marks.push({
      along: bufferStart,
      type: 'fence',
      side: 'work',
      label: '路栏',
      signAlong: bufferStart + bufferTravel * (SIGN_SIZE + 22),
      onRoad: true,
    })
    marks.push({ along: alongAt(carriage.zones, 5, carriage.zones[5]!.length), type: endSpeed, side: 'work' })
    if (warnOffsets.includes(1200)) {
      marks.push({ along: warnLast, type: 'noOvertake', side: 'opp' })
    }
    marks.push({ along: alongAt(carriage.zones, 5, carriage.zones[5]!.length), type: 'endOvertake', side: 'opp' })
    return marks
  }

  const signOnLeft = (carriage: Carriage, side: 'work' | 'opp') => {
    if (doubleSide) return carriage.dir === 'down'
    const workLeft = closeInner
    return side === 'work' ? workLeft : !workLeft
  }

  const signColumnAcross = (carriage: Carriage, side: 'work' | 'opp', offset: number) => {
    const onLeft = signOnLeft(carriage, side)
    return (onLeft ? 0 : roadW) + (onLeft ? -1 : 1) * (GUTTER + SIGN_SIZE / 2 + offset)
  }

  const stagger = (marks: SignMark[]) => {
    const bySide: Record<'work' | 'opp', SignMark[]> = { work: [], opp: [] }
    for (const mark of marks) bySide[mark.side].push(mark)
    const placed: (SignMark & { shift: number })[] = []
    for (const side of ['work', 'opp'] as const) {
      const list = [...bySide[side]].sort((a, b) => (a.signAlong ?? a.along) - (b.signAlong ?? b.along))
      let last = -Infinity
      for (const mark of list) {
        let signAlong = mark.signAlong ?? mark.along
        const gap = SIGN_SIZE + 12
        if (mark.signAlong == null && Number.isFinite(last) && Math.abs(signAlong - last) < gap) {
          signAlong = last + Math.sign(signAlong - last || 1) * gap
        }
        placed.push({ ...mark, signAlong, shift: mark.shift ?? 0 })
        last = signAlong
      }
    }
    return placed
  }

  const cones: { along: number; across: number }[] = []
  for (const carriage of carriages) {
    const closedEdge = closeInner ? carriage.innerEdge : carriage.outerEdge
    const taperA0 = alongAt(carriage.zones, 1, 0)
    const taperA1 = alongAt(carriage.zones, 1, carriage.zones[1]!.length)
    const downA0 = alongAt(carriage.zones, 4, 0)
    const downA1 = alongAt(carriage.zones, 4, carriage.zones[4]!.length)
    const workA0 = alongAt(carriage.zones, 2, 0)
    const workA1 = alongAt(carriage.zones, 3, carriage.zones[3]!.length)
    const workStart = alongAt(carriage.zones, 3, 0)
    const acrossGap = Math.max(8, coneStep * 0.6)
    cones.push(
      ...dotsAlong(taperA0, taperA1, closedEdge, carriage.laneLine, coneStep),
      ...dotsAlong(workA0, workA1, carriage.laneLine, carriage.laneLine, coneStep),
      ...dotsAlong(downA0, downA1, carriage.laneLine, closedEdge, coneStep),
      ...dotsAlong(taperA1, taperA1, closedEdge, carriage.laneLine, acrossGap),
      ...dotsAlong(workStart, workStart, closedEdge, carriage.laneLine, acrossGap),
      ...dotsAlong(workA1, workA1, closedEdge, carriage.laneLine, acrossGap),
    )
  }

  const arrows: { along: number; across: number; travel: 1 | -1 }[] = []
  for (const carriage of carriages) {
    const a0 = alongAt(carriage.zones, 0, carriage.zones[0]!.length * 0.18)
    const a1 = alongAt(carriage.zones, 0, carriage.zones[0]!.length * 0.55)
    const a2 = alongAt(carriage.zones, 3, carriage.zones[3]!.length * 0.45)
    for (const along of [a0, a1, a2]) arrows.push({ along, across: carriage.openMid, travel: carriage.travel })
  }

  const allSigns = carriages.flatMap((carriage) => {
    const placed = stagger(collectSigns(carriage))
    return placed.map((mark) => ({ carriage, ...mark }))
  })

  const onRoadPostAcross = (carriage: Carriage, item: SignMark) => {
    const closedEdge = closeInner ? carriage.innerEdge : carriage.outerEdge
    const isGuide = item.type === 'arrowLeft' || item.type === 'arrowRight'
    if (isGuide) {
      const taperA0 = alongAt(carriage.zones, 1, 0)
      const taperA1 = alongAt(carriage.zones, 1, carriage.zones[1]!.length)
      const span = taperA1 - taperA0
      const t = span === 0 ? 0 : Math.max(0, Math.min(1, (item.along - taperA0) / span))
      const coneAcross = closedEdge + t * (carriage.laneLine - closedEdge)
      return (coneAcross + closedEdge) / 2
    }
    return (carriage.laneLine + closedEdge) / 2
  }

  const shoulderPostAcross = (carriage: Carriage, side: 'work' | 'opp') => {
    if (signOnLeft(carriage, side)) return doubleSide ? 8 : MEDIAN / 2
    return doubleSide ? roadW - 8 : roadW - SHOULDER / 2
  }

  const dimZones = (doubleSide ? zones : zones).map((zone) => {
    const a0 = alongOf(zone.start)
    const a1 = alongOf(zone.end)
    return { zone, a0: Math.min(a0, a1), a1: Math.max(a0, a1) }
  })

  const dimAcross0 = roadW + SIGN_COL + 76
  const dimTick = 26

  const font = 'PingFang SC, Microsoft YaHei, sans-serif'

  const arrowHead = (along: number, across: number, travel: 1 | -1) => {
    const tip = xy(along + travel * 11, across)
    const left = xy(along - travel * 8, across - 6)
    const right = xy(along - travel * 8, across + 6)
    return `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`
  }

  const medianLabel = '中央分隔带'
  const medianMid = (median0 + median1) / 2
  const medianCenter = xy(totalAlong / 2, medianMid)

  const svg = (
      <svg
        className={`roadSvg${vertical ? ' roadSvg-vertical' : ''}`}
        viewBox={`0 0 ${Math.ceil(viewW)} ${Math.ceil(viewH)}`}
        style={vertical ? undefined : { minWidth: Math.ceil(viewW) }}
        role="img"
        data-direction={direction}
        aria-label={`高速公路作业区布置图${crossSectionFocus ? `（${crossSectionFocus === 'up' ? '上行' : '下行'}）` : ''}`}
        fontFamily={font}
      >
        <defs>
          <pattern id={`${uid}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke={C.hatch} strokeWidth="1.4" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={viewW} height={viewH} fill={C.bg} />

        {overview && crossSectionFocus ? (
          <OverviewSchematic
            x={PAD}
            y={PAD}
            upZones={overview.up}
            downZones={overview.down}
            focus={crossSectionFocus}
            hatchId={`${uid}-hatch`}
          />
        ) : null}

        {doubleSide ? (
          <>
            {(() => {
              const leftSh = strip(alongStart, alongEnd, 0, SHOULDER)
              const rightSh = strip(alongStart, alongEnd, roadW - SHOULDER, roadW)
              return (
                <>
                  <rect x={leftSh.x} y={leftSh.y} width={leftSh.w} height={leftSh.h} fill={C.shoulder} />
                  <rect x={rightSh.x} y={rightSh.y} width={rightSh.w} height={rightSh.h} fill={C.shoulder} />
                </>
              )
            })()}
          </>
        ) : (
          <>
            {(() => {
              const med = strip(alongStart, alongEnd, 0, MEDIAN)
              const sh = strip(alongStart, alongEnd, MEDIAN + LANE * 2, roadW)
              return (
                <>
                  <rect x={med.x} y={med.y} width={med.w} height={med.h} fill={C.median} />
                  <rect x={sh.x} y={sh.y} width={sh.w} height={sh.h} fill={C.shoulder} />
                </>
              )
            })()}
          </>
        )}

        {doubleSide ? (() => {
          const med = strip(alongStart, alongEnd, median0, median1)
          return <rect x={med.x} y={med.y} width={med.w} height={med.h} fill={C.median} />
        })() : null}

        {carriages.map((carriage) => {
          const inner = strip(alongStart, alongEnd, carriage.inner0, carriage.inner1)
          const outer = strip(alongStart, alongEnd, carriage.outer0, carriage.outer1)
          return (
            <g key={`pavement-${carriage.dir}`}>
              <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill={C.road} />
              <rect x={outer.x} y={outer.y} width={outer.w} height={outer.h} fill={C.road} />
            </g>
          )
        })}

        {carriages.map((carriage) => {
          const work = carriage.zones[3]!
          const hatch = strip(alongOf(work.start), alongOf(work.end), carriage.closed0, carriage.closed1)
          const hatchLabel = xy((alongOf(work.start) + alongOf(work.end)) / 2, carriage.closedMid)
          return (
            <g key={`work-${carriage.dir}`}>
              <rect x={hatch.x} y={hatch.y} width={hatch.w} height={hatch.h} fill="#fff" />
              <rect x={hatch.x} y={hatch.y} width={hatch.w} height={hatch.h} fill={`url(#${uid}-hatch)`} />
              <rect x={hatch.x} y={hatch.y} width={hatch.w} height={hatch.h} fill="none" stroke="#4a4a4a" strokeWidth="0.8" />
              <text x={hatchLabel.x} y={hatchLabel.y} textAnchor="middle" fontSize="10" fill="#333">封闭</text>
            </g>
          )
        })}

        {carriages.map((carriage) => {
          const dash = line(alongStart, carriage.laneLine, alongEnd, carriage.laneLine)
          return (
            <line
              key={`dash-${carriage.dir}`}
              {...dash}
              stroke={C.mark}
              strokeWidth="2"
              strokeDasharray="13 11"
              strokeLinecap="round"
            />
          )
        })}

        {(() => {
          const left = line(alongStart, roadStart, alongEnd, roadStart)
          const right = line(alongStart, roadEnd, alongEnd, roadEnd)
          const mid = doubleSide ? line(alongStart, median0, alongEnd, median0) : null
          const mid2 = doubleSide ? line(alongStart, median1, alongEnd, median1) : line(alongStart, MEDIAN, alongEnd, MEDIAN)
          return (
            <g stroke="#B5B5B5" strokeWidth="1">
              <line {...left} />
              <line {...right} />
              {mid ? <line {...mid} /> : null}
              <line {...mid2} />
            </g>
          )
        })()}

        {cones.map((cone, i) => {
          const p = xy(cone.along, cone.across)
          return <circle key={`cone-${i}`} cx={p.x} cy={p.y} r="2.4" fill={C.cone} />
        })}

        {arrows.map((item, i) => (
          <polygon key={`arrow-${i}`} points={arrowHead(item.along, item.across, item.travel)} fill={C.mark} />
        ))}

        {carriages.map((carriage) => {
          const label = carriage.dir === 'up' ? '上行' : '下行'
          const p = xy(alongAt(carriage.zones, 0, carriage.zones[0]!.length * 0.08), carriage.openMid)
          return (
            <text key={`dir-${carriage.dir}`} x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
              {label}
            </text>
          )
        })}

        {vertical ? (
          medianLabel.split('').map((ch, i) => (
            <text
              key={`med-${i}`}
              x={medianCenter.x}
              y={medianCenter.y - 40 + i * 16}
              textAnchor="middle"
              fontSize="11"
              fill={C.muted}
            >
              {ch}
            </text>
          ))
        ) : (
          <text x={medianCenter.x} y={medianCenter.y + 4} textAnchor="middle" fontSize="11" fill={C.muted}>
            {medianLabel}
          </text>
        )}

        {allSigns.map((item, i) => {
          const postAcross = item.onRoad
            ? onRoadPostAcross(item.carriage, item)
            : shoulderPostAcross(item.carriage, item.side)
          const post = xy(item.along, postAcross)
          const signAt = xy(
            item.signAlong ?? item.along,
            signColumnAcross(item.carriage, item.side, item.shift ?? 0),
          )
          const title = item.label || SIGN_BY_TYPE[item.type] || ''
          const labelOnOuter = signOnLeft(item.carriage, item.side)
          const postW = vertical ? 12 : 5
          const postH = vertical ? 5 : 12
          return (
            <g key={`sign-${i}`}>
              <rect x={post.x - postW / 2} y={post.y - postH / 2} width={postW} height={postH} fill={C.post} />
              <line x1={post.x} y1={post.y} x2={signAt.x} y2={signAt.y} stroke="#333" strokeWidth="1" />
              <g transform={`translate(${signAt.x} ${signAt.y})`}>
                <SignFace type={item.type} />
              </g>
              {item.label ? (
                <text
                  x={signAt.x}
                  y={vertical ? signAt.y + (labelOnOuter ? -SIGN_SIZE / 2 - 4 : SIGN_SIZE / 2 + 12) : signAt.y + SIGN_SIZE / 2 + 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#3a3a3c"
                >
                  {title}
                </text>
              ) : null}
            </g>
          )
        })}

        {dimZones.map(({ zone, a0, a1 }) => {
          const mid = (a0 + a1) / 2
          const start = xy(a0, dimAcross0)
          const end = xy(a1, dimAcross0)
          const tick0 = xy(a0, dimAcross0 - dimTick)
          const tick1 = xy(a0, dimAcross0 + dimTick)
          const tick2 = xy(a1, dimAcross0 - dimTick)
          const tick3 = xy(a1, dimAcross0 + dimTick)
          const label = xy(mid, dimAcross0 + dimTick + 20)
          const letter = ZONE_LETTER[zone.key] ?? ''
          return (
            <g key={`dim-${zone.key}`} stroke={C.dim} strokeWidth="1" fill={C.dim}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
              <line x1={tick0.x} y1={tick0.y} x2={tick1.x} y2={tick1.y} />
              <line x1={tick2.x} y1={tick2.y} x2={tick3.x} y2={tick3.y} />
              <text x={label.x} y={label.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" stroke="none">
                {letter}
              </text>
              <text x={label.x} y={label.y + 3} textAnchor="middle" fontSize="9" fontWeight="500" stroke="none" fill="#3a3a3c">
                {zone.name}
              </text>
              <text x={label.x} y={label.y + 15} textAnchor="middle" fontSize="9" stroke="none" fill={C.muted}>
                {zone.length.toLocaleString()}m
              </text>
            </g>
          )
        })}

        {(() => {
          const marks: { along: number; label: string }[] = []
          const seen = new Set<number>()
          for (const zone of zones) {
            for (const meters of [zone.start, zone.end]) {
              const along = alongOf(meters)
              const key = Math.round(along)
              if (seen.has(key)) continue
              seen.add(key)
              marks.push({ along, label: stake(meters) })
            }
          }
          return marks.map((mark) => {
            const beside = xy(mark.along, dimAcross0 - dimTick - 4)
            return (
              <text
                key={`stake-${mark.label}-${Math.round(mark.along)}`}
                x={beside.x}
                y={beside.y}
                textAnchor={vertical ? 'end' : 'middle'}
                dominantBaseline="central"
                fontSize="8"
                fill={C.muted}
              >
                {mark.label}
              </text>
            )
          })
        })()}
      </svg>
  )
  if (!framed) return svg
  return <div className="diagramScroll">{svg}</div>
}

/** 单侧一张图；双侧占路拆成上行、下行两张，每张带总平面缩略图 */
export function ZoneDiagrams({
  zones,
  direction,
  workSide,
  doubleSide = false,
  zoom,
  coneGap,
  speed,
  vertical = true,
}: {
  zones: Zone[]
  direction: Direction
  workSide: WorkSide
  doubleSide?: boolean
  zoom: number
  coneGap: number
  speed: number
  vertical?: boolean
}): ReactElement {
  if (!doubleSide) {
    return (
      <RoadDiagram
        zones={zones}
        direction={direction}
        workSide={workSide}
        zoom={zoom}
        coneGap={coneGap}
        speed={speed}
        vertical={vertical}
      />
    )
  }
  const mirrored = mirrorZones(zones, direction)
  const upZones = direction === 'up' ? zones : mirrored
  const downZones = direction === 'down' ? zones : mirrored
  return (
    <div className="diagramScroll">
      <p className="diagram-lane-head">上行布置</p>
      <RoadDiagram
        zones={upZones}
        direction="up"
        workSide="median"
        zoom={zoom}
        coneGap={coneGap}
        speed={speed}
        vertical={vertical}
        crossSectionFocus="up"
        overview={{ up: upZones, down: downZones }}
        framed={false}
      />
      <p className="diagram-lane-head">下行布置</p>
      <RoadDiagram
        zones={downZones}
        direction="down"
        workSide="median"
        zoom={zoom}
        coneGap={coneGap}
        speed={speed}
        vertical={vertical}
        crossSectionFocus="down"
        overview={{ up: upZones, down: downZones }}
        framed={false}
      />
    </div>
  )
}
