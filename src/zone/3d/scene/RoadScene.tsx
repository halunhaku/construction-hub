import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { roadsideEyeX, roadsideLookX } from '../layout/cameraPath'
import type { RoadLayout } from '../layout/buildLayout'

import type { DeviceLayout, SignSpot } from '../layout/devices'
import { canvasToPng } from '../ui/export3d'
import type { Params } from '../../types'
import { Roadway } from './Roadway'

export type CaptureFn = () => Promise<Blob>

export type CameraApi = {
  rotate: (azimDelta: number) => void
  zoom: (factor: number) => void
  reset: () => void
}

function FitOrbit({
  roadZ0,
  roadZ1,
  eyeX,
  lookX,
  cameraRef,
}: {
  roadZ0: number
  roadZ1: number
  eyeX: number
  lookX: number
  cameraRef?: MutableRefObject<CameraApi | null>
}) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null

  useEffect(() => {
    const applyDefault = () => {
      const span = Math.max(80, roadZ1 - roadZ0)
      const side = eyeX === 0 ? -1 : Math.sign(eyeX)
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.2
      const aspectComp = Math.max(0.45, Math.min(1.6, aspect))

      // 默认全景：视距拉开，确保起点 1600m 标牌与末端终止区标牌全部 100% 收录在视口内
      const distTarget = Math.max(1250, (span * 2.15) / Math.sqrt(aspectComp))
      const targetZ = roadZ0 + span * 0.44
      camera.position.set(
        side * (distTarget * 0.58),
        distTarget * 0.64,
        targetZ - distTarget * 0.52,
      )
      camera.near = 8
      camera.far = Math.max(4500, span * 10)
      camera.updateProjectionMatrix()
      if (!controls) return
      controls.target.set(0, 6, targetZ)
      controls.update()
      const dist = camera.position.distanceTo(controls.target)
      const polar = controls.getPolarAngle()
      controls.minDistance = dist * 0.25
      controls.maxDistance = dist * 2.5
      controls.minPolarAngle = Math.max(0.15, polar - 0.55)
      controls.maxPolarAngle = Math.min(Math.PI / 2 - 0.08, polar + 0.38)
      controls.minAzimuthAngle = -Infinity
      controls.maxAzimuthAngle = Infinity
      controls.enablePan = false
      controls.update()
    }
    applyDefault()
    if (!cameraRef) return
    cameraRef.current = {
      reset: applyDefault,
      rotate(azimDelta) {
        if (!controls) return
        const offset = camera.position.clone().sub(controls.target)
        const spherical = new THREE.Spherical().setFromVector3(offset)
        spherical.theta = Math.min(controls.maxAzimuthAngle, Math.max(controls.minAzimuthAngle, spherical.theta + azimDelta))
        spherical.makeSafe()
        offset.setFromSpherical(spherical)
        camera.position.copy(controls.target).add(offset)
        controls.update()
      },
      zoom(factor) {
        if (!controls) return
        const dist = camera.position.distanceTo(controls.target)
        const next = Math.min(controls.maxDistance, Math.max(controls.minDistance, dist * factor))
        const offset = camera.position.clone().sub(controls.target).setLength(next)
        camera.position.copy(controls.target).add(offset)
        controls.update()
      },
    }
    return () => {
      cameraRef.current = null
    }
  }, [camera, cameraRef, controls, eyeX, lookX, roadZ0, roadZ1])

  return null
}

function Lights({ length, roadMid }: { length: number; roadMid: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const targetObj = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0, 0, roadMid)
    return obj
  }, [roadMid])

  useLayoutEffect(() => {
    if (lightRef.current) {
      lightRef.current.target = targetObj
      lightRef.current.target.updateMatrixWorld()
    }
  }, [targetObj])

  const shadowSpanX = 240
  const shadowSpanZ = length * 0.58 + 60

  return (
    <>
      <hemisphereLight args={['#ffffff', '#82957b', 0.92]} />
      <primitive object={targetObj} />
      <directionalLight
        ref={lightRef}
        castShadow
        position={[140, 160, roadMid + length * 0.15]}
        intensity={1.85}
        color="#fffbf2"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={Math.max(600, length * 2.5)}
        shadow-camera-left={-shadowSpanX}
        shadow-camera-right={shadowSpanX}
        shadow-camera-top={shadowSpanZ}
        shadow-camera-bottom={-shadowSpanZ}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
      />
      <ambientLight intensity={0.42} color="#fffcf5" />
    </>
  )
}

function CaptureBridge({ captureRef }: { captureRef?: MutableRefObject<CaptureFn | null> }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useLayoutEffect(() => {
    if (!captureRef) return
    captureRef.current = async () => {
      gl.render(scene, camera)
      return canvasToPng(gl.domElement)
    }
    return () => {
      captureRef.current = null
    }
  }, [camera, captureRef, gl, scene])

  return null
}

export function RoadScene({
  layout,
  params,
  devices,
  selectedId,
  onSelectSign,
  onMiss,
  captureRef,
  cameraRef,
}: {
  layout: RoadLayout
  params: Params
  devices: DeviceLayout
  selectedId: string | null
  onSelectSign: (spot: SignSpot) => void
  onMiss: () => void
  captureRef?: MutableRefObject<CaptureFn | null>
  cameraRef?: MutableRefObject<CameraApi | null>
}) {
  const fogFar = Math.max(3000, layout.totalLength * 5)
  const fogNear = 1800
  const bg = '#f0f2f5'

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, logarithmicDepthBuffer: true }}
      camera={{ fov: 32, near: 8, far: 4000, position: [130, 105, 170] }}
      onPointerMissed={onMiss}
      onCreated={({ gl }) => {
        gl.setClearColor(bg)
      }}
    >
      <fog attach="fog" args={[bg, fogNear, fogFar]} />
      <CaptureBridge captureRef={captureRef} />
      <Lights length={layout.totalLength} roadMid={(layout.roadZ0 + layout.roadZ1) / 2} />
      <Roadway
        layout={layout}
        params={params}
        devices={devices}
        selectedId={selectedId}
        onSelectSign={onSelectSign}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.28}
        zoomSpeed={0.38}
      />
      <FitOrbit
        roadZ0={layout.roadZ0}
        roadZ1={layout.roadZ1}
        eyeX={roadsideEyeX(params, layout.cs)}
        lookX={roadsideLookX(params, layout.cs)}
        cameraRef={cameraRef}
      />
    </Canvas>
  )
}
