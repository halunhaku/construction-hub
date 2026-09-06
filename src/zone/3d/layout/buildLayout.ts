import { buildZones, zoneExtent, mirrorZones } from '../../utils'
import { crossSectionFor, type CrossSection } from './crossSection'
import type { Params, ScaleMode, Zone } from '../../types'

/** 与 2D 规程图式同一套示意长度，再按实际米数轻微拉伸。 */
const SCHEME_DISPLAY: Record<string, number> = {
  warning: 500,
  taper: 76,
  buffer: 66,
  work: 176,
  downstream: 74,
  terminal: 74,
}

const SCHEME_REF_M: Record<string, number> = {
  warning: 1600,
  taper: 200,
  buffer: 150,
  work: 1000,
  downstream: 30,
  terminal: 30,
}

export interface LayoutSegment {
  key: string
  name: string
  color: string
  meters: number
  displayLength: number
  startStake: number
  endStake: number
  z0: number
  z1: number
}

export interface RoadLayout {
  mode: ScaleMode
  cs: CrossSection
  segments: LayoutSegment[]
  zones: Zone[]
  mirrored?: Zone[]
  totalLength: number
  totalMeters: number
  roadZ0: number
  roadZ1: number
  extent: { min: number; max: number; span: number }
}

export function displayLength(key: string, meters: number, mode: ScaleMode): number {
  if (mode === 'true') return Math.max(12, meters)
  const base = SCHEME_DISPLAY[key] ?? 50
  const ref = SCHEME_REF_M[key] ?? meters
  return Math.max(18, base * (meters / Math.max(1, ref)))
}

export function buildLayout(params: Params, mode: ScaleMode): RoadLayout {
  const zones = buildZones(params)
  const mirrored = params.doubleSide ? mirrorZones(zones, params.direction) : undefined
  const extent = zoneExtent(zones, mirrored)
  const lengths = zones.map((z) => displayLength(z.key, z.length, mode))
  const primaryLen = lengths.reduce((s, n) => s + n, 0)
  let z = -primaryLen / 2
  const segments = zones.map((zone, i) => {
    const display = lengths[i]!
    const z0 = z
    const z1 = z + display
    z = z1
    return {
      key: zone.key,
      name: zone.name,
      color: zone.color,
      meters: zone.length,
      displayLength: display,
      startStake: zone.start,
      endStake: zone.end,
      z0,
      z1,
    }
  })
  const zMin = segments[0]!.z0
  const zMax = segments[segments.length - 1]!.z1
  let roadZ0 = zMin
  let roadZ1 = zMax
  if (params.doubleSide) {
    const work = segments[3]!
    const cz = (work.z0 + work.z1) / 2
    roadZ0 = Math.min(zMin, 2 * cz - zMax)
    roadZ1 = Math.max(zMax, 2 * cz - zMin)
  }
  return {
    mode,
    cs: crossSectionFor(mode),
    segments,
    zones,
    mirrored,
    totalLength: roadZ1 - roadZ0,
    totalMeters: params.doubleSide ? extent.span : zones.reduce((s, zone) => s + zone.length, 0),
    roadZ0,
    roadZ1,
    extent,
  }
}
