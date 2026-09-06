import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

function noiseCanvas(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d unavailable')
  paint(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

export function makeAsphaltTexture() {
  return noiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#6a6b6e'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 14000; i++) {
      const v = 90 + Math.random() * 50
      const a = 0.1 + Math.random() * 0.22
      ctx.fillStyle = `rgba(${v},${v},${v + 4},${a})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.2, 1 + Math.random() * 1.4)
    }
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(40,40,42,${0.03 + Math.random() * 0.06})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 40 + Math.random() * 90, 8 + Math.random() * 18)
    }
  })
}

export function makeGrassTexture() {
  return noiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#6d8a58'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 9000; i++) {
      const r = 40 + Math.random() * 50
      const g = 90 + Math.random() * 80
      const b = 35 + Math.random() * 30
      ctx.fillStyle = `rgba(${r},${g},${b},${0.2 + Math.random() * 0.45})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 2 + Math.random() * 5)
    }
  })
}

export function useRoadTextures() {
  const textures = useMemo(() => {
    const asphalt = makeAsphaltTexture()
    const grass = makeGrassTexture()
    asphalt.repeat.set(3, 40)
    grass.repeat.set(400, 400)
    return { asphalt, grass }
  }, [])

  useEffect(() => {
    return () => {
      textures.asphalt.dispose()
      textures.grass.dispose()
    }
  }, [textures])

  return textures
}
