import { useEffect, useRef } from 'react'

/**
 * Next-Gen 3D Fly-Through Canvas Animation Engine.
 * Supports multiple color themes (Monochrome, Cyber Matrix, Golden Nexus, Quantum Emerald, Hyperspace, Crystals, Ender).
 * Features smooth camera fly-through where 3D cubes and wireframe polyhedra fly directly INTO and PAST the camera,
 * interactive mouse parallax, floating stardust, and an infinite perspective horizon grid.
 */
export default function Monochrome3DBackground({
  paused = false,
  colorMode = 'monochrome', // 'monochrome' | 'cyber' | 'gold' | 'emerald' | 'hyperspace' | 'crystals' | 'ender'
  sceneType = 'minimal-void',
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    let isHidden = false

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const handleVisibility = () => {
      isHidden = document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Palette configurations based on colorMode
    const PALETTES = {
      monochrome: {
        bg: '#020204',
        grid: 'rgba(255, 255, 255, 0.08)',
        gridHorizon: 'rgba(255, 255, 255, 0.16)',
        star: (alpha) => `rgba(255, 255, 255, ${alpha})`,
        edge: (alpha) => `rgba(255, 255, 255, ${alpha})`,
        vertex: (alpha) => `rgba(255, 255, 255, ${Math.min(1, alpha * 1.6)})`,
      },
      cyber: {
        bg: '#030712',
        grid: 'rgba(6, 182, 212, 0.12)',
        gridHorizon: 'rgba(168, 85, 247, 0.22)',
        star: (alpha) => `rgba(56, 189, 248, ${alpha})`,
        edge: (alpha, i) => (i % 2 === 0 ? `rgba(6, 182, 212, ${alpha})` : `rgba(168, 85, 247, ${alpha})`),
        vertex: (alpha, i) => (i % 2 === 0 ? `rgba(103, 232, 249, ${Math.min(1, alpha * 1.8)})` : `rgba(216, 180, 254, ${Math.min(1, alpha * 1.8)})`),
      },
      gold: {
        bg: '#0a0804',
        grid: 'rgba(245, 158, 11, 0.1)',
        gridHorizon: 'rgba(251, 191, 36, 0.22)',
        star: (alpha) => `rgba(253, 224, 71, ${alpha})`,
        edge: (alpha) => `rgba(245, 158, 11, ${alpha})`,
        vertex: (alpha) => `rgba(254, 240, 138, ${Math.min(1, alpha * 1.8)})`,
      },
      emerald: {
        bg: '#020d08',
        grid: 'rgba(16, 185, 129, 0.1)',
        gridHorizon: 'rgba(52, 211, 153, 0.22)',
        star: (alpha) => `rgba(110, 231, 183, ${alpha})`,
        edge: (alpha) => `rgba(16, 185, 129, ${alpha})`,
        vertex: (alpha) => `rgba(167, 243, 208, ${Math.min(1, alpha * 1.8)})`,
      },
      hyperspace: {
        bg: '#02040a',
        grid: 'rgba(56, 189, 248, 0.12)',
        gridHorizon: 'rgba(129, 140, 248, 0.22)',
        star: (alpha) => `rgba(192, 132, 252, ${alpha})`,
        edge: (alpha, i) => (i % 2 === 0 ? `rgba(56, 189, 248, ${alpha})` : `rgba(129, 140, 248, ${alpha})`),
        vertex: (alpha, i) => (i % 2 === 0 ? `rgba(125, 211, 252, ${Math.min(1, alpha * 1.8)})` : `rgba(192, 132, 252, ${Math.min(1, alpha * 1.8)})`),
      },
      crystals: {
        bg: '#06060c',
        grid: 'rgba(236, 72, 153, 0.12)',
        gridHorizon: 'rgba(139, 92, 246, 0.22)',
        star: (alpha) => `rgba(244, 114, 182, ${alpha})`,
        edge: (alpha, i) => (i % 2 === 0 ? `rgba(236, 72, 153, ${alpha})` : `rgba(139, 92, 246, ${alpha})`),
        vertex: (alpha, i) => (i % 2 === 0 ? `rgba(249, 168, 212, ${Math.min(1, alpha * 1.8)})` : `rgba(196, 181, 253, ${Math.min(1, alpha * 1.8)})`),
      },
      ender: {
        bg: '#050209',
        grid: 'rgba(168, 85, 247, 0.12)',
        gridHorizon: 'rgba(6, 182, 212, 0.22)',
        star: (alpha) => `rgba(168, 85, 247, ${alpha})`,
        edge: (alpha, i) => (i % 2 === 0 ? `rgba(168, 85, 247, ${alpha})` : `rgba(6, 182, 212, ${alpha})`),
        vertex: (alpha, i) => (i % 2 === 0 ? `rgba(216, 180, 254, ${Math.min(1, alpha * 1.8)})` : `rgba(103, 232, 249, ${Math.min(1, alpha * 1.8)})`),
      },
    }

    const currentPalette = PALETTES[colorMode] || PALETTES.monochrome

    // 1. Cube (Primary Shape - Squares flying into camera)
    const cubeVertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ]
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ]

    // 2. Octahedron (Diamond / Crystal)
    const octaVertices = [
      [0, -1.5, 0], [0, 1.5, 0],
      [-1.1, 0, 0], [1.1, 0, 0],
      [0, 0, -1.1], [0, 0, 1.1],
    ]
    const octaEdges = [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [4, 3], [3, 5], [5, 2],
    ]

    // 3. Hexagonal Prism
    const hexVertices = []
    const hexEdges = []
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3
      hexVertices.push([Math.cos(angle) * 1.3, Math.sin(angle) * 1.3, -0.4])
      hexVertices.push([Math.cos(angle) * 1.3, Math.sin(angle) * 1.3, 0.4])
      const next = (i + 1) % 6
      hexEdges.push([i * 2, next * 2])
      hexEdges.push([i * 2 + 1, next * 2 + 1])
      hexEdges.push([i * 2, i * 2 + 1])
    }

    // 4. Tetrahedron (Pyramid)
    const tetraVertices = [
      [1, 1, 1],
      [-1, -1, 1],
      [-1, 1, -1],
      [1, -1, -1],
    ]
    const tetraEdges = [
      [0, 1], [0, 2], [0, 3],
      [1, 2], [2, 3], [3, 1],
    ]

    const numShapes = 32
    const shapes = []
    for (let i = 0; i < numShapes; i++) {
      // Prioritize cubes (squares flying into camera)
      const type = i % 2 === 0 ? 0 : (i % 4)
      let vertices = cubeVertices
      let edges = cubeEdges
      let baseSize = 36

      if (type === 1) {
        vertices = octaVertices
        edges = octaEdges
        baseSize = 38
      } else if (type === 2) {
        vertices = hexVertices
        edges = hexEdges
        baseSize = 36
      } else if (type === 3) {
        vertices = tetraVertices
        edges = tetraEdges
        baseSize = 40
      }

      shapes.push({
        vertices,
        edges,
        shapeIndex: i,
        x: (Math.random() - 0.5) * 1600,
        y: (Math.random() - 0.5) * 980,
        z: Math.random() * 1600 + 100, // Z depth range
        size: Math.random() * 26 + baseSize,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        speedX: (Math.random() - 0.5) * 0.018,
        speedY: (Math.random() - 0.5) * 0.018,
        speedZ: (Math.random() - 0.5) * 0.016,
        vz: Math.random() * 0.9 + 0.65, // Forward velocity towards camera
      })
    }

    // Floating 3D Star dust particles
    const stars = []
    const numStars = 80
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 1700,
        y: (Math.random() - 0.5) * 1200,
        z: Math.random() * 1600 + 50,
        vz: Math.random() * 0.6 + 0.35,
        size: Math.random() * 1.8 + 0.8,
      })
    }

    let mouseX = 0
    let mouseY = 0
    let targetMouseX = 0
    let targetMouseY = 0

    const onMouseMove = (e) => {
      targetMouseX = (e.clientX - width / 2) * 0.22
      targetMouseY = (e.clientY - height / 2) * 0.22
    }
    window.addEventListener('mousemove', onMouseMove)

    let gridOffset = 0
    let lastTime = performance.now()

    const render = (time) => {
      if (paused || isHidden) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      // Mouse easing
      mouseX += (targetMouseX - mouseX) * 0.06
      mouseY += (targetMouseY - mouseY) * 0.06

      // Deep canvas background
      ctx.fillStyle = currentPalette.bg
      ctx.fillRect(0, 0, width, height)

      const fov = 480
      const cx = width / 2 + mouseX * 0.65
      const cy = height / 2 + mouseY * 0.65

      // 1. Horizon 3D Perspective Ground Grid
      gridOffset = (gridOffset + 42 * dt) % 40
      ctx.lineWidth = 1
      const horizonY = cy + 130
      const gridLines = 26

      ctx.strokeStyle = currentPalette.grid
      for (let i = -gridLines; i <= gridLines; i++) {
        const xStart = cx + i * 95
        ctx.beginPath()
        ctx.moveTo(xStart, height)
        ctx.lineTo(cx + i * 8, horizonY)
        ctx.stroke()
      }

      // Horizontal ground rungs moving forward towards camera
      for (let z = 35; z < 800; z += 40) {
        const effectiveZ = z - gridOffset
        if (effectiveZ > 20) {
          const py = horizonY + (fov * 85) / effectiveZ
          if (py < height && py > horizonY) {
            const alpha = Math.min(0.18, ((py - horizonY) / (height - horizonY)) * 0.2)
            ctx.strokeStyle = currentPalette.gridHorizon
            ctx.beginPath()
            ctx.moveTo(0, py)
            ctx.lineTo(width, py)
            ctx.stroke()
          }
        }
      }

      // 2. Render 3D Stardust (fades in distant, fades out near camera)
      for (let s of stars) {
        s.z -= s.vz * 60 * dt
        if (s.z <= -80) {
          s.z = 1650
          s.x = (Math.random() - 0.5) * 1700
          s.y = (Math.random() - 0.5) * 1200
        }

        if (s.z > 20) {
          const scale = fov / s.z
          const px = cx + (s.x - mouseX) * scale
          const py = cy + (s.y - mouseY) * scale

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            let starAlpha = 0.5
            if (s.z > 1200) {
              starAlpha = Math.max(0, (1650 - s.z) / 450) * 0.5
            } else if (s.z < 150) {
              starAlpha = Math.max(0, (s.z + 50) / 200) * 0.7
            }
            ctx.fillStyle = currentPalette.star(starAlpha)
            ctx.beginPath()
            ctx.arc(px, py, Math.max(0.7, s.size * scale), 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // 3. Render 3D Geometric Polyhedra with Smooth Fly-Through & Outward Drift
      for (let c of shapes) {
        c.rx += c.speedX * 60 * dt
        c.ry += c.speedY * 60 * dt
        c.rz += c.speedZ * 60 * dt
        c.z -= c.vz * 60 * dt

        // Natural outward peripheral drift: as shapes approach camera, they part smoothly around view
        if (c.z < 700) {
          const proximity = Math.max(0, 1 - c.z / 700)
          const dirX = c.x >= 0 ? 1 : -1
          const dirY = c.y >= 0 ? 1 : -1
          c.x += dirX * proximity * 65 * dt
          c.y += dirY * proximity * 45 * dt
        }

        // Smooth fly-past camera before respawning in distance
        if (c.z <= -140) {
          c.z = 1750
          c.x = (Math.random() - 0.5) * 1650
          c.y = (Math.random() - 0.5) * 1050
        }

        let depthAlpha = 0.8
        if (c.z > 1250) {
          depthAlpha = Math.max(0, (1750 - c.z) / 500) * 0.8
        } else if (c.z < 240) {
          depthAlpha = Math.max(0, (c.z + 140) / 380) * 0.8
        }

        if (depthAlpha <= 0.015) continue

        const cosX = Math.cos(c.rx), sinX = Math.sin(c.rx)
        const cosY = Math.cos(c.ry), sinY = Math.sin(c.ry)
        const cosZ = Math.cos(c.rz), sinZ = Math.sin(c.rz)

        const projected = []
        let anyVisible = false

        for (let v of c.vertices) {
          let x = v[0] * c.size
          let y = v[1] * c.size
          let z = v[2] * c.size

          let y1 = y * cosX - z * sinX
          let z1 = y * sinX + z * cosX
          let x2 = x * cosY + z1 * sinY
          let z2 = -x * sinY + z1 * cosY
          let x3 = x2 * cosZ - y1 * sinZ
          let y3 = x2 * sinZ + y1 * cosZ

          const wx = x3 + c.x - mouseX
          const wy = y3 + c.y - mouseY
          const wz = z2 + c.z

          if (wz > 15) {
            const scale = fov / wz
            const px = cx + wx * scale
            const py = cy + wy * scale
            if (px > -300 && px < width + 300 && py > -300 && py < height + 300) {
              projected.push({ px, py, scale, wz })
              anyVisible = true
            } else {
              projected.push(null)
            }
          } else {
            projected.push(null)
          }
        }

        if (!anyVisible) continue

        ctx.lineWidth = Math.max(1.1, Math.min(3.5, 2.6 * (fov / Math.max(80, c.z))))

        // Draw wireframe edges
        for (let edgeIdx = 0; edgeIdx < c.edges.length; edgeIdx++) {
          const edge = c.edges[edgeIdx]
          const p1 = projected[edge[0]]
          const p2 = projected[edge[1]]
          if (p1 && p2) {
            ctx.strokeStyle = currentPalette.edge(depthAlpha, edgeIdx)
            ctx.beginPath()
            ctx.moveTo(p1.px, p1.py)
            ctx.lineTo(p2.px, p2.py)
            ctx.stroke()
          }
        }

        // Draw vertex glowing dots
        for (let vIdx = 0; vIdx < projected.length; vIdx++) {
          const p = projected[vIdx]
          if (p) {
            ctx.fillStyle = currentPalette.vertex(depthAlpha, vIdx)
            ctx.beginPath()
            ctx.arc(p.px, p.py, Math.max(1.5, Math.min(4, 2.8 * p.scale)), 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [paused, colorMode, sceneType])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
