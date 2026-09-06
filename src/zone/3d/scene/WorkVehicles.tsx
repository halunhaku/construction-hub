import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { RoadLayout } from '../layout/buildLayout'
import type { Params } from '../../types'

// 轮胎小组件
function Wheel({ x, y, z, r = 0.38, w = 0.28 }: { x: number; y: number; z: number; r?: number; w?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, w, 14]} />
        <meshStandardMaterial color="#1c1917" roughness={0.85} />
      </mesh>
      {/* 轮毂 */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.52, r * 0.52, w + 0.02, 10]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  )
}

// 防撞缓冲车 (TMA)
function TmaTruck({ x, z, yaw, s }: { x: number; z: number; yaw: number; s: number }) {
  const beaconRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      // 黄色爆闪警示灯
      const t = clock.getElapsedTime() * 6
      beaconRef.current.emissiveIntensity = (Math.sin(t) > 0.1 ? 1.6 : 0.15)
    }
  })

  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]} scale={s}>
      {/* 底盘 */}
      <mesh position={[0, 0.45, 0.2]} castShadow>
        <boxGeometry args={[2.1, 0.25, 6.8]} />
        <meshStandardMaterial color="#292524" roughness={0.8} />
      </mesh>

      {/* 车头驾驶室 (工程黄) */}
      <mesh position={[0, 1.45, 2.2]} castShadow>
        <boxGeometry args={[2.15, 1.7, 2.2]} />
        <meshStandardMaterial color="#eab308" roughness={0.35} metalness={0.2} />
      </mesh>
      {/* 前挡风玻璃 */}
      <mesh position={[0, 1.62, 3.32]}>
        <boxGeometry args={[1.9, 0.85, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.5} transparent opacity={0.9} />
      </mesh>
      {/* 侧车窗 */}
      <mesh position={[1.09, 1.62, 2.2]}>
        <boxGeometry args={[0.06, 0.75, 1.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.5} />
      </mesh>
      <mesh position={[-1.09, 1.62, 2.2]}>
        <boxGeometry args={[0.06, 0.75, 1.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.5} />
      </mesh>

      {/* 驾驶室顶部警示排灯 */}
      <mesh position={[0, 2.38, 2.2]}>
        <boxGeometry args={[1.4, 0.16, 0.28]} />
        <meshStandardMaterial ref={beaconRef} color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.2} />
      </mesh>

      {/* 车身设备箱 */}
      <mesh position={[0, 1.15, 0.3]} castShadow>
        <boxGeometry args={[2.08, 1.15, 1.8]} />
        <meshStandardMaterial color="#d97706" roughness={0.45} />
      </mesh>

      {/* 车尾防撞缓冲模块 (TMA 核心吸能包) */}
      <mesh position={[0, 0.85, -2.1]} castShadow>
        <boxGeometry args={[2.18, 0.95, 2.2]} />
        <meshStandardMaterial color="#eab308" roughness={0.4} />
      </mesh>

      {/* 防撞包尾部黄黑警示反光斜条纹面板 */}
      <mesh position={[0, 0.85, -3.22]}>
        <boxGeometry args={[2.14, 0.9, 0.06]} />
        <meshStandardMaterial color="#18181b" roughness={0.6} />
      </mesh>
      {/* 导向箭头发光板 */}
      <mesh position={[0, 2.05, -2.0]} castShadow>
        <boxGeometry args={[1.8, 1.2, 0.12]} />
        <meshStandardMaterial color="#1c1917" roughness={0.6} />
      </mesh>
      {/* 箭头指示符号 (发光黄) */}
      <mesh position={[0, 2.05, -2.08]}>
        <boxGeometry args={[1.4, 0.9, 0.05]} />
        <meshStandardMaterial color="#eab308" emissive="#facc15" emissiveIntensity={0.8} />
      </mesh>

      {/* 车轮 (前双轮 + 后双轴四轮) */}
      <Wheel x={1.05} y={0.38} z={2.2} />
      <Wheel x={-1.05} y={0.38} z={2.2} />
      <Wheel x={1.05} y={0.38} z={-0.6} />
      <Wheel x={-1.05} y={0.38} z={-0.6} />
      <Wheel x={1.05} y={0.38} z={-1.4} />
      <Wheel x={-1.05} y={0.38} z={-1.4} />
    </group>
  )
}

// 养护工程作业车 (Maintenance Utility Truck)
function MaintenanceTruck({ x, z, yaw, s }: { x: number; z: number; yaw: number; s: number }) {
  const flashRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    if (flashRef.current) {
      const t = clock.getElapsedTime() * 4.5
      flashRef.current.emissiveIntensity = 0.4 + 0.6 * Math.sin(t)
    }
  })

  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]} scale={s}>
      {/* 底盘 */}
      <mesh position={[0, 0.42, 0.1]} castShadow>
        <boxGeometry args={[1.95, 0.22, 5.4]} />
        <meshStandardMaterial color="#292524" roughness={0.8} />
      </mesh>

      {/* 驾驶室 (工程黄) */}
      <mesh position={[0, 1.25, 1.5]} castShadow>
        <boxGeometry args={[1.98, 1.45, 1.9]} />
        <meshStandardMaterial color="#eab308" roughness={0.35} metalness={0.2} />
      </mesh>
      {/* 前挡风 */}
      <mesh position={[0, 1.42, 2.46]}>
        <boxGeometry args={[1.78, 0.72, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.5} transparent opacity={0.9} />
      </mesh>

      {/* 顶部黄色施工警示排灯 */}
      <mesh position={[0, 2.06, 1.5]}>
        <boxGeometry args={[1.2, 0.14, 0.24]} />
        <meshStandardMaterial ref={flashRef} color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>

      {/* 后货箱栏板 */}
      <mesh position={[0, 0.95, -0.9]} castShadow>
        <boxGeometry args={[1.96, 0.78, 2.8]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.95, -0.9]}>
        <boxGeometry args={[1.78, 0.68, 2.65]} />
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </mesh>

      {/* 货箱内施工锥桶与工具箱 */}
      <mesh position={[0.4, 0.82, -0.6]} castShadow>
        <boxGeometry args={[0.55, 0.5, 0.7]} />
        <meshStandardMaterial color="#44403c" roughness={0.7} />
      </mesh>
      <mesh position={[-0.35, 0.9, -0.7]} castShadow>
        <cylinderGeometry args={[0.18, 0.35, 0.75, 10]} />
        <meshStandardMaterial color="#f97316" roughness={0.4} />
      </mesh>
      <mesh position={[-0.35, 0.9, -1.3]} castShadow>
        <cylinderGeometry args={[0.18, 0.35, 0.75, 10]} />
        <meshStandardMaterial color="#f97316" roughness={0.4} />
      </mesh>

      {/* 4 轮 */}
      <Wheel x={0.98} y={0.36} z={1.5} />
      <Wheel x={-0.98} y={0.36} z={1.5} />
      <Wheel x={0.98} y={0.36} z={-1.1} />
      <Wheel x={-0.98} y={0.36} z={-1.1} />
    </group>
  )
}

export function WorkVehicles({
  layout,
  params,
  y = 0.04,
}: {
  layout: RoadLayout
  params: Params
  y?: number
}) {
  const scale = layout.cs.kind === 'diagram' ? 3.0 : 1.0

  const vehicles = useMemo(() => {
    const list: Array<{
      type: 'tma' | 'truck'
      x: number
      z: number
      yaw: number
      key: string
    }> = []

    const addForSide = (which: 'up' | 'down') => {
      const cw = which === 'up' ? layout.cs.UP : layout.cs.DOWN
      const closeInner = params.workSide === 'median' || params.doubleSide
      const lane = closeInner ? cw.innerLane : cw.outerLane
      const laneX = (lane.x0 + lane.x1) / 2
      const dir: 1 | -1 = params.doubleSide ? (which === 'up' ? 1 : -1) : which === params.direction ? 1 : -1
      const yaw = dir > 0 ? 0 : Math.PI

      // 缓冲区与作业区段
      const buffer = layout.segments[2]
      const work = layout.segments[3]
      if (!buffer || !work) return

      let tmaZ: number
      let truckZ: number

      if (dir > 0) {
        // 上行：车尾朝向来车方向 (防撞缓冲车朝向前方行驶方向)
        tmaZ = buffer.z0 + (buffer.z1 - buffer.z0) * 0.72
        truckZ = work.z0 + (work.z1 - work.z0) * 0.42
      } else {
        // 下行对向
        const cz = (work.z0 + work.z1) / 2
        const origTmaZ = buffer.z0 + (buffer.z1 - buffer.z0) * 0.72
        const origTruckZ = work.z0 + (work.z1 - work.z0) * 0.42
        tmaZ = 2 * cz - origTmaZ
        truckZ = 2 * cz - origTruckZ
      }

      list.push({
        type: 'tma',
        x: laneX,
        z: tmaZ,
        yaw,
        key: `tma-${which}`,
      })

      list.push({
        type: 'truck',
        x: laneX,
        z: truckZ,
        yaw,
        key: `truck-${which}`,
      })
    }

    if (params.direction === 'up' || params.doubleSide) {
      addForSide('up')
    }
    if (params.direction === 'down' || params.doubleSide) {
      addForSide('down')
    }

    return list
  }, [layout, params])

  return (
    <group position={[0, y, 0]}>
      {vehicles.map((v) =>
        v.type === 'tma' ? (
          <TmaTruck key={v.key} x={v.x} z={v.z} yaw={v.yaw} s={scale} />
        ) : (
          <MaintenanceTruck key={v.key} x={v.x} z={v.z} yaw={v.yaw} s={scale} />
        ),
      )}
    </group>
  )
}
