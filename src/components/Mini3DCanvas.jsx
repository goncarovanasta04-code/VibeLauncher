import { useEffect, useRef } from 'react'

/**
 * Lightweight real-time 3D canvas preview for theme cards & floating hover tooltip.
 * Renders rotating polyhedra, perspective ground grid, and stardust in real-time.
 */
export default function Mini3DCanvas({ colorMode = 'monochrome', width = 280, height = 150 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let isMounted = true

    const PALETTES = {
      monochrome: {
        bg: '#040406',
        grid: 'rgba(255, 255, 255, 0.12)',
        edge: (alpha) => `rgba(255, 255, 255, ${alpha})`,
        vertex: (alpha) => `rgba(255, 255, 255, ${Math.min(1, alpha * 1.8)})`,
        star: 'rgba(255, 255, 255, 0.6)',
      },
      cyber: {
        bg: '#040714',
        grid: 'rgba(6, 182, 212, 0.18)',
        edge: (alpha, i) => (i % 2 === 0 ? `rgba(6, 182, 212, ${alpha})` : `rgba(168, 85, 247, ${alpha})`),
        vertex: (alpha) => `rgba(103, 232, 249, ${Math.min(1, alpha * 1.8)})`,
        star: 'rgba(56, 189, 248, 0.8)',
      },
      gold: {
        bg: '#0b0804',
        grid: 'rgba(245, 158, 11, 0.18)',
        edge: (alpha) => `rgba(251, 191, 36, ${alpha})`,
        vertex: (alpha) => `rgba(254, 240, 138, ${Math.min(1, alpha * 1.8)})`,
        star: 'rgba(253, 224, 71, 0.8)',
      },
      emerald: {
        bg: '#020e08',
        grid: 'rgba(16, 185, 129, 0.18)',
        edge: (alpha) => `rgba(52, 211, 153, ${alpha})`,
        vertex: (alpha) => `rgba(167, 243, 208, ${Math.min(1, alpha * 1.8)})`,
        star: 'rgba(110, 231, 183, 0.8)',
      },
    }

    const palette = PALETTES[colorMode] || PALETTES.monochrome

    // 3D Polyhedra
    const cubeVertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ]
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ]

    const octaVertices = [
      [0, -1.4, 0], [0, 1.4, 0],
      [-1, 0, 0], [1, 0, 0],
      [0, 0, -1], [0, 0, 1],
    ]
    const octaEdges = [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [4, 3], [3, 5], [5, 2],
    ]

    // 2 Rotating preview shapes
    const shapes = [
      { vertices: cubeVertices, edges: cubeEdges, size: 28, x: -35, y: -6, z: 140, rx: 0.3, ry: 0.2, rz: 0.1, spdX: 0.015, spdY: 0.022 },
      { vertices: octaVertices, edges: octaEdges, size: 26, x: 38, y: 10, z: 160, rx: 0.8, ry: 0.5, rz: 0.4, spdX: 0.02, spdY: 0.016 },
    ]

    // Stars
    const stars = Array.from({ length: 24 }, () => ({
      x: (Math.random() - 0.5) * 260,
      y: (Math.random() - 0.5) * 160,
      z: Math.random() * 200 + 40,
    }))

    let gridOffset = 0
    let lastTime = performance.now()

    const render = (time) => {
      if (!isMounted) return
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      ctx.fillStyle = palette.bg
      ctx.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2 - 5
      const fov = 160

      // Ground horizon grid
      gridOffset = (gridOffset + 35 * dt) % 30
      const horizonY = cy + 34
      ctx.strokeStyle = palette.grid
      ctx.lineWidth = 1

      for (let i = -8; i <= 8; i++) {
        ctx.beginPath()
        ctx.moveTo(cx + i * 35, height)
        ctx.lineTo(cx + i * 4, horizonY)
        ctx.stroke()
      }

      for (let z = 20; z < 240; z += 30) {
        const ez = z - gridOffset
        if (ez > 10) {
          const py = horizonY + (fov * 25) / ez
          if (py > horizonY && py < height) {
            ctx.beginPath()
            ctx.moveTo(0, py)
            ctx.lineTo(width, py)
            ctx.stroke()
          }
        }
      }

      // Stars
      ctx.fillStyle = palette.star
      for (let s of stars) {
        s.z -= 40 * dt
        if (s.z <= 20) s.z = 240
        const scale = fov / s.z
        const px = cx + s.x * scale
        const py = cy + s.y * scale
        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.beginPath()
          ctx.arc(px, py, 1.1, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Shapes
      for (let s of shapes) {
        s.rx += s.spdX
        s.ry += s.spdY

        const cosX = Math.cos(s.rx), sinX = Math.sin(s.rx)
        const cosY = Math.cos(s.ry), sinY = Math.sin(s.ry)
        const cosZ = Math.cos(s.rz), sinZ = Math.sin(s.rz)

        const proj = []
        for (let v of s.vertices) {
          let x = v[0] * s.size, y = v[1] * s.size, z = v[2] * s.size
          let y1 = y * cosX - z * sinX
          let z1 = y * sinX + z * cosX
          let x2 = x * cosY + z1 * sinY
          let z2 = -x * sinY + z1 * cosY
          let x3 = x2 * cosZ - y1 * sinZ
          let y3 = x2 * sinZ + y1 * cosZ

          const wz = z2 + s.z
          const scale = fov / wz
          proj.push({ px: cx + (x3 + s.x) * scale, py: cy + (y3 + s.y) * scale })
        }

        ctx.lineWidth = 1.4
        for (let i = 0; i < s.edges.length; i++) {
          const [a, b] = s.edges[i]
          ctx.strokeStyle = palette.edge(0.85, i)
          ctx.beginPath()
          ctx.moveTo(proj[a].px, proj[a].py)
          ctx.lineTo(proj[b].px, proj[b].py)
          ctx.stroke()
        }

        for (let p of proj) {
          ctx.fillStyle = palette.vertex(0.9)
          ctx.beginPath()
          ctx.arc(p.px, p.py, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)
    return () => {
      isMounted = false
      cancelAnimationFrame(animId)
    }
  }, [colorMode, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
      }}
    />
  )
}
