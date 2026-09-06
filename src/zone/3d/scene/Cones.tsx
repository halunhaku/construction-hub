import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { ConeSpot } from '../layout/devices'

function coneGeometry() {
  const body = new THREE.ConeGeometry(0.2, 0.7, 12, 1, false)
  body.translate(0, 0.35, 0)
  const stripe = new THREE.CylinderGeometry(0.145, 0.165, 0.08, 12)
  stripe.translate(0, 0.26, 0)
  const base = new THREE.CylinderGeometry(0.22, 0.22, 0.035, 12)
  base.translate(0, 0.018, 0)
  const merged = mergeGeometries([body, base], false)
  body.dispose()
  base.dispose()
  return { body: merged!, stripe }
}

export function Cones({ spots, size = 1, y = 0.04 }: { spots: ConeSpot[]; size?: number; y?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const stripeMesh = useRef<THREE.InstancedMesh>(null)
  const geos = useMemo(() => coneGeometry(), [])

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const box = new THREE.Box3()
    spots.forEach((spot, i) => {
      dummy.position.set(spot.x, y, spot.z)
      dummy.scale.setScalar(size)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(i, dummy.matrix)
      stripeMesh.current?.setMatrixAt(i, dummy.matrix)
      box.expandByPoint(dummy.position)
    })
    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    sphere.radius += 1.2 * size
    for (const inst of [mesh.current, stripeMesh.current]) {
      if (!inst) continue
      inst.instanceMatrix.needsUpdate = true
      inst.boundingBox = box.clone()
      inst.boundingSphere = sphere.clone()
      inst.frustumCulled = false
    }
  }, [size, spots, y])

  useLayoutEffect(() => {
    return () => {
      geos.body.dispose()
      geos.stripe.dispose()
    }
  }, [geos])

  if (spots.length === 0) return null

  return (
    <group>
      <instancedMesh ref={mesh} args={[geos.body, undefined, spots.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#ff661a" roughness={0.42} emissive="#ff5500" emissiveIntensity={0.08} />
      </instancedMesh>
      <instancedMesh ref={stripeMesh} args={[geos.stripe, undefined, spots.length]} frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.25} />
      </instancedMesh>
    </group>
  )
}
