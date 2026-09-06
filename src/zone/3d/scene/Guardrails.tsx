import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CrossSection } from '../layout/crossSection'

// 单侧独立波形梁护栏 (独立立柱 + 热镀锌波形护栏板 + 双波截面凸棱)
function WBeamSingle({
  x,
  y,
  length,
  roadMid,
  schematic,
  facing, // 1 或 -1，波形板凸面朝向行车道
}: {
  x: number
  y: number
  length: number
  roadMid: number
  schematic: boolean
  facing: 1 | -1
}) {
  const postH = schematic ? 5.6 : 0.85
  const postR = schematic ? 0.42 : 0.06
  const postSpacing = schematic ? 16 : 4.0
  const count = Math.max(4, Math.round(length / postSpacing))

  const postMeshRef = useRef<THREE.InstancedMesh>(null)
  const postGeo = useMemo(() => new THREE.CylinderGeometry(postR, postR, postH, 8), [postR, postH])

  useLayoutEffect(() => {
    if (!postMeshRef.current) return
    const dummy = new THREE.Object3D()
    const step = length / count
    const zStart = roadMid - length / 2

    for (let i = 0; i <= count; i++) {
      const z = zStart + i * step
      dummy.position.set(x, y + postH / 2, z)
      dummy.updateMatrix()
      postMeshRef.current.setMatrixAt(i, dummy.matrix)
    }
    postMeshRef.current.instanceMatrix.needsUpdate = true
  }, [count, length, postH, roadMid, x, y])

  useLayoutEffect(() => {
    return () => {
      postGeo.dispose()
    }
  }, [postGeo])

  // 波形梁板几何尺寸
  const beamH = schematic ? 2.4 : 0.35
  const beamT = schematic ? 0.38 : 0.05
  const beamY = y + postH * 0.6
  const beamX = x + facing * (postR + beamT / 2)

  return (
    <group>
      {/* 镀锌圆钢立柱阵列 */}
      <instancedMesh
        ref={postMeshRef}
        args={[postGeo, undefined, count + 1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#a1a1aa" roughness={0.4} metalness={0.45} />
      </instancedMesh>

      {/* 主波形钢护栏板 */}
      <mesh position={[beamX, beamY, roadMid]} castShadow receiveShadow>
        <boxGeometry args={[beamT, beamH, length]} />
        <meshStandardMaterial color="#e4e4e7" roughness={0.32} metalness={0.55} />
      </mesh>

      {/* 双波波折凸棱 (还原真实 W-Beam 视觉截面层次) */}
      <mesh position={[beamX + facing * (beamT * 0.25), beamY + beamH * 0.32, roadMid]}>
        <boxGeometry args={[beamT * 0.45, beamH * 0.22, length]} />
        <meshStandardMaterial color="#f4f4f5" roughness={0.28} metalness={0.6} />
      </mesh>
      <mesh position={[beamX + facing * (beamT * 0.25), beamY - beamH * 0.32, roadMid]}>
        <boxGeometry args={[beamT * 0.45, beamH * 0.22, length]} />
        <meshStandardMaterial color="#f4f4f5" roughness={0.28} metalness={0.6} />
      </mesh>
    </group>
  )
}

// 位于两道中分带护栏正中央 (X = 0) 的独立防眩板支架系统与防眩板阵列
function CentralGlareScreenSystem({
  x = 0,
  y,
  spanX,
  length,
  roadMid,
  schematic,
}: {
  x?: number
  y: number
  spanX: number
  length: number
  roadMid: number
  schematic: boolean
}) {
  const frameH = schematic ? 7.2 : 1.15
  const postR = schematic ? 0.36 : 0.05
  const frameSpacing = schematic ? 22 : 5.0
  const frameCount = Math.max(4, Math.round(length / frameSpacing))

  const frameMeshRef = useRef<THREE.InstancedMesh>(null)
  const crossMeshRef = useRef<THREE.InstancedMesh>(null)
  const postGeo = useMemo(() => new THREE.CylinderGeometry(postR, postR, frameH, 8), [postR, frameH])
  // 横跨在两道中分带护栏之间的刚性支撑连接横梁
  const crossGeo = useMemo(() => new THREE.BoxGeometry(spanX * 0.96, schematic ? 0.3 : 0.05, schematic ? 0.42 : 0.07), [spanX, schematic])

  useLayoutEffect(() => {
    if (!frameMeshRef.current || !crossMeshRef.current) return
    const dummy = new THREE.Object3D()
    const step = length / frameCount
    const zStart = roadMid - length / 2

    for (let i = 0; i <= frameCount; i++) {
      const z = zStart + i * step
      // 中央独立防眩支柱
      dummy.position.set(x, y + frameH / 2, z)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      frameMeshRef.current.setMatrixAt(i, dummy.matrix)

      // 横跨连接两道护栏的定位连接钢支架
      dummy.position.set(x, y + frameH * 0.65, z)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      crossMeshRef.current.setMatrixAt(i, dummy.matrix)
    }
    frameMeshRef.current.instanceMatrix.needsUpdate = true
    crossMeshRef.current.instanceMatrix.needsUpdate = true
  }, [frameCount, frameH, length, roadMid, x, y])

  useLayoutEffect(() => {
    return () => {
      postGeo.dispose()
      crossGeo.dispose()
    }
  }, [postGeo, crossGeo])

  // 通长固定安装纵向型钢导轨
  const railY = y + frameH

  // 绿色防眩板参数
  const glareH = schematic ? 4.8 : 0.82
  const glareW = schematic ? 1.8 : 0.22
  const glareT = schematic ? 0.26 : 0.035
  const glareSpacing = schematic ? 7.2 : 1.15
  const glareCount = Math.max(10, Math.round(length / glareSpacing))

  const glareMeshRef = useRef<THREE.InstancedMesh>(null)
  const glareGeo = useMemo(() => new THREE.BoxGeometry(glareW, glareH, glareT), [glareW, glareH, glareT])

  useLayoutEffect(() => {
    if (!glareMeshRef.current) return
    const dummy = new THREE.Object3D()
    const step = length / glareCount
    const zStart = roadMid - length / 2

    for (let i = 0; i <= glareCount; i++) {
      const z = zStart + i * step
      // 8°~10° 遮光斜角
      dummy.position.set(x, railY + glareH / 2, z)
      dummy.rotation.set(0, 0.16, 0)
      dummy.updateMatrix()
      glareMeshRef.current.setMatrixAt(i, dummy.matrix)
    }
    glareMeshRef.current.instanceMatrix.needsUpdate = true
  }, [glareCount, glareH, length, railY, roadMid, x])

  useLayoutEffect(() => {
    return () => {
      glareGeo.dispose()
    }
  }, [glareGeo])

  return (
    <group>
      {/* 1. 中分带中央独立支撑钢立柱 */}
      <instancedMesh
        ref={frameMeshRef}
        args={[postGeo, undefined, frameCount + 1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#78716c" roughness={0.45} metalness={0.35} />
      </instancedMesh>

      {/* 2. 横向跨接在两条中分带护栏之间的刚性固定支架 */}
      <instancedMesh
        ref={crossMeshRef}
        args={[crossGeo, undefined, frameCount + 1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#78716c" roughness={0.45} metalness={0.35} />
      </instancedMesh>

      {/* 3. 纵向通长防眩板固定横梁槽钢 */}
      <mesh position={[x, railY, roadMid]}>
        <boxGeometry args={[schematic ? 0.85 : 0.12, schematic ? 0.35 : 0.05, length]} />
        <meshStandardMaterial color="#78716c" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* 4. 居中排列的标准翠绿色防眩板阵列 (InstancedMesh 单批次合并渲染) */}
      <instancedMesh
        ref={glareMeshRef}
        args={[glareGeo, undefined, glareCount + 1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#15803d"
          roughness={0.5}
          metalness={0.06}
          emissive="#166534"
          emissiveIntensity={0.08}
        />
      </instancedMesh>
    </group>
  )
}

export function Guardrails({
  cs,
  length,
  roadMid,
}: {
  cs: CrossSection
  length: number
  roadMid: number
}) {
  const schematic = cs.kind === 'diagram'

  // 1. 路侧护栏 (分别布置于左右外路肩外沿，面向行车道)
  const leftRoadsideX = cs.UP.outerShoulder.x0 + (schematic ? 1.6 : 0.25)
  const rightRoadsideX = cs.DOWN.outerShoulder.x1 - (schematic ? 1.6 : 0.25)

  // 2. 中分带两条独立护栏：上行一条（面向 UP）、下行一条（面向 DOWN），中间保留真实宽度的绿化隔离带
  const medianHalf = cs.MEDIAN / 2
  const medianMargin = schematic ? 2.6 : 0.38
  const upMedianX = -medianHalf + medianMargin   // 上行中分带内侧路肩边缘 (面向 UP 靠左行车道)
  const downMedianX = medianHalf - medianMargin  // 下行中分带内侧路肩边缘 (面向 DOWN 靠右行车道)
  const medianSpanX = downMedianX - upMedianX    // 两条护栏之间的真实中央绿化跨距

  const roadY = cs.ROAD_Y
  const medianY = cs.ROAD_Y + 0.16 // 立于已抬升的中央绿化岛座之上

  return (
    <group>
      {/* 1. 左侧路侧波形梁护栏 */}
      <WBeamSingle
        x={leftRoadsideX}
        y={roadY}
        length={length}
        roadMid={roadMid}
        schematic={schematic}
        facing={1}
      />

      {/* 2. 右侧路侧波形梁护栏 */}
      <WBeamSingle
        x={rightRoadsideX}
        y={roadY}
        length={length}
        roadMid={roadMid}
        schematic={schematic}
        facing={-1}
      />

      {/* 3. 上行中分带波形护栏 (独立立柱与波形板，面向 UP 上行车道) */}
      <WBeamSingle
        x={upMedianX}
        y={medianY}
        length={length}
        roadMid={roadMid}
        schematic={schematic}
        facing={-1}
      />

      {/* 4. 下行中分带波形护栏 (独立立柱与波形板，面向 DOWN 下行车道) */}
      <WBeamSingle
        x={downMedianX}
        y={medianY}
        length={length}
        roadMid={roadMid}
        schematic={schematic}
        facing={1}
      />

      {/* 5. 位于两条中分带护栏正中央 (X = 0) 的防眩板支架架设系统与防眩板阵列 */}
      <CentralGlareScreenSystem
        x={0}
        y={medianY}
        spanX={medianSpanX}
        length={length}
        roadMid={roadMid}
        schematic={schematic}
      />
    </group>
  )
}
