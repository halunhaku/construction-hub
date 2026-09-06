import type { CrossSection } from './crossSection'
import type { Params } from '../../types'

export function openLaneX(params: Params, cs: CrossSection): number {
  const cw = params.direction === 'up' ? cs.UP : cs.DOWN
  const closeInner = params.workSide === 'median' || params.doubleSide
  const lane = closeInner ? cw.outerLane : cw.innerLane
  return (lane.x0 + lane.x1) / 2
}

export function roadsideEyeX(params: Params, cs: CrossSection): number {
  const cw = params.direction === 'up' ? cs.UP : cs.DOWN
  const closeInner = params.workSide === 'median' || params.doubleSide
  return closeInner ? cw.sign * (cs.MEDIAN / 2 + 4) : cw.edgeOuter + cw.sign * (cs.SHOULDER_OUTER * 0.35)
}

export function roadsideLookX(params: Params, cs: CrossSection): number {
  const cw = params.direction === 'up' ? cs.UP : cs.DOWN
  const closeInner = params.workSide === 'median' || params.doubleSide
  const lane = closeInner ? cw.innerLane : cw.outerLane
  return (lane.x0 + lane.x1) / 2
}
