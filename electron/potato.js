const fs = require('fs')
const path = require('path')

/**
 * Key-value map of ultra-low Potato PC settings for Minecraft options.txt
 */
const POTATO_MINECRAFT_OPTIONS = {
  graphicsMode: '0', // Fast (0=fast, 1=fancy, 2=fabulous)
  renderDistance: '4', // 4 chunks
  simulationDistance: '4',
  particles: '2', // 2=minimal
  clouds: '0', // 0=off
  renderClouds: 'false',
  ao: '0', // Smooth Lighting: off (0=off, 1=min, 2=max)
  enableVsync: 'false',
  entityShadows: 'false',
  entityDistanceScaling: '50', // 50%
  mipmapLevels: '0', // No mipmapping
  framerateLimit: '60',
  biomeBlendRadius: '0',
  distortionEffects: '0.0',
  fovEffectScale: '0.0',
  screenEffectScale: '0.0',
  viewBobbing: 'false',
  glDebugVerbosity: '0',
  renderDistanceChunks: '4',
}

/**
 * Safely applies Potato PC options to options.txt in the target directory
 */
function applyPotatoToOptionsFile(optionsFilePath) {
  try {
    let existingMap = new Map()

    if (fs.existsSync(optionsFilePath)) {
      const content = fs.readFileSync(optionsFilePath, 'utf8')
      const lines = content.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const sepIdx = trimmed.indexOf(':')
        if (sepIdx !== -1) {
          const key = trimmed.slice(0, sepIdx).trim()
          const val = trimmed.slice(sepIdx + 1).trim()
          existingMap.set(key, val)
        }
      }
    }

    // Apply potato overrides
    for (const [key, val] of Object.entries(POTATO_MINECRAFT_OPTIONS)) {
      existingMap.set(key, val)
    }

    // Write back
    const outLines = []
    for (const [key, val] of existingMap.entries()) {
      outLines.push(`${key}:${val}`)
    }

    fs.mkdirSync(path.dirname(optionsFilePath), { recursive: true })
    fs.writeFileSync(optionsFilePath, outLines.join('\r\n'), 'utf8')
    return true
  } catch (err) {
    console.warn('[Potato] Failed to write options.txt at:', optionsFilePath, err.message)
    return false
  }
}

/**
 * Recursively applies Potato PC options to main gameDir and isolated version directories
 */
function applyPotatoMinecraftOptions(gameDir) {
  if (!gameDir || !fs.existsSync(gameDir)) {
    return { ok: false, count: 0 }
  }

  let count = 0

  // 1. Root .minecraft options.txt
  const rootOptions = path.join(gameDir, 'options.txt')
  if (applyPotatoToOptionsFile(rootOptions)) {
    count++
  }

  // 2. Any version isolated options.txt in versions/*/options.txt
  const versionsDir = path.join(gameDir, 'versions')
  if (fs.existsSync(versionsDir)) {
    try {
      const subdirs = fs.readdirSync(versionsDir)
      for (const sub of subdirs) {
        const vDir = path.join(versionsDir, sub)
        if (fs.statSync(vDir).isDirectory()) {
          const vOptions = path.join(vDir, 'options.txt')
          if (applyPotatoToOptionsFile(vOptions)) {
            count++
          }
        }
      }
    } catch (e) {}
  }

  console.log(`[Potato] Applied Potato graphics options to ${count} options.txt file(s)`)
  return { ok: true, count }
}

module.exports = {
  POTATO_MINECRAFT_OPTIONS,
  applyPotatoMinecraftOptions,
  applyPotatoToOptionsFile,
}
