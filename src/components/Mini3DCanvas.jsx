import { useEffect, useRef } from 'react'

/**
 * Lightweight real-time 3D canvas preview for theme cards in ThemesModal.
 * Supports 5 distinct mathematical engines matching the full background:
 * - 'cyber-horizon': Neon undulating synthwave terrain wave with horizon sun.
 * - 'hyperspace-stars': Warp-speed starfield with speed streak vectors and gyro rings.
 * - 'prismatic-crystals': Solid-shaded 3D faceted gemstones with face normals and glass highlights.
 * - 'minimal-void': Precision monochrome wireframe polyhedra and horizon grid.
 * - 'ender-rift': Swirling singularity vortex with spiral particles and ender crystal.
 */
export default function Mini3DCanvas({
  sceneType = 'minimal-void',
  colorMode = 'monochrome',
  width = 440,
  height = 130,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let isMounted = true

    const cx = width / 2
    const cy = height / 2

    // 3D Math Helper Functions
    const rotateX = (x, y, z, a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)]
    const rotateY = (x, y, z, a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)]
    const rotateZ = (x, y, z, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z]

    const project = (x, y, z, fov = 180) => {
      if (z <= 5) return null
      const scale = fov / z
      return {
        x: cx + x * scale,
        y: cy + y * scale,
        scale,
      }
    }

    // --- Scene Data ---

    // 1. Minimal Void Polyhedra
    const cubeVerts = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ]
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ]
    const octaVerts = [
      [0, -1.4, 0], [0, 1.4, 0],
      [-1, 0, 0], [1, 0, 0],
      [0, 0, -1], [0, 0, 1],
    ]
    const octaEdges = [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [4, 3], [3, 5], [5, 2],
    ]
    const voidShapes = [
      { verts: cubeVerts, edges: cubeEdges, size: 24, x: -45, y: -4, z: 120, rx: 0.2, ry: 0.3, rz: 0.1, spd: { x: 0.015, y: 0.02 } },
      { verts: octaVerts, edges: octaEdges, size: 26, x: 45, y: 6, z: 130, rx: 0.6, ry: 0.2, rz: 0.5, spd: { x: -0.018, y: 0.016 } },
    ]

    // 2. Hyperspace Stars & Rings
    const warpStars = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * 480,
      y: (Math.random() - 0.5) * 240,
      z: Math.random() * 300 + 30,
      speed: Math.random() * 4 + 3,
      size: Math.random() * 1.6 + 0.8,
      color: Math.random() > 0.4 ? '#38bdf8' : Math.random() > 0.5 ? '#a855f7' : '#ffffff',
    }))

    // 3. Prismatic Crystals (Icosahedron)
    const phi = (1 + Math.sqrt(5)) / 2
    const icosaVerts = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z)
      return [x / len, y / len, z / len]
    })
    const icosaFaces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ]
    const solidGems = [
      { x: -40, y: 0, z: 130, rx: 0.3, ry: 0.4, rz: 0.2, spd: { x: 0.012, y: 0.018 }, scale: 32, hue: 195 },
      { x: 45, y: -2, z: 140, rx: 0.8, ry: 0.2, rz: 0.5, spd: { x: -0.014, y: 0.015 }, scale: 36, hue: 280 },
    ]

    // 4. Ender Rift Particles
    const enderParts = Array.from({ length: 180 }, () => {
      const r = Math.pow(Math.random(), 0.7) * 140 + 12
      const a = Math.random() * Math.PI * 2
      return {
        r,
        a,
        speed: (0.8 / Math.sqrt(r)) * 3.5,
        y: (Math.random() - 0.5) * (r * 0.22),
        size: Math.random() * 1.8 + 0.8,
        color: Math.random() > 0.45 ? '#c084fc' : Math.random() > 0.5 ? '#67e8f9' : '#ffffff',
      }
    })

    let time = 0
    let lastTime = performance.now()

    // --- Render Dispatcher ---
    const render = (now) => {
      if (!isMounted) return
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      time += dt

      // Clear Canvas
      ctx.clearRect(0, 0, width, height)

      if (sceneType === 'cyber-horizon') {
        // --- 1. CYBER HORIZON PREVIEW ---
        ctx.fillStyle = '#030712'
        ctx.fillRect(0, 0, width, height)

        // Horizon sun
        const hY = height * 0.55
        ctx.beginPath()
        ctx.arc(cx, hY - 12, 36, Math.PI, 0, false)
        const sunGrad = ctx.createLinearGradient(0, hY - 50, 0, hY)
        sunGrad.addColorStop(0, 'rgba(236, 72, 153, 0.7)')
        sunGrad.addColorStop(1, 'rgba(168, 85, 247, 0)')
        ctx.fillStyle = sunGrad
        ctx.fill()

        // Undulating mesh lines
        const cols = 16
        const rows = 10
        const grid = []
        for (let r = 0; r < rows; r++) {
          const rowPts = []
          const z = (rows - r) * 18 + 35
          for (let c = 0; c < cols; c++) {
            const x = (c - cols / 2) * 28
            const wave = Math.sin(x * 0.04 + time * 3) * Math.cos(z * 0.05 + time * 2) * 10
            const y = 26 + wave
            rowPts.push(project(x, y, z, 140))
          }
          grid.push(rowPts)
        }

        // Horizontal lines
        for (let r = 0; r < rows; r++) {
          ctx.beginPath()
          let started = false
          for (let c = 0; c < cols; c++) {
            const p = grid[r][c]
            if (!p) continue
            if (!started) { ctx.moveTo(p.x, p.y); started = true }
            else ctx.lineTo(p.x, p.y)
          }
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.2 + ((rows - r) / rows) * 0.6})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Longitudinal lines
        for (let c = 0; c < cols; c += 2) {
          ctx.beginPath()
          let started = false
          for (let r = 0; r < rows; r++) {
            const p = grid[r][c]
            if (!p) continue
            if (!started) { ctx.moveTo(p.x, p.y); started = true }
            else ctx.lineTo(p.x, p.y)
          }
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Glowing nodes
        for (let r = 0; r < rows; r += 2) {
          for (let c = 0; c < cols; c += 2) {
            const p = grid[r][c]
            if (!p) continue
            ctx.beginPath()
            ctx.arc(p.x, p.y, 1.6 * p.scale, 0, Math.PI * 2)
            ctx.fillStyle = '#67e8f9'
            ctx.fill()
          }
        }
      } else if (sceneType === 'hyperspace-stars') {
        // --- 2. HYPERSPACE WARP PREVIEW ---
        ctx.fillStyle = '#02040a'
        ctx.fillRect(0, 0, width, height)

        // Radial nebula
        const nebGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.5)
        nebGrad.addColorStop(0, 'rgba(56, 189, 248, 0.3)')
        nebGrad.addColorStop(0.5, 'rgba(147, 51, 234, 0.15)')
        nebGrad.addColorStop(1, '#02040a')
        ctx.fillStyle = nebGrad
        ctx.fillRect(0, 0, width, height)

        // Gyro rings
        const rings = [
          { r: 42, rx: time * 0.8, ry: time * 0.9, col: 'rgba(56, 189, 248, 0.5)' },
          { r: 58, rx: -time * 0.6, ry: time * 0.7, col: 'rgba(168, 85, 247, 0.45)' },
        ]
        rings.forEach((ring) => {
          ctx.beginPath()
          for (let i = 0; i <= 36; i++) {
            const th = (i / 36) * Math.PI * 2
            let x = Math.cos(th) * ring.r
            let y = Math.sin(th) * ring.r
            let [rx, ry, rz] = rotateX(x, y, 0, ring.rx)
            ;[rx, ry, rz] = rotateY(rx, ry, rz, ring.ry)
            const p = project(rx, ry, rz + 140, 150)
            if (!p) continue
            if (i === 0) ctx.moveTo(p.x, p.y)
            else ctx.lineTo(p.x, p.y)
          }
          ctx.strokeStyle = ring.col
          ctx.lineWidth = 1.2
          ctx.stroke()
        })

        // Star speed vectors
        warpStars.forEach((star) => {
          const prevZ = star.z
          star.z -= star.speed
          if (star.z <= 15) {
            star.z = 300
            star.x = (Math.random() - 0.5) * 480
            star.y = (Math.random() - 0.5) * 240
          }
          const pNow = project(star.x, star.y, star.z, 140)
          const pPrev = project(star.x, star.y, prevZ, 140)
          if (pNow && pPrev) {
            ctx.beginPath()
            ctx.moveTo(pPrev.x, pPrev.y)
            ctx.lineTo(pNow.x, pNow.y)
            ctx.strokeStyle = star.color
            ctx.lineWidth = star.size * pNow.scale
            ctx.stroke()
          }
        })
      } else if (sceneType === 'prismatic-crystals') {
        // --- 3. PRISMATIC SOLID GEMS PREVIEW ---
        ctx.fillStyle = '#06060c'
        ctx.fillRect(0, 0, width, height)

        const aura = ctx.createRadialGradient(cx, cy, 15, cx, cy, width * 0.5)
        aura.addColorStop(0, 'rgba(236, 72, 153, 0.22)')
        aura.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)')
        aura.addColorStop(1, '#06060c')
        ctx.fillStyle = aura
        ctx.fillRect(0, 0, width, height)

        const lx = 0.577, ly = -0.577, lz = 0.577

        solidGems.forEach((gem) => {
          gem.rx += gem.spd.x
          gem.ry += gem.spd.y

          const transVerts = icosaVerts.map(([vx, vy, vz]) => {
            let [x, y, z] = [vx * gem.scale, vy * gem.scale, vz * gem.scale]
            ;[x, y, z] = rotateX(x, y, z, gem.rx)
            ;[x, y, z] = rotateY(x, y, z, gem.ry)
            return [x + gem.x, y + gem.y, z + gem.z]
          })

          const faces = icosaFaces.map((f) => {
            const v0 = transVerts[f[0]], v1 = transVerts[f[1]], v2 = transVerts[f[2]]
            const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2]
            const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2]
            const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
            return {
              v0, v1, v2,
              normZ: nz / len,
              dot: Math.max(0.15, (nx / len) * lx + (ny / len) * ly + (nz / len) * lz),
              avgZ: (v0[2] + v1[2] + v2[2]) / 3,
            }
          }).filter((f) => f.normZ < 0.1).sort((a, b) => b.avgZ - a.avgZ)

          faces.forEach((f) => {
            const p0 = project(f.v0[0], f.v0[1], f.v0[2], 160)
            const p1 = project(f.v1[0], f.v1[1], f.v1[2], 160)
            const p2 = project(f.v2[0], f.v2[1], f.v2[2], 160)
            if (!p0 || !p1 || !p2) return

            ctx.beginPath()
            ctx.moveTo(p0.x, p0.y)
            ctx.lineTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.closePath()

            const light = Math.round(25 + f.dot * 48)
            ctx.fillStyle = `hsla(${gem.hue}, 85%, ${light}%, 0.8)`
            ctx.fill()

            ctx.strokeStyle = `hsla(${gem.hue}, 100%, 85%, ${f.dot * 1.5})`
            ctx.lineWidth = 1
            ctx.stroke()
          })
        })
      } else if (sceneType === 'ender-rift') {
        // --- 4. ENDER RIFT PREVIEW ---
        ctx.fillStyle = '#050209'
        ctx.fillRect(0, 0, width, height)

        const riftAura = ctx.createRadialGradient(cx, cy, 8, cx, cy, width * 0.45)
        riftAura.addColorStop(0, 'rgba(168, 85, 247, 0.45)')
        riftAura.addColorStop(0.3, 'rgba(6, 182, 212, 0.2)')
        riftAura.addColorStop(1, '#050209')
        ctx.fillStyle = riftAura
        ctx.fillRect(0, 0, width, height)

        // Event horizon core
        ctx.beginPath()
        ctx.arc(cx, cy, 14, 0, Math.PI * 2)
        ctx.fillStyle = '#020104'
        ctx.fill()
        ctx.strokeStyle = '#a855f7'
        ctx.lineWidth = 2
        ctx.stroke()

        // Spiral particles
        enderParts.forEach((p) => {
          p.a += p.speed * 0.02
          const x = Math.cos(p.a) * p.r
          const z = Math.sin(p.a) * p.r
          let [rx, ry, rz] = rotateX(x, p.y, z, 0.85)
          const pt = project(rx, ry, rz + 140, 150)
          if (!pt) return
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, p.size * pt.scale, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.fill()
        })

        // Mini crystal
        const cA = time * 1.2
        const cX = Math.cos(cA) * 55
        const cZ = Math.sin(cA) * 55
        let [crX, crY, crZ] = rotateX(cX, Math.sin(time * 3) * 10, cZ, 0.85)
        const cp = project(crX, crY, crZ + 140, 150)
        if (cp) {
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cp.x, cp.y)
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)'
          ctx.lineWidth = 1
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(cp.x, cp.y, 4 * cp.scale, 0, Math.PI * 2)
          ctx.fillStyle = '#ec4899'
          ctx.fill()
        }
      } else {
        // --- 5. MINIMAL VOID (DEFAULT) ---
        ctx.fillStyle = '#020204'
        ctx.fillRect(0, 0, width, height)

        // Ground horizon grid
        const hY = cy + 24
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 1
        for (let i = -6; i <= 6; i++) {
          ctx.beginPath()
          ctx.moveTo(cx + i * 36, height)
          ctx.lineTo(cx + i * 5, hY)
          ctx.stroke()
        }
        for (let z = 20; z < 180; z += 25) {
          const py = hY + (160 * 20) / z
          if (py > hY && py < height) {
            ctx.beginPath()
            ctx.moveTo(0, py)
            ctx.lineTo(width, py)
            ctx.stroke()
          }
        }

        // Wireframe Polyhedra
        voidShapes.forEach((s) => {
          s.rx += s.spd.x
          s.ry += s.spd.y
          const proj = s.verts.map(([vx, vy, vz]) => {
            let [x, y, z] = [vx * s.size, vy * s.size, vz * s.size]
            ;[x, y, z] = rotateX(x, y, z, s.rx)
            ;[x, y, z] = rotateY(x, y, z, s.ry)
            return project(x + s.x, y + s.y, z + s.z, 160)
          })

          ctx.beginPath()
          s.edges.forEach(([i, j]) => {
            const p1 = proj[i], p2 = proj[j]
            if (p1 && p2) {
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
            }
          })
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
          ctx.lineWidth = 1.2
          ctx.stroke()
        })
      }

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)

    return () => {
      isMounted = false
      cancelAnimationFrame(animId)
    }
  }, [sceneType, colorMode, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
