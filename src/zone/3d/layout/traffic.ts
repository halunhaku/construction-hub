import type { RoadLayout } from './buildLayout'
import type { Params } from '../../types'

export interface TrafficPath {
  xClosed: number
  xOpen: number
  dir: 1 | -1
  mergeStart: number
  mergeEnd: number
  returnStart: number
  returnEnd: number
  merges: boolean
}

function mid(a: number, b: number) {
  return (a + b) / 2
}

function zAt(seg: { z0: number; z1: number; meters: number }, offsetM: number) {
  const t = offsetM / Math.max(1, seg.meters)
  return seg.z0 + t * (seg.z1 - seg.z0)
}

/** 作业方向沿布置图 +Z；对向 -Z。封闭车道的车开到「车道减少」牌再并入，驶过下游过渡区后驶回原车道。 */
export function trafficPaths(layout: RoadLayout, params: Params): TrafficPath[] {
  const closeInner = params.workSide === 'median' || params.doubleSide
  const warn = layout.segments[0]!
  const taper = layout.segments[1]!
  const work = layout.segments[3]!
  const down = layout.segments[4]!
  const cz = (work.z0 + work.z1) / 2
  const signZ = zAt(warn, Math.min(1200, warn.meters))
  const room = Math.max(6, taper.z0 - signZ)
  const mergeLen = Math.min(room * 0.85, layout.mode === 'schematic' ? 110 : 160)
  const primaryStart = signZ
  const primaryEnd = signZ + mergeLen

  // 驶回原车道：锥桶在下游过渡区末端完全撤除，车辆自此起一段距离内并回原车道
  const zMax = layout.roadZ1 - 8
  const reopenExt = Math.max(24, (down.z1 - down.z0) * 0.9)
  const primaryReturnStart = down.z1
  const primaryReturnEnd = Math.min(down.z1 + reopenExt, zMax - 2)

  const paths: TrafficPath[] = []
  const add = (which: 'up' | 'down', closed: boolean) => {
    const cw = which === 'up' ? layout.cs.UP : layout.cs.DOWN
    const inner = mid(cw.innerLane.x0, cw.innerLane.x1)
    const outer = mid(cw.outerLane.x0, cw.outerLane.x1)
    const openX = closeInner ? outer : inner
    const closedX = closeInner ? inner : outer
    const dir: 1 | -1 = params.doubleSide ? (which === 'up' ? 1 : -1) : which === params.direction ? 1 : -1
    if (!closed) {
      paths.push(steady(inner, dir), steady(outer, dir))
      return
    }
    paths.push(steady(openX, dir))
    let mergeStart = primaryStart
    let mergeEnd = primaryEnd
    let returnStart = primaryReturnStart
    let returnEnd = primaryReturnEnd
    if (dir < 0) {
      mergeStart = 2 * cz - primaryStart
      mergeEnd = 2 * cz - primaryEnd
      returnStart = 2 * cz - primaryReturnStart
      returnEnd = 2 * cz - primaryReturnEnd
    }
    paths.push({
      xClosed: closedX,
      xOpen: openX,
      dir,
      mergeStart,
      mergeEnd,
      returnStart,
      returnEnd,
      merges: true,
    })
  }
  add('up', params.direction === 'up' || params.doubleSide)
  add('down', params.direction === 'down' || params.doubleSide)
  return paths
}

function steady(x: number, dir: 1 | -1): TrafficPath {
  return {
    xClosed: x,
    xOpen: x,
    dir,
    mergeStart: 0,
    mergeEnd: 0,
    returnStart: 0,
    returnEnd: 0,
    merges: false,
  }
}

function smoothstep(t: number) {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

export function pathX(path: TrafficPath, z: number) {
  if (!path.merges) return path.xOpen
  let x = path.xOpen
  const spanOut = path.mergeEnd - path.mergeStart
  if (Math.abs(spanOut) > 1e-4) {
    x = path.xClosed + (path.xOpen - path.xClosed) * smoothstep((z - path.mergeStart) / spanOut)
  }
  const spanBack = path.returnEnd - path.returnStart
  if (Math.abs(spanBack) > 1e-4) {
    x += (path.xClosed - x) * smoothstep((z - path.returnStart) / spanBack)
  }
  return x
}

export function pathYaw(path: TrafficPath, z: number) {
  const base = path.dir > 0 ? 0 : Math.PI
  if (!path.merges) return base
  const eps = 2
  const dx = pathX(path, z + eps) - pathX(path, z - eps)
  const dxdz = dx / (2 * eps)
  return Math.atan2(dxdz * path.dir, path.dir)
}

export function displaySpeed(params: Params, totalLength: number, totalMeters: number): number {
  const mps = Math.max(40, params.speed) / 3.6
  return mps * (totalLength / Math.max(1, totalMeters))
}
