import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { displaySpeed, pathX, pathYaw, trafficPaths, type TrafficPath } from '../layout/traffic'
import type { RoadLayout } from '../layout/buildLayout'
import type { Params } from '../../types'

const PALETTE = ['#fdfcf7', '#3d4450', '#c86446', '#64748b', '#e0a96d', '#6b8e7d', '#5b8bf7', '#d9534f', '#f7b05b']

export type VehicleModelType = 'sedan' | 'suv' | 'truck'

// 车辆通用轮胎
function Wheel({ x, y, z, r = 0.32, w = 0.22 }: { x: number; y: number; z: number; r?: number; w?: number }) {
  return (
    <group position={[x, y, z]}>
      {/* 橡胶轮胎 */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, w, 12]} />
        <meshStandardMaterial color="#1c1917" roughness={0.9} />
      </mesh>
      {/* 银色轮毂 */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.54, r * 0.54, w + 0.02, 8]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  )
}

// 1. 家用/商务轿车 (Sedan)
function SedanMesh({ color }: { color: string }) {
  return (
    <group>
      {/* 车身底盘与发动机舱/后备箱 */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.72, 0.44, 4.3]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.22} />
      </mesh>
      {/* 深色车窗乘员舱核心 (实体深色，彻底根除透明排序与面重叠冲突) */}
      <mesh position={[0, 0.86, -0.2]} castShadow>
        <boxGeometry args={[1.5, 0.46, 2.14]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.5} />
      </mesh>
      {/* 乘员舱同色车顶盖板 */}
      <mesh position={[0, 1.1, -0.22]} castShadow>
        <boxGeometry args={[1.46, 0.06, 1.85]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} />
      </mesh>
      {/* 前大灯 (高亮白光) */}
      <mesh position={[0.62, 0.45, 2.14]}>
        <boxGeometry args={[0.26, 0.12, 0.06]} />
        <meshStandardMaterial color="#fffbeb" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.62, 0.45, 2.14]}>
        <boxGeometry args={[0.26, 0.12, 0.06]} />
        <meshStandardMaterial color="#fffbeb" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>

      {/* 尾部红色刹车/尾灯 */}
      <mesh position={[0.62, 0.46, -2.14]}>
        <boxGeometry args={[0.28, 0.12, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.0} />
      </mesh>
      <mesh position={[-0.62, 0.46, -2.14]}>
        <boxGeometry args={[0.28, 0.12, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.0} />
      </mesh>

      {/* 4 个轮胎 */}
      <Wheel x={0.84} y={0.32} z={1.3} />
      <Wheel x={-0.84} y={0.32} z={1.3} />
      <Wheel x={0.84} y={0.32} z={-1.3} />
      <Wheel x={-0.84} y={0.32} z={-1.3} />
    </group>
  )
}

// 2. 城市 SUV / 商务越野车
function SuvMesh({ color }: { color: string }) {
  return (
    <group>
      {/* 较高底盘下车体 */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[1.82, 0.54, 4.4]} />
        <meshStandardMaterial color={color} roughness={0.36} metalness={0.24} />
      </mesh>
      {/* 深色车窗乘员舱 (实体深色，消除双层重叠) */}
      <mesh position={[0, 1.02, -0.15]} castShadow>
        <boxGeometry args={[1.62, 0.56, 2.62]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.5} />
      </mesh>
      {/* 车顶盖板 */}
      <mesh position={[0, 1.31, -0.15]} castShadow>
        <boxGeometry args={[1.58, 0.06, 2.4]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} />
      </mesh>
      {/* 车顶银色行李架导轨 */}
      <mesh position={[0.7, 1.4, -0.15]}>
        <boxGeometry args={[0.06, 0.06, 2.1]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[-0.7, 1.4, -0.15]}>
        <boxGeometry args={[0.06, 0.06, 2.1]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* 前大灯 */}
      <mesh position={[0.66, 0.52, 2.19]}>
        <boxGeometry args={[0.28, 0.14, 0.06]} />
        <meshStandardMaterial color="#fffbeb" emissive="#ffffff" emissiveIntensity={0.85} />
      </mesh>
      <mesh position={[-0.66, 0.52, 2.19]}>
        <boxGeometry args={[0.28, 0.14, 0.06]} />
        <meshStandardMaterial color="#fffbeb" emissive="#ffffff" emissiveIntensity={0.85} />
      </mesh>

      {/* 贯穿式/双侧高位红尾灯 */}
      <mesh position={[0.66, 0.54, -2.19]}>
        <boxGeometry args={[0.28, 0.14, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.0} />
      </mesh>
      <mesh position={[-0.66, 0.54, -2.19]}>
        <boxGeometry args={[0.28, 0.14, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.0} />
      </mesh>

      {/* 4 个加大轮胎 */}
      <Wheel x={0.88} y={0.36} z={1.35} r={0.35} w={0.24} />
      <Wheel x={-0.88} y={0.36} z={1.35} r={0.35} w={0.24} />
      <Wheel x={0.88} y={0.36} z={-1.35} r={0.35} w={0.24} />
      <Wheel x={-0.88} y={0.36} z={-1.35} r={0.35} w={0.24} />
    </group>
  )
}

// 3. 高速公路厢式货车 (Cargo Truck)
function TruckMesh({ color }: { color: string }) {
  return (
    <group>
      {/* 重型大梁底盘 */}
      <mesh position={[0, 0.42, 0.2]} castShadow>
        <boxGeometry args={[2.0, 0.25, 7.2]} />
        <meshStandardMaterial color="#292524" roughness={0.85} />
      </mesh>

      {/* 前进气与防卷护栏 */}
      <mesh position={[0.96, 0.38, 0.2]}>
        <boxGeometry args={[0.06, 0.22, 2.8]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[-0.96, 0.38, 0.2]}>
        <boxGeometry args={[0.06, 0.22, 2.8]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* 前置驾驶室 (独立上色) */}
      <mesh position={[0, 1.4, 2.5]} castShadow>
        <boxGeometry args={[2.08, 1.6, 1.9]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* 驾驶室前风挡 */}
      <mesh position={[0, 1.55, 3.44]}>
        <boxGeometry args={[1.86, 0.8, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.5} transparent opacity={0.9} />
      </mesh>
      {/* 驾驶室顶部导流罩 */}
      <mesh position={[0, 2.25, 2.45]} castShadow>
        <boxGeometry args={[1.92, 0.3, 1.7]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>

      {/* 白色货运集装箱体 */}
      <mesh position={[0, 1.62, -0.9]} castShadow>
        <boxGeometry args={[2.14, 2.15, 4.8]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* 箱体侧边加强筋线条纹理块 */}
      <mesh position={[0, 0.62, -0.9]}>
        <boxGeometry args={[2.16, 0.08, 4.7]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* 卡车高位前大灯 */}
      <mesh position={[0.76, 0.68, 3.44]}>
        <boxGeometry args={[0.3, 0.16, 0.06]} />
        <meshStandardMaterial color="#fffbeb" emissive="#ffffff" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-0.76, 0.68, 3.44]}>
        <boxGeometry args={[0.3, 0.16, 0.06]} />
        <meshStandardMaterial color="#fffbeb" emissive="#ffffff" emissiveIntensity={0.9} />
      </mesh>

      {/* 货箱尾部多联式红白/红黄警示尾灯 */}
      <mesh position={[0.75, 0.55, -3.32]}>
        <boxGeometry args={[0.36, 0.16, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.0} />
      </mesh>
      <mesh position={[-0.75, 0.55, -3.32]}>
        <boxGeometry args={[0.36, 0.16, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.0} />
      </mesh>

      {/* 前转向轴双轮 */}
      <Wheel x={1.02} y={0.38} z={2.5} r={0.38} w={0.26} />
      <Wheel x={-1.02} y={0.38} z={2.5} r={0.38} w={0.26} />

      {/* 后负重双轴 4 轮 */}
      <Wheel x={1.02} y={0.38} z={-1.5} r={0.38} w={0.26} />
      <Wheel x={-1.02} y={0.38} z={-1.5} r={0.38} w={0.26} />
      <Wheel x={1.02} y={0.38} z={-2.4} r={0.38} w={0.26} />
      <Wheel x={-1.02} y={0.38} z={-2.4} r={0.38} w={0.26} />
    </group>
  )
}

function Car({
  path,
  speed,
  zMin,
  zMax,
  origin,
  color,
  modelType,
  y,
  s,
}: {
  path: TrafficPath
  speed: number
  zMin: number
  zMax: number
  origin: number
  color: string
  modelType: VehicleModelType
  y: number
  s: number
}) {
  const ref = useRef<THREE.Group>(null)
  const span = zMax - zMin

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    let z = g.position.z + path.dir * speed * dt
    if (path.dir > 0 && z > zMax) z -= span
    if (path.dir < 0 && z < zMin) z += span
    g.position.z = z
    g.position.x = pathX(path, z)
    g.rotation.y = pathYaw(path, z)
  })

  return (
    <group
      ref={ref}
      position={[pathX(path, origin), y, origin]}
      rotation={[0, pathYaw(path, origin), 0]}
      scale={s}
    >
      {modelType === 'truck' ? (
        <TruckMesh color={color} />
      ) : modelType === 'suv' ? (
        <SuvMesh color={color} />
      ) : (
        <SedanMesh color={color} />
      )}
    </group>
  )
}

export function Traffic({ layout, params }: { layout: RoadLayout; params: Params }) {
  const paths = useMemo(() => trafficPaths(layout, params), [layout, params])
  const speed = displaySpeed(params, layout.totalLength, layout.totalMeters)
  const zMin = layout.roadZ0 + 8
  const zMax = layout.roadZ1 - 8
  const span = zMax - zMin

  const cars = useMemo(() => {
    const out: Array<{
      path: TrafficPath
      origin: number
      color: string
      modelType: VehicleModelType
      key: string
    }> = []

    paths.forEach((path, li) => {
      const spacing = layout.mode === 'schematic' ? 95 : 72
      const n = Math.max(4, Math.round(span / spacing))
      const phase = path.merges ? 0.48 : (li % 3) * 0.17

      for (let i = 0; i < n; i++) {
        const t = (i + 0.2 + phase) / n
        const origin = path.dir > 0 ? zMin + t * span : zMax - t * span

        // 车型分配：约 60% 轿车，25% SUV，15% 货车
        const modelType: VehicleModelType =
          i % 6 === 0 ? 'truck' : i % 3 === 1 ? 'suv' : 'sedan'

        out.push({
          path,
          origin,
          color: PALETTE[(i * 3 + li * 2) % PALETTE.length]!,
          modelType,
          key: `${li}-${i}`,
        })
      }
    })
    return out
  }, [layout.mode, paths, span, zMax, zMin])

  return (
    <group>
      {cars.map((car) => (
        <Car
          key={car.key}
          path={car.path}
          origin={car.origin}
          color={car.color}
          modelType={car.modelType}
          speed={speed}
          zMin={zMin}
          zMax={zMax}
          y={layout.cs.ROAD_Y + 0.04}
          s={layout.cs.kind === 'diagram' ? 3.0 : 1.0}
        />
      ))}
    </group>
  )
}
