import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { isRoadBoard, signBoardSize, type SignSpot } from '../layout/devices'
import type { SignType } from '../../types'

const SIGN_TYPES: SignType[] = [
  'construction1600',
  'construction800',
  'length',
  'smart',
  'limit80',
  'limit60',
  'limit40',
  'laneLeft',
  'laneRight',
  'noOvertake',
  'arrowLeft',
  'arrowRight',
  'end60',
  'end40',
  'endOvertake',
  'fence',
]

const SIGN_URLS = SIGN_TYPES.map((t) => `/signs/${t}.png`)

export function Signs({
  spots,
  selectedId,
  onSelect,
  schematic,
  lane,
}: {
  spots: SignSpot[]
  selectedId: string | null
  onSelect: (spot: SignSpot) => void
  schematic: boolean
  lane: number
}) {
  const maps = useTexture(SIGN_URLS) as THREE.Texture[]
  const byType = useMemo(() => {
    const out = {} as Record<SignType, THREE.Texture>
    SIGN_TYPES.forEach((type, i) => {
      const tex = maps[i]!
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      tex.needsUpdate = true
      out[type] = tex
    })
    return out
  }, [maps])

  return (
    <group>
      {spots.map((spot) => (
        <SignPost
          key={spot.id}
          spot={spot}
          map={byType[spot.type]}
          selected={spot.id === selectedId}
          onSelect={onSelect}
          schematic={schematic}
          lane={lane}
        />
      ))}
    </group>
  )
}

function SignPost({
  spot,
  map,
  selected,
  onSelect,
  schematic,
  lane,
}: {
  spot: SignSpot
  map: THREE.Texture
  selected: boolean
  onSelect: (spot: SignSpot) => void
  schematic: boolean
  lane: number
}) {
  const board = isRoadBoard(spot.type)
  const { w, h } = signBoardSize(spot.type, schematic, lane, spot.boardW)
  const y = schematic ? 0.35 : 0.04
  const postH = board
    ? schematic
      ? 2.8
      : 0.22
    : schematic
      ? 28
      : spot.onRoad
        ? 1.15
        : 1.85
  const boardY = board ? y + h / 2 + (schematic ? 0.45 : 0.08) : y + postH + h / 2 - 0.08
  const postR = schematic ? (board ? 0.35 : 0.7) : 0.04

  return (
    <group position={[spot.x, 0, spot.z]} rotation={[0, spot.yaw, 0]}>
      {board ? (
        <>
          <mesh position={[-w * 0.35, y + postH / 2, 0]} castShadow>
            <cylinderGeometry args={[postR, postR * 1.1, postH, 8]} />
            <meshStandardMaterial color="#8c8275" roughness={0.45} metalness={0.3} />
          </mesh>
          <mesh position={[w * 0.35, y + postH / 2, 0]} castShadow>
            <cylinderGeometry args={[postR, postR * 1.1, postH, 8]} />
            <meshStandardMaterial color="#8c8275" roughness={0.45} metalness={0.3} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, y + postH / 2, 0]} castShadow>
          <cylinderGeometry args={[postR, schematic ? 0.95 : 0.05, postH, 8]} />
          <meshStandardMaterial color="#8c8275" roughness={0.45} metalness={0.3} />
        </mesh>
      )}
      <mesh
        position={[0, boardY, 0]}
        onPointerDown={(e) => {
          e.stopPropagation()
          e.nativeEvent.stopImmediatePropagation()
          onSelect(spot)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          map={map}
          transparent
          alphaTest={0.2}
          depthWrite={true}
          side={THREE.DoubleSide}
          color={selected ? '#ffe4cc' : '#ffffff'}
        />
      </mesh>
      {selected ? (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[schematic ? 4 : 0.35, schematic ? 5.5 : 0.48, 24]} />
          <meshBasicMaterial color="#e85d04" transparent opacity={0.85} />
        </mesh>
      ) : null}
    </group>
  )
}
