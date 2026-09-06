import type { ClosedLane } from '../layout/devices'

export function ClosedLanes({ lanes, y = 0.04 }: { lanes: ClosedLane[]; y?: number }) {
  return (
    <group>
      {lanes.map((lane, i) => {
        const w = Math.abs(lane.x1 - lane.x0)
        const d = Math.abs(lane.z1 - lane.z0)
        return (
          <mesh
            key={i}
            position={[(lane.x0 + lane.x1) / 2, y + 0.04, (lane.z0 + lane.z1) / 2]}
          >
            <boxGeometry args={[w, 0.06, d]} />
            <meshStandardMaterial
              color={lane.color}
              transparent
              opacity={lane.color === '#FF3B30' ? 0.38 : 0.28}
              roughness={0.7}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>
        )
      })}
    </group>
  )
}
