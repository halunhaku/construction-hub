/** 横断面：示意图用与 2D 规程图同一套像素比例；真实比例用米。 */

export interface Carriage {
  sign: 1 | -1
  innerShoulder: { x0: number; x1: number }
  innerLane: { x0: number; x1: number }
  outerLane: { x0: number; x1: number }
  outerShoulder: { x0: number; x1: number }
  edgeOuter: number
  edgeInner: number
  laneSplit: number
  shoulderOuterMid: number
  laneMid: number
}

export interface CrossSection {
  kind: 'diagram' | 'real'
  LANE: number
  SHOULDER_OUTER: number
  SHOULDER_INNER: number
  MEDIAN: number
  BARRIER_W: number
  BARRIER_H: number
  MARK_W: number
  ROAD_Y: number
  ROAD_WIDTH: number
  UP: Carriage
  DOWN: Carriage
}

function carriageway(
  sign: 1 | -1,
  lane: number,
  shOut: number,
  shIn: number,
  median: number,
): Carriage {
  const m = median / 2
  const innerShoulder0 = m * sign
  const innerShoulder1 = (m + shIn) * sign
  const innerLane1 = (m + shIn + lane) * sign
  const outerLane1 = (m + shIn + lane * 2) * sign
  const outerShoulder1 = (m + shIn + lane * 2 + shOut) * sign
  const lo = (a: number, b: number) => (a < b ? { x0: a, x1: b } : { x0: b, x1: a })
  return {
    sign,
    innerShoulder: lo(innerShoulder0, innerShoulder1),
    innerLane: lo(innerShoulder1, innerLane1),
    outerLane: lo(innerLane1, outerLane1),
    outerShoulder: lo(outerLane1, outerShoulder1),
    edgeOuter: outerLane1,
    edgeInner: innerShoulder1,
    laneSplit: innerLane1,
    shoulderOuterMid: (outerLane1 + outerShoulder1) / 2,
    laneMid: (innerShoulder1 + outerLane1) / 2,
  }
}

function make(kind: 'diagram' | 'real', lane: number, shOut: number, shIn: number, median: number, extras: Pick<CrossSection, 'BARRIER_W' | 'BARRIER_H' | 'MARK_W' | 'ROAD_Y'>): CrossSection {
  const carriage = shOut + lane * 2 + shIn
  const width = (median / 2 + carriage) * 2
  return {
    kind,
    LANE: lane,
    SHOULDER_OUTER: shOut,
    SHOULDER_INNER: shIn,
    MEDIAN: median,
    ROAD_WIDTH: width,
    UP: carriageway(-1, lane, shOut, shIn, median),
    DOWN: carriageway(1, lane, shOut, shIn, median),
    ...extras,
  }
}

/** 与 2D RoadDiagram 同一套：车道 48、路肩 30、中央分隔带 26。 */
export const DIAGRAM_CS = make('diagram', 48, 30, 10, 26, {
  BARRIER_W: 6,
  BARRIER_H: 14,
  MARK_W: 2.8,
  ROAD_Y: 0.35,
})

export const REAL_CS = make('real', 3.75, 3, 0.75, 2, {
  BARRIER_W: 0.5,
  BARRIER_H: 0.85,
  MARK_W: 0.15,
  ROAD_Y: 0.04,
})

export function crossSectionFor(mode: 'schematic' | 'true'): CrossSection {
  return mode === 'schematic' ? DIAGRAM_CS : REAL_CS
}

export const ROAD_Y = REAL_CS.ROAD_Y
