import type { Carriage } from './crossSection'
import type { RoadLayout } from './buildLayout'
import { speedLimits, stake, warningSignOffsets } from '../../utils'
import type { Direction, Params, SignType } from '../../types'

export interface ConeSpot {
  x: number
  z: number
}

export interface SignSpot {
  id: string
  type: SignType
  x: number
  z: number
  yaw: number
  onRoad: boolean
  side: 'work' | 'opp'
  dir: Direction
  title: string
  stakeLabel: string
  desc: string
  /** 路栏 / 导向板：按所在锥桶走廊宽度收过的牌面宽。 */
  boardW?: number
}

export interface ClosedLane {
  x0: number
  x1: number
  z0: number
  z1: number
  color: string
}

export interface DeviceLayout {
  cones: ConeSpot[]
  signs: SignSpot[]
  closedLanes: ClosedLane[]
}

const SIGN_TITLE: Record<SignType, string> = {
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
  arrowLeft: '左向导向',
  arrowRight: '右向导向',
  end60: '解除限速 60',
  end40: '解除限速 40',
  endOvertake: '解除禁止超车',
  fence: '路栏',
}

export const SIGN_PX: Record<SignType, { w: number; h: number }> = {
  construction1600: { w: 234, h: 256 },
  construction800: { w: 234, h: 256 },
  length: { w: 234, h: 256 },
  smart: { w: 143, h: 234 },
  limit80: { w: 256, h: 256 },
  limit60: { w: 256, h: 256 },
  limit40: { w: 256, h: 256 },
  laneLeft: { w: 160, h: 256 },
  laneRight: { w: 160, h: 256 },
  noOvertake: { w: 248, h: 248 },
  arrowLeft: { w: 256, h: 86 },
  arrowRight: { w: 256, h: 86 },
  end60: { w: 256, h: 256 },
  end40: { w: 256, h: 256 },
  endOvertake: { w: 248, h: 248 },
  fence: { w: 256, h: 211 },
}

export function isRoadBoard(type: SignType) {
  return type === 'fence' || type === 'arrowLeft' || type === 'arrowRight'
}

/** 路栏 / 导向板：宽不超过锥桶走廊，牌面比例跟 SVG 一致。 */
export function signBoardSize(
  type: SignType,
  schematic = false,
  lane = schematic ? 48 : 3.75,
  boardW?: number,
): { w: number; h: number } {
  const px = SIGN_PX[type]
  const aspect = px.w / px.h
  if (isRoadBoard(type)) {
    const w = boardW ?? lane * (type === 'fence' ? 0.55 : 0.82)
    return { w, h: w / aspect }
  }
  let h = 0.9
  if (type === 'smart' || type === 'laneLeft' || type === 'laneRight') h = 1.15
  else if (type === 'construction1600' || type === 'construction800' || type === 'length') h = 1.12
  const k = schematic ? 56 : 1
  return { w: h * aspect * k, h: h * k }
}

/** 路栏塞进整段封闭走廊；导向牌按可读尺寸，贴锥桶线、多出的往封闭一侧让。 */
function fitRoadBoard(type: SignType, closedEdge: number, coneX: number, schematic: boolean, lane: number) {
  const span = coneX - closedEdge
  const avail = Math.abs(span)
  if (type === 'fence') {
    const pad = Math.min(schematic ? 3.2 : 0.28, avail * 0.16)
    const inner = Math.max(0, avail - 2 * pad)
    const w = Math.min(avail * 0.9, inner * 0.88)
    return { x: closedEdge + span * 0.5, w }
  }
  // 导向标志牌 (arrowLeft / arrowRight)：
  // 严格居中于封闭走廊 [closedEdge, coneX]，宽度不超过可用封闭宽度的 80%，两端保留充足安全余量，绝不超出路边或侵入通车道
  const maxW = schematic ? lane * 0.52 : Math.max(1.8, lane * 0.48)
  const w = Math.min(maxW, avail * 0.8)
  return { x: closedEdge + span * 0.5, w }
}

function zAt(layout: RoadLayout, zoneIndex: number, offsetM: number): number {
  const seg = layout.segments[zoneIndex]!
  const t = offsetM / Math.max(1, seg.meters)
  return seg.z0 + t * (seg.z1 - seg.z0)
}

/** 按真实米数定锥桶个数，再均分到当前显示长度上。 */
function dotsByMeters(z0: number, z1: number, x0: number, x1: number, meters: number, gap: number): ConeSpot[] {
  const count = Math.max(1, Math.round(Math.max(meters, gap) / gap))
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count
    return { z: z0 + (z1 - z0) * t, x: x0 + (x1 - x0) * t }
  })
}

function dotsByCount(z0: number, z1: number, x0: number, x1: number, count: number): ConeSpot[] {
  const n = Math.max(2, count)
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    return { z: z0 + (z1 - z0) * t, x: x0 + (x1 - x0) * t }
  })
}

function carriageOf(dir: Direction, up: Carriage, down: Carriage) {
  return dir === 'up' ? up : down
}

function sideX(cw: Carriage, closeInner: boolean, side: 'work' | 'opp', median: number, shoulder: number): number {
  const s = cw.sign
  if (side === 'work') {
    return closeInner ? s * (median / 2 + 2) : cw.edgeOuter + s * (shoulder * 0.45)
  }
  return closeInner ? cw.edgeOuter + s * (shoulder * 0.45) : s * (median / 2 + 2)
}

function closedRange(cw: Carriage, closeInner: boolean) {
  const closed = closeInner ? cw.innerLane : cw.outerLane
  const closedEdge = closeInner ? cw.edgeInner : cw.edgeOuter
  return { closed, closedEdge, laneSplit: cw.laneSplit }
}

function warnType(offset: number, closeInner: boolean, speed: number): SignType {
  const limits = speedLimits(speed)
  if (offset === 0) return 'construction1600'
  if (offset === 400) return 'smart'
  if (offset === 800) return limits.first === 80 ? 'limit80' : 'limit60'
  if (offset === 1000) return limits.final === 60 ? 'limit60' : 'limit40'
  return closeInner ? 'laneLeft' : 'laneRight'
}

function collectForDir(
  layout: RoadLayout,
  params: Params,
  dir: Direction,
): { cones: ConeSpot[]; signs: SignSpot[]; closed: ClosedLane[] } {
  const closeInner = params.workSide === 'median' || params.doubleSide
  const cw = carriageOf(dir, layout.cs.UP, layout.cs.DOWN)
  const { closed, closedEdge, laneSplit } = closedRange(cw, closeInner)
  const yaw = dir === 'up' ? Math.PI : 0
  const gap = Math.max(1, params.coneGap)
  const taper = layout.segments[1]!
  const buffer = layout.segments[2]!
  const work = layout.segments[3]!
  const down = layout.segments[4]!
  const taperZ0 = zAt(layout, 1, 0)
  const taperZ1 = zAt(layout, 1, taper.meters)
  const bufferZ0 = zAt(layout, 2, 0)
  const workZ0 = zAt(layout, 3, 0)
  const workZ1 = zAt(layout, 3, work.meters)
  const downZ0 = zAt(layout, 4, 0)
  const downZ1 = zAt(layout, 4, down.meters)
  const termZ1 = zAt(layout, 5, layout.segments[5]!.meters)
  const closedWidth = Math.abs(laneSplit - closedEdge)
  const schematic = layout.mode === 'schematic'
  const inward = Math.sign(closedEdge - laneSplit) * (schematic ? 3.6 : 0.32)
  const coneLine = laneSplit + inward

  const cones: ConeSpot[] = schematic
    ? [
        ...dotsByCount(taperZ0, taperZ1, closedEdge, coneLine, 8),
        ...dotsByCount(bufferZ0, workZ1, coneLine, coneLine, 14),
        ...dotsByCount(downZ0, downZ1, coneLine, closedEdge, 6),
        ...dotsByCount(taperZ1, taperZ1, closedEdge, coneLine, 3),
        ...dotsByCount(workZ0, workZ0, closedEdge, coneLine, 3),
        ...dotsByCount(workZ1, workZ1, closedEdge, coneLine, 3),
      ]
    : [
        ...dotsByMeters(taperZ0, taperZ1, closedEdge, coneLine, taper.meters, gap),
        ...dotsByMeters(bufferZ0, workZ1, coneLine, coneLine, buffer.meters + work.meters, gap),
        ...dotsByMeters(downZ0, downZ1, coneLine, closedEdge, down.meters, gap),
        ...dotsByMeters(taperZ1, taperZ1, closedEdge, coneLine, closedWidth, gap),
        ...dotsByMeters(workZ0, workZ0, closedEdge, coneLine, closedWidth, gap),
        ...dotsByMeters(workZ1, workZ1, closedEdge, coneLine, closedWidth, gap),
      ]

  const limits = speedLimits(params.speed)
  const guideType: SignType = closeInner ? 'arrowRight' : 'arrowLeft'
  const endSpeed: SignType = limits.final === 60 ? 'end60' : 'end40'
  const warn = layout.segments[0]!
  const offsets = warningSignOffsets.filter((o) => o <= warn.meters)
  const signs: SignSpot[] = []

  const push = (
    type: SignType,
    z: number,
    side: 'work' | 'opp',
    desc: string,
    onRoad: boolean,
    xOverride?: number,
    boardW?: number,
  ) => {
    const x = xOverride ?? sideX(cw, closeInner, side, layout.cs.MEDIAN, layout.cs.SHOULDER_OUTER)
    const zone = layout.segments.find((s) => z >= Math.min(s.z0, s.z1) - 0.01 && z <= Math.max(s.z0, s.z1) + 0.01)
    const t = zone ? (z - zone.z0) / Math.max(1e-6, zone.z1 - zone.z0) : 0
    const meters = zone ? zone.startStake + t * (zone.endStake - zone.startStake) : 0
    signs.push({
      id: `${dir}-${type}-${side}-${Math.round(z * 10)}`,
      type,
      x,
      z,
      yaw,
      onRoad,
      side,
      dir,
      title: SIGN_TITLE[type],
      stakeLabel: stake(meters),
      desc: `${dir === 'up' ? '上行' : '下行'} · ${desc}`,
      boardW,
    })
  }

  offsets.forEach((offset) => {
    const type = warnType(offset, closeInner, params.speed)
    const z = zAt(layout, 0, offset)
    push(type, z, 'work', `警告区 ${offset}m`, false)
    if (type === 'construction1600') push(type, z, 'opp', '警告区起点（对侧）', false)
    if (offset === 1200) push('noOvertake', z, 'opp', '警告区 1200m（对侧）', false)
  })

  const taperLen = layout.segments[1]!.meters
  const guideMeters = Math.max(45, Math.min(taperLen * 0.42, 85))
  const guideZ = zAt(layout, 1, guideMeters)
  const taperT = (guideZ - taperZ0) / Math.max(1e-6, taperZ1 - taperZ0)
  const coneX = closedEdge + taperT * (coneLine - closedEdge)
  const guide = fitRoadBoard(guideType, closedEdge, coneX, schematic, layout.cs.LANE)
  push(guideType, guideZ, 'work', `过渡区内 ${Math.round(guideMeters)}m`, true, guide.x, guide.w)

  push('length', bufferZ0, 'work', '缓冲区入口', false)
  const fenceZ = bufferZ0 + (schematic ? 8 : 1.5)
  const fence = fitRoadBoard('fence', closedEdge, coneLine, schematic, layout.cs.LANE)
  push('fence', fenceZ, 'work', '缓冲区入口 · 路栏', true, fence.x, fence.w)

  push(endSpeed, termZ1, 'work', '终止区终点', false)
  push('endOvertake', termZ1, 'opp', '终止区终点（对侧）', false)

  return {
    cones,
    signs,
    closed: [taper, buffer, work, down].map((seg) => ({
      x0: closed.x0,
      x1: closed.x1,
      z0: seg.z0,
      z1: seg.z1,
      color: seg.color,
    })),
  }
}

export function buildDevices(layout: RoadLayout, params: Params): DeviceLayout {
  const primary = collectForDir(layout, params, params.direction)
  if (!params.doubleSide) {
    return { cones: primary.cones, signs: primary.signs, closedLanes: primary.closed }
  }
  const work = layout.segments[3]!
  const cz = (work.z0 + work.z1) / 2
  const flip = (x: number, z: number) => ({ x: -x, z: 2 * cz - z })
  const oppDir: Direction = params.direction === 'up' ? 'down' : 'up'
  const cones = [...primary.cones, ...primary.cones.map((c) => flip(c.x, c.z))]
  const signs = [
    ...primary.signs,
    ...primary.signs.map((s) => {
      const p = flip(s.x, s.z)
      return {
        ...s,
        id: `${s.id}-rot`,
        x: p.x,
        z: p.z,
        yaw: s.yaw + Math.PI,
        dir: oppDir,
        desc: s.desc.replace(/上行|下行/g, (m) => (m === '上行' ? '下行' : '上行')),
      }
    }),
  ]
  const closedLanes = [
    ...primary.closed,
    ...primary.closed.map((c) => {
      const a = flip(c.x0, c.z0)
      const b = flip(c.x1, c.z1)
      return {
        ...c,
        x0: Math.min(a.x, b.x),
        x1: Math.max(a.x, b.x),
        z0: Math.min(a.z, b.z),
        z1: Math.max(a.z, b.z),
      }
    }),
  ]
  return { cones, signs, closedLanes }
}
