import { useEffect, useRef } from 'react'

// A small, scoped WebGL lens. It samples the existing background canvas rather
// than redrawing the whole scene, so the card gets real refraction at a stable
// cost (30 FPS, DPR capped at 1.5).
export default function LiquidGlassShader({ cardRef, sourceCanvasRef, disabled = false, maxFps = 30 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    // The 3D scene mounts independently from this component. Keep the lens alive
    // while it is being created instead of falling back permanently if the scene
    // ref is populated a frame later.
    if (disabled || !canvasRef.current || !cardRef?.current || !sourceCanvasRef) return

    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true })
    if (!gl) return

    const vertexSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const fragmentSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_source;
      uniform vec2 u_cardSize;
      uniform vec2 u_cardOffset;
      uniform vec2 u_viewSize;
      uniform float u_radius;

      float roundedBox(vec2 p, vec2 halfSize, float radius) {
        vec2 q = abs(p) - halfSize + radius;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
      }

      vec2 boxNormal(vec2 p, vec2 halfSize, float radius) {
        vec2 q = abs(p) - halfSize + radius;
        if (q.x > 0.0 && q.y > 0.0) return normalize(q) * sign(p);
        return q.x > q.y ? vec2(sign(p.x), 0.0) : vec2(0.0, sign(p.y));
      }

      void main() {
        vec2 local = (v_uv - 0.5) * u_cardSize;
        vec2 halfSize = u_cardSize * 0.5;
        float d = roundedBox(local, halfSize, u_radius);
        if (d > 0.0) discard;

        vec2 normal = boxNormal(local, halfSize, u_radius);
        float edge = 1.0 - smoothstep(-24.0, -1.0, d);
        vec2 sourceUv = (u_cardOffset + v_uv * u_cardSize) / u_viewSize;

        // A clear, thick lens: the centre is a shallow convex volume, while
        // its rim has stronger refraction. Unlike backdrop-filter this does
        // not blur the scene; it bends the actual 3D canvas beneath the UI.
        vec2 unit = local / halfSize;
        vec2 opticalAxis = normalize(unit + vec2(0.0001));
        float radial = clamp(1.0 - dot(unit, unit), 0.0, 1.0);
        float bulge = pow(radial, 0.62);
        vec2 lensOffset = opticalAxis * bulge * 7.0 / u_viewSize;
        lensOffset += normal * edge * 6.0 / u_viewSize;

        // Keep dispersion nearly imperceptible: the material is neutral glass,
        // not a blue cyber-panel.
        vec2 chroma = normal * edge * 0.14 / u_viewSize;
        vec2 refractedUv = clamp(sourceUv - lensOffset, 0.0, 1.0);
        vec3 refracted;
        refracted.r = texture2D(u_source, clamp(refractedUv + chroma, 0.0, 1.0)).r;
        refracted.g = texture2D(u_source, refractedUv).g;
        refracted.b = texture2D(u_source, clamp(refractedUv - chroma, 0.0, 1.0)).b;

        float topSheen = pow(clamp(1.0 - distance(v_uv, vec2(0.24, 0.03)) * 1.12, 0.0, 1.0), 4.0);
        float fresnel = pow(1.0 - bulge, 2.5);
        vec3 rimGlow = vec3(0.9, 0.92, 0.93) * (edge * 0.12 + fresnel * 0.022);
        // Tinted clear glass keeps the refraction visible without letting a
        // bright object behind it overpower the launcher controls.
        vec3 color = refracted * (0.38 + edge * 0.08) + rimGlow + vec3(1.0) * topSheen * 0.055;
        gl_FragColor = vec4(color, 1.0);
      }
    `

    const makeShader = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertex = makeShader(gl.VERTEX_SHADER, vertexSource)
    const fragment = makeShader(gl.FRAGMENT_SHADER, fragmentSource)
    if (!vertex || !fragment) return

    const program = gl.createProgram()
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)

    gl.useProgram(program)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const uniforms = {
      source: gl.getUniformLocation(program, 'u_source'),
      cardSize: gl.getUniformLocation(program, 'u_cardSize'),
      cardOffset: gl.getUniformLocation(program, 'u_cardOffset'),
      viewSize: gl.getUniformLocation(program, 'u_viewSize'),
      radius: gl.getUniformLocation(program, 'u_radius'),
    }

    let frameId = null
    let lastFrame = 0
    let active = true

    const render = (now) => {
      if (!active) return
      frameId = requestAnimationFrame(render)
      const frameInterval = 1000 / Math.max(15, Math.min(60, Number(maxFps) || 30))
      if (document.hidden || now - lastFrame < frameInterval) return
      lastFrame = now

      const source = sourceCanvasRef.current
      const card = cardRef.current
      if (!source || !card || source.width === 0 || source.height === 0) return
      const rect = card.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = Math.max(1, Math.round(rect.width * dpr))
      const height = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }

      try {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      } catch (error) {
        return
      }

      gl.useProgram(program)
      gl.uniform1i(uniforms.source, 0)
      gl.uniform2f(uniforms.cardSize, rect.width, rect.height)
      gl.uniform2f(uniforms.cardOffset, rect.left, rect.top)
      gl.uniform2f(uniforms.viewSize, window.innerWidth, window.innerHeight)
      gl.uniform1f(uniforms.radius, parseFloat(window.getComputedStyle(card).borderRadius) || 26)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    frameId = requestAnimationFrame(render)
    return () => {
      active = false
      if (frameId) cancelAnimationFrame(frameId)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [cardRef, disabled, sourceCanvasRef, maxFps])

  if (disabled) return null
  return <canvas ref={canvasRef} className="liquid-lens" aria-hidden="true" />
}
