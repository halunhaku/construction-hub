import type { RoadLayout } from '../layout/buildLayout'
import type { CrossSection } from '../layout/crossSection'
import type { DeviceLayout, SignSpot } from '../layout/devices'
import type { Params } from '../../types'
import { ClosedLanes } from './ClosedLanes'
import { Cones } from './Cones'
import { LaneMarks, useLaneMarkingGeometry } from './markings'
import { Signs } from './Signs'
import { Traffic } from './Traffic'
import { WorkVehicles } from './WorkVehicles'
import { Guardrails } from './Guardrails'

export function Roadway({
  layout,
  params,
  devices,
  selectedId,
  onSelectSign,
}: {
  layout: RoadLayout
  params: Params
  devices: DeviceLayout
  selectedId: string | null
  onSelectSign: (spot: SignSpot) => void
}) {
  const { cs } = layout
  const length = layout.totalLength
  const roadMid = (layout.roadZ0 + layout.roadZ1) / 2
  const upMarks = useLaneMarkingGeometry(layout, {
    outer: cs.UP.edgeOuter,
    split: cs.UP.laneSplit,
    inner: cs.UP.edgeInner,
  })
  const downMarks = useLaneMarkingGeometry(layout, {
    outer: cs.DOWN.edgeOuter,
    split: cs.DOWN.laneSplit,
    inner: cs.DOWN.edgeInner,
  })

  const primarySign: 1 | -1 = params.direction === 'up' ? -1 : 1
  const workMidZ = (layout.segments[3]!.z0 + layout.segments[3]!.z1) / 2
  const bandX = (sign: 1 | -1) => {
    const cw = sign === 1 ? cs.DOWN : cs.UP
    return params.doubleSide || params.workSide === 'median' ? cw.edgeInner : cw.edgeOuter
  }
  const bandW = layout.mode === 'schematic' ? 8 : 0.55
  const bands = [
    ...layout.segments.map((seg) => ({
      key: seg.key,
      sign: primarySign,
      z0: seg.z0,
      z1: seg.z1,
      color: seg.color,
    })),
    ...(params.doubleSide
      ? layout.segments.map((seg) => ({
          key: `${seg.key}-rot`,
          sign: (primarySign === 1 ? -1 : 1) as 1 | -1,
          z0: 2 * workMidZ - seg.z1,
          z1: 2 * workMidZ - seg.z0,
          color: seg.color,
        }))
      : []),
  ]

  return (
    <group>
      {/* 3D 微缩沙盘立体地台 (顶面精确位于 cs.ROAD_Y - 0.4，比路面低 0.4 个单位，彻底杜绝任何面重叠与深度冲突) */}
      <group position={[0, cs.ROAD_Y - 1.2, roadMid]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[cs.ROAD_WIDTH + 36, 1.6, length + 48]} />
          <meshStandardMaterial color="#d2dfce" roughness={1} metalness={0} />
        </mesh>
        <mesh position={[0, -0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[cs.ROAD_WIDTH + 38, 0.22, length + 50]} />
          <meshStandardMaterial color="#cfcbbe" roughness={0.7} metalness={0.12} />
        </mesh>
      </group>

      {/* 沉稳深色沥青路面结构层 (带 0.4 厚度的实体路基，坚实立于地台之上，零 Z-fighting) */}
      <mesh position={[0, cs.ROAD_Y - 0.2, roadMid]} receiveShadow>
        <boxGeometry args={[cs.ROAD_WIDTH, 0.4, length]} />
        <meshStandardMaterial color="#1f1e1c" roughness={0.92} metalness={0.02} />
      </mesh>
      {/* 实体中央分隔带绿化岛 (带 0.16 厚度的实体岛座，彻底根除 0.005 深度冲突与边缘闪烁) */}
      <mesh position={[0, cs.ROAD_Y + 0.08, roadMid]} receiveShadow>
        <boxGeometry args={[cs.MEDIAN, 0.16, length]} />
        <meshStandardMaterial color="#738668" roughness={0.95} />
      </mesh>

      {/* 高速公路波形梁钢护栏 (路侧 + 中分带) 与中分带绿色防眩板系统 */}
      <Guardrails cs={cs} length={length} roadMid={roadMid} />

      <LaneMarks geometry={upMarks.white} color="#fdfdfc" />
      <LaneMarks geometry={upMarks.yellow} color="#f5a623" />
      <LaneMarks geometry={downMarks.white} color="#fdfdfc" />
      <LaneMarks geometry={downMarks.yellow} color="#f5a623" />

      {bands.map((band) => (
        <mesh
          key={band.key}
          position={[bandX(band.sign) + band.sign * bandW, cs.ROAD_Y + 0.05, (band.z0 + band.z1) / 2]}
        >
          <boxGeometry args={[bandW, 0.08, Math.max(0.2, Math.abs(band.z1 - band.z0) - 0.4)]} />
          <meshStandardMaterial
            color={band.color}
            roughness={0.55}
            emissive={band.color}
            emissiveIntensity={0.08}
            polygonOffset
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
          />
        </mesh>
      ))}

      <ClosedLanes lanes={devices.closedLanes} y={cs.ROAD_Y} />
      <WorkVehicles layout={layout} params={params} y={cs.ROAD_Y} />
      <Cones key={`${devices.cones.length}-${params.doubleSide}`} spots={devices.cones} size={layout.mode === 'schematic' ? 12 : 1} y={cs.ROAD_Y} />
      <Signs
        spots={devices.signs}
        selectedId={selectedId}
        onSelect={onSelectSign}
        schematic={layout.mode === 'schematic'}
        lane={cs.LANE}
      />
      <Traffic
        key={`${layout.mode}-${length}-${params.direction}-${params.workSide}-${params.doubleSide}`}
        layout={layout}
        params={params}
      />
      <DirectionChevrons z0={layout.roadZ0} z1={layout.roadZ1} cs={cs} />
    </group>
  )
}

function DirectionChevrons({ z0, z1, cs }: { z0: number; z1: number; cs: CrossSection }) {
  const a = z0 + cs.LANE * 0.4
  const b = z1 - cs.LANE * 0.4
  const step = Math.max(cs.LANE, (b - a) / 12)
  const zs: number[] = []
  for (let z = a; z <= b; z += step) zs.push(z)
  const s = cs.kind === 'diagram' ? 2.4 : 1
  return (
    <group>
      {zs.map((z) => (
        <group key={z}>
          <Chevron x={cs.UP.laneMid} z={z} yaw={0} y={cs.ROAD_Y} s={s} />
          <Chevron x={cs.DOWN.laneMid} z={z} yaw={Math.PI} y={cs.ROAD_Y} s={s} />
        </group>
      ))}
    </group>
  )
}

function Chevron({ x, z, yaw, y, s }: { x: number; z: number; yaw: number; y: number; s: number }) {
  return (
    <group position={[x, y + 0.03 * s, z]} rotation={[0, yaw, 0]} scale={s}>
      <mesh>
        <boxGeometry args={[0.42, 0.025, 3.6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} emissive="#ffffff" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.52, 0, 1.05]} rotation={[0, 0.55, 0]}>
        <boxGeometry args={[0.34, 0.025, 1.7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} emissive="#ffffff" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-0.52, 0, 1.05]} rotation={[0, -0.55, 0]}>
        <boxGeometry args={[0.34, 0.025, 1.7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} emissive="#ffffff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}


