import { useEffect, useRef } from 'react'
import bgImageSrc from '../assets/bg.jpg'

export default function LiquidGlassShader({ videoRef, cardRef, disabled = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (disabled) return

    const canvas = canvasRef.current
    if (!canvas) return

    const gl =
      canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true }) ||
      canvas.getContext('experimental-webgl')

    if (!gl) {
      console.warn('[LiquidGlass] WebGL not supported')
      return
    }

    // Vertex shader
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    // Fragment shader: True Liquid Glass Generator (Snell's Law, Refraction, SDF Curvature)
    const fsSource = `
      precision highp float;
      varying vec2 v_uv;

      uniform sampler2D u_background;
      uniform vec2 u_resolution;
      uniform vec4 u_rect; // x, y, width, height in screen coordinates
      uniform float u_radius;

      // WebGL Shader Parameters from imggion/liquid-glass-generator:
      // Refractive Index: 1.37 (eta: 0.730)
      // Distortion Strength: 0.035
      // Curvature: 0.74
      // Edge Sharpness: 0.49
      // Blur Radius: 3.4px

      const float ETA = 0.729927; // 1.0 / 1.37
      const float DISTORTION = 0.035;
      const float CURVATURE = 0.74;
      const float EDGE_SHARPNESS = 0.49;
      const float BLUR_RADIUS = 3.4;

      // Signed Distance Field of 2D Rounded Box
      float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
      }

      // Analytical 2D normal vector of Rounded Box
      vec2 getBoxNormal2D(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        vec2 grad;
        if (q.x > 0.0 && q.y > 0.0) {
          grad = normalize(q) * sign(p);
        } else if (q.x > q.y) {
          grad = vec2(sign(p.x), 0.0);
        } else {
          grad = vec2(0.0, sign(p.y));
        }
        return grad;
      }

      // Gaussian-disc blur sampler
      vec4 sampleBlurred(sampler2D tex, vec2 uv, vec2 res, float blur) {
        vec2 texel = 1.0 / res;
        vec4 col = vec4(0.0);
        float total = 0.0;
        
        vec2 offsets[9];
        offsets[0] = vec2(0.0, 0.0);
        offsets[1] = vec2(1.0, 0.0);
        offsets[2] = vec2(-1.0, 0.0);
        offsets[3] = vec2(0.0, 1.0);
        offsets[4] = vec2(0.0, -1.0);
        offsets[5] = vec2(0.707, 0.707);
        offsets[6] = vec2(-0.707, 0.707);
        offsets[7] = vec2(0.707, -0.707);
        offsets[8] = vec2(-0.707, -0.707);
        
        for (int i = 0; i < 9; i++) {
          float w = (i == 0) ? 2.5 : 1.0;
          vec2 sUv = clamp(uv + offsets[i] * texel * blur, 0.0, 1.0);
          col += texture2D(tex, sUv) * w;
          total += w;
        }
        return col / total;
      }

      void main() {
        vec2 pixelPos = gl_FragCoord.xy;
        // Flip Y to match screen coords (0,0 at top-left)
        vec2 screenPixel = vec2(pixelPos.x, u_resolution.y - pixelPos.y);
        
        vec2 cardCenter = u_rect.xy + u_rect.zw * 0.5;
        vec2 cardHalfSize = u_rect.zw * 0.5;
        vec2 p = screenPixel - cardCenter;
        
        float d = sdRoundedBox(p, cardHalfSize, u_radius);
        
        // Outside glass box -> discard
        if (d > 0.5) {
          discard;
        }
        
        float edgeAlpha = clamp(0.5 - d, 0.0, 1.0);
        
        // Normalized texture coordinates (WebGL texture Y goes 0 at bottom to 1 at top)
        vec2 texUv = gl_FragCoord.xy / u_resolution;
        
        // Normal 2D on glass perimeter
        vec2 norm2D = getBoxNormal2D(p, cardHalfSize, u_radius);
        
        // Edge curvature profile
        float edgeWidth = u_radius * CURVATURE;
        float t = clamp(-d / max(edgeWidth, 1.0), 0.0, 1.0);
        
        // Height slope based on Edge Sharpness (0.49) & Distortion Strength (0.035)
        float profileSlope = (1.0 - pow(t, EDGE_SHARPNESS)) * DISTORTION * 10.0;
        
        // 3D Glass Surface Normal (meniscus curve)
        vec3 N = normalize(vec3(-norm2D * profileSlope, 1.0));
        vec3 I = vec3(0.0, 0.0, -1.0); // Eye ray straight in
        
        // Snell's Law Refraction
        vec3 R = refract(I, N, ETA);
        if (length(R) == 0.0) {
          R = reflect(I, N);
        }
        
        vec2 uvOffset = (R.xy / max(abs(R.z), 0.001)) * DISTORTION * (1.0 - t * 0.6);
        // Note: norm2D is in screen space where +Y is down, whereas texture +Y is up
        uvOffset.y = -uvOffset.y;
        
        // Chromatic dispersion (RGB split with Snell's law)
        vec3 R_r = refract(I, N, ETA * 0.985);
        vec3 R_b = refract(I, N, ETA * 1.015);
        vec2 off_r = (R_r.xy / max(abs(R_r.z), 0.001)) * DISTORTION * (1.0 - t * 0.6);
        vec2 off_b = (R_b.xy / max(abs(R_b.z), 0.001)) * DISTORTION * (1.0 - t * 0.6);
        off_r.y = -off_r.y;
        off_b.y = -off_b.y;
        
        float colR = sampleBlurred(u_background, clamp(texUv + off_r, 0.0, 1.0), u_resolution, BLUR_RADIUS).r;
        float colG = sampleBlurred(u_background, clamp(texUv + uvOffset, 0.0, 1.0), u_resolution, BLUR_RADIUS).g;
        float colB = sampleBlurred(u_background, clamp(texUv + off_b, 0.0, 1.0), u_resolution, BLUR_RADIUS).b;
        vec3 glassColor = vec3(colR, colG, colB);
        
        // Fresnel reflection & Apple-style top specular bevel
        vec3 lightDir = normalize(vec3(0.0, 1.0, 0.9));
        vec3 H = normalize(lightDir - I);
        float fresnel = pow(1.0 - max(dot(-I, N), 0.0), 3.0) * 0.4;
        float specular = pow(max(dot(N, H), 0.0), 36.0) * 0.65;
        
        // Upper edge illumination
        float topEdge = max(0.0, -norm2D.y) * (1.0 - t) * 0.45;
        
        // Light crystal tint
        vec3 finalColor = mix(glassColor, vec3(1.0), 0.05);
        finalColor += vec3(fresnel * 0.5 + specular + topEdge);
        
        gl_FragColor = vec4(finalColor, edgeAlpha);
      }
    `

    // Compile helper
    const createShader = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[LiquidGlass] Shader compile error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = createShader(gl.VERTEX_SHADER, vsSource)
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource)
    if (!vs || !fs) return

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[LiquidGlass] Program link error:', gl.getProgramInfoLog(program))
      return
    }

    gl.useProgram(program)

    // Full screen quad buffer
    const posBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    )

    const aPosition = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    // Uniforms
    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uRect = gl.getUniformLocation(program, 'u_rect')
    const uRadius = gl.getUniformLocation(program, 'u_radius')
    const uBackground = gl.getUniformLocation(program, 'u_background')

    // Texture setup
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    // Default 1x1 pixel while loading
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([10, 20, 35, 255])
    )

    // Load fallback image into texture
    const img = new Image()
    img.src = bgImageSrc
    img.onload = () => {
      if (!videoRef?.current || videoRef.current.readyState < 2) {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      }
    }

    let animationId = null
    let running = true

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
        gl.viewport(0, 0, canvas.width, canvas.height)
      }
    }

    const render = () => {
      if (!running) return

      resize()

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight

      // Update background texture from video if ready
      const video = videoRef?.current
      if (video && video.readyState >= 2 && !video.paused && !video.ended) {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
        } catch (e) {}
      }

      gl.useProgram(program)
      gl.uniform2f(uResolution, w * dpr, h * dpr)

      // Get target card coordinates
      let rx = (w - 340) * 0.5
      let ry = (h - 380) * 0.5
      let rw = 340
      let rh = 380
      let rRadius = 26.0

      if (cardRef?.current) {
        const rect = cardRef.current.getBoundingClientRect()
        rx = rect.left
        ry = rect.top
        rw = rect.width
        rh = rect.height
        const cs = window.getComputedStyle(cardRef.current)
        rRadius = parseFloat(cs.borderRadius) || 26.0
      }

      gl.uniform4f(uRect, rx * dpr, ry * dpr, rw * dpr, rh * dpr)
      gl.uniform1f(uRadius, rRadius * dpr)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.uniform1i(uBackground, 0)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      animationId = requestAnimationFrame(render)
    }

    render()

    return () => {
      running = false
      if (animationId) cancelAnimationFrame(animationId)
      try {
        gl.deleteProgram(program)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        gl.deleteTexture(texture)
        gl.deleteBuffer(posBuffer)
      } catch (e) {}
    }
  }, [disabled, videoRef, cardRef])

  if (disabled) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1, // Directly over the video and beneath the UI HTML elements
      }}
    />
  )
}
