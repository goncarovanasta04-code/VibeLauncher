import { useEffect, useRef } from 'react'
import { SkinViewer, IdleAnimation } from 'skinview3d'
import { DEFAULT_STEVE_SKIN } from '../assets/defaultSkin'

export default function MiniSkin3D({
  skinUrl,
  username,
  model = 'default',
  width = 72,
  height = 98,
  className = '',
  onClick,
}) {
  const canvasRef = useRef(null)
  const viewerRef = useRef(null)

  const resolveTargetSkin = () => {
    if (skinUrl && skinUrl.trim()) {
      const trimmed = skinUrl.trim()
      // Fix bug where avatar head URL was saved as skinUrl
      if (trimmed.includes('/avatar/')) {
        if (trimmed.includes('mc-heads.net/avatar/')) {
          return trimmed.replace('mc-heads.net/avatar/', 'mc-heads.net/skin/').replace(/\/64$|\/32$/, '')
        }
        if (trimmed.includes('minotar.net/avatar/')) {
          return trimmed.replace('minotar.net/avatar/', 'minotar.net/skin/').replace(/\/64$|\/32$/, '')
        }
      }
      return trimmed
    }
    if (username && username.trim() && username.trim() !== 'Player') {
      return `https://minotar.net/skin/${encodeURIComponent(username.trim())}`
    }
    return DEFAULT_STEVE_SKIN
  }

  useEffect(() => {
    if (!canvasRef.current) return

    let viewer
    try {
      viewer = new SkinViewer({
        canvas: canvasRef.current,
        width,
        height,
        model: model === 'slim' ? 'slim' : 'default',
      })

      viewer.zoom = 0.82
      viewer.autoRotate = true
      viewer.autoRotateSpeed = 1.3
      viewer.animation = new IdleAnimation()
      viewer.controls.enableRotate = true
      viewer.controls.enableZoom = false
      viewer.controls.enablePan = false

      const initialSkin = resolveTargetSkin()
      viewer.loadSkin(initialSkin, { model: model === 'slim' ? 'slim' : 'default' }).catch(() => {
        viewer.loadSkin(DEFAULT_STEVE_SKIN).catch(() => {})
      })

      viewerRef.current = viewer
    } catch (e) {
      console.warn('[MiniSkin3D init error]:', e)
    }

    return () => {
      try {
        viewerRef.current?.dispose?.()
      } catch (e) {}
    }
  }, [width, height])

  // React to skinUrl, username, or model changes
  useEffect(() => {
    if (viewerRef.current) {
      const target = resolveTargetSkin()
      const targetModel = model === 'slim' ? 'slim' : 'default'
      viewerRef.current.loadSkin(target, { model: targetModel }).catch(() => {
        viewerRef.current?.loadSkin(DEFAULT_STEVE_SKIN).catch(() => {})
      })
    }
  }, [skinUrl, username, model])

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      className={className}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: '8px',
        }}
      />
    </div>
  )
}
