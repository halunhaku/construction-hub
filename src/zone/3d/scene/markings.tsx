import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { RoadLayout } from '../layout/buildLayout'

function boxAt(x: number, z0: number, z1: number, w: number, y: number, h: number) {
  const geo = new THREE.BoxGeometry(w, h, Math.max(0.05, z1 - z0))
  geo.translate(x, y + h / 2, (z0 + z1) / 2)
  return geo
}

function dashedBoxesScaled(x: number, z0: number, z1: number, w: number, y: number, h: number, dash: number, gap: number) {
  const geos: THREE.BufferGeometry[] = []
  let z = z0 + 1
  while (z < z1) {
    const b = Math.min(z + dash, z1)
    if (b - z > dash * 0.25) geos.push(boxAt(x, z, b, w, y, h))
    z += dash + gap
  }
  return geos
}

export function useLaneMarkingGeometry(layout: RoadLayout, xs: { outer: number; split: number; inner: number }) {
  return useMemo(() => {
    const z0 = layout.roadZ0
    const z1 = layout.roadZ1
    const y = layout.cs.ROAD_Y + 0.02
    const mark = layout.cs.MARK_W
    const h = layout.cs.kind === 'diagram' ? 0.45 : 0.018
    const dash = layout.cs.kind === 'diagram' ? 14 : 6
    const gap = layout.cs.kind === 'diagram' ? 18 : 9
    const whiteParts = [boxAt(xs.outer, z0, z1, mark, y, h), ...dashedBoxesScaled(xs.split, z0, z1, mark, y, h, dash, gap)]
    const yellowParts = [boxAt(xs.inner, z0, z1, mark * 0.9, y, h)]
    const white = mergeGeometries(whiteParts, false)
    const yellow = mergeGeometries(yellowParts, false)
    for (const g of [...whiteParts, ...yellowParts]) g.dispose()
    if (!white || !yellow) throw new Error('lane marking merge failed')
    return { white, yellow }
  }, [layout, xs.inner, xs.outer, xs.split])
}

export function LaneMarks({
  geometry,
  color,
}: {
  geometry: THREE.BufferGeometry
  color: string
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial
        ref={mat}
        color={color}
        roughness={0.25}
        metalness={0.02}
        emissive={color}
        emissiveIntensity={0.35}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  )
}
