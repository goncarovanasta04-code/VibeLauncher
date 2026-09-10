const axios = require('axios')
const path = require('path')
const fs = require('fs')
const zlib = require('zlib')
const { app } = require('electron')

const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'
const BMCLAPI_MANIFEST_URL = 'https://bmclapi2.bangbang93.com/mc/game/version_manifest_v2.json'
const FABRIC_META_URL = 'https://meta.fabricmc.net/v2'
const QUILT_META_URL = 'https://meta.quiltmc.org/v3'
const FORGE_PROMOTIONS_URL = 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'

/**
 * Fast pure Node.js ZIP entry extractor using zlib.inflateRawSync.
 * Scans Central Directory without external dependencies.
 */
function findAndExtractZipEntry(buffer, predicate) {
  if (!buffer || buffer.length < 22) return null
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      const cdOffset = buffer.readUInt32LE(i + 16)
      const cdRecords = buffer.readUInt16LE(i + 10)
      let ptr = cdOffset
      for (let r = 0; r < cdRecords && ptr < buffer.length - 46; r++) {
        if (buffer.readUInt32LE(ptr) !== 0x02014b50) break
        const compMethod = buffer.readUInt16LE(ptr + 10)
        const compSize = buffer.readUInt32LE(ptr + 20)
        const nameLen = buffer.readUInt16LE(ptr + 28)
        const extraLen = buffer.readUInt16LE(ptr + 30)
        const commentLen = buffer.readUInt16LE(ptr + 32)
        const localHeaderOffset = buffer.readUInt32LE(ptr + 42)
        const fileName = buffer.toString('utf8', ptr + 46, ptr + 46 + nameLen)

        if (predicate(fileName)) {
          if (localHeaderOffset + 30 > buffer.length) return null
          const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26)
          const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28)
          const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen
          if (dataOffset + compSize > buffer.length) return null
          const slice = buffer.slice(dataOffset, dataOffset + compSize)

          if (compMethod === 0) {
            return { name: fileName, data: slice }
          } else if (compMethod === 8) {
            try {
              return { name: fileName, data: zlib.inflateRawSync(slice) }
            } catch (zErr) {
              console.warn(`[Versions] zlib inflate failed for ${fileName}:`, zErr.message)
              return null
            }
          }
        }
        ptr += 46 + nameLen + extraLen + commentLen
      }
      break
    }
  }
  return null
}

async function fetchMojangManifest() {
  const urls = [MANIFEST_URL, BMCLAPI_MANIFEST_URL]
  for (const u of urls) {
    try {
      const res = await axios.get(u, { timeout: 15000 })
      if (res.data && Array.isArray(res.data.versions)) {
        return res.data
      }
    } catch (e) {}
  }
  throw new Error('Не удалось получить манифест версий Minecraft с официальных серверов и зеркал')
}

async function mergeBaseManifest(mcVersion, targetData, rootDir, versionId, onProgress) {
  try {
    const manifest = await fetchMojangManifest()
    const found = manifest.versions?.find((v) => v.id === mcVersion)
    if (found?.url) {
      const vRes = await axios.get(found.url, { timeout: 20000 })
      const baseData = vRes.data

      // Save base version JSON if not already saved
      const baseVerDir = path.join(rootDir, 'versions', mcVersion)
      fs.mkdirSync(baseVerDir, { recursive: true })
      const baseJsonPath = path.join(baseVerDir, `${mcVersion}.json`)
      if (!fs.existsSync(baseJsonPath)) {
        fs.writeFileSync(baseJsonPath, JSON.stringify(baseData, null, 2), 'utf8')
      }

      if (baseData?.assetIndex) targetData.assetIndex = baseData.assetIndex
      if (baseData?.assets) targetData.assets = baseData.assets
      if (baseData?.downloads) {
        if (!targetData.downloads) {
          targetData.downloads = baseData.downloads
        } else if (!targetData.downloads.client && baseData.downloads.client) {
          targetData.downloads.client = baseData.downloads.client
        }
      }
      if (!targetData.mainClass && baseData?.mainClass) {
        targetData.mainClass = baseData.mainClass
      }
      if (baseData?.javaVersion && !targetData.javaVersion) targetData.javaVersion = baseData.javaVersion

      // Merge base arguments if missing
      if (baseData?.arguments) {
        if (!targetData.arguments) targetData.arguments = {}
        if (!targetData.arguments.game || targetData.arguments.game.length === 0) {
          targetData.arguments.game = baseData.arguments.game || []
        }
        if (!targetData.arguments.jvm || targetData.arguments.jvm.length === 0) {
          targetData.arguments.jvm = baseData.arguments.jvm || []
        }
      }
      if (!targetData.minecraftArguments && baseData?.minecraftArguments) {
        targetData.minecraftArguments = baseData.minecraftArguments
      }

      // Merge base libraries so vanilla LWJGL / dependencies are never missing in custom loaders
      if (Array.isArray(baseData?.libraries)) {
        if (!Array.isArray(targetData.libraries)) {
          targetData.libraries = [...baseData.libraries]
        } else {
          const seen = new Set()
          for (const l of targetData.libraries) {
            seen.add(l.name || l.id || JSON.stringify(l))
          }
          for (const bl of baseData.libraries) {
            const key = bl.name || bl.id || JSON.stringify(bl)
            if (!seen.has(key)) {
              seen.add(key)
              targetData.libraries.push(bl)
            }
          }
        }
      }

      // Download asset index immediately
      if (baseData?.assetIndex?.url) {
        const indexDir = path.join(rootDir, 'assets', 'indexes')
        fs.mkdirSync(indexDir, { recursive: true })
        const assetIndexId = baseData.assetIndex.id || mcVersion
        const primaryPath = path.join(indexDir, `${assetIndexId}.json`)
        if (!fs.existsSync(primaryPath) || fs.statSync(primaryPath).size < 1000) {
          try {
            const idxRes = await axios.get(baseData.assetIndex.url, { timeout: 20000 })
            fs.writeFileSync(primaryPath, JSON.stringify(idxRes.data, null, 2), 'utf8')
          } catch (idxErr) {
            console.warn('[Versions] Failed to download asset index:', idxErr.message)
          }
        }
        if (fs.existsSync(primaryPath)) {
          const content = fs.readFileSync(primaryPath)
          const alias1 = path.join(indexDir, `${mcVersion}.json`)
          const alias2 = path.join(indexDir, `${versionId}.json`)
          if (!fs.existsSync(alias1)) fs.writeFileSync(alias1, content)
          if (!fs.existsSync(alias2)) fs.writeFileSync(alias2, content)
        }
      }

      // Download client JAR into base versions/<mcVersion>/<mcVersion>.jar if missing
      const baseJarPath = path.join(baseVerDir, `${mcVersion}.jar`)
      if (!fs.existsSync(baseJarPath) || fs.statSync(baseJarPath).size < 100000) {
        const clientUrl = baseData?.downloads?.client?.url
        if (clientUrl) {
          if (onProgress) onProgress(`Загрузка базового клиента Minecraft ${mcVersion}.jar...`, 2, 4)
          try {
            const jarRes = await axios.get(clientUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
            })
            fs.writeFileSync(baseJarPath, Buffer.from(jarRes.data))
          } catch (jarErr) {
            console.warn('[Versions] Base client JAR download note:', jarErr.message)
          }
        }
      }

      // Also copy base JAR to target version folder if versionId is distinct
      if (versionId && versionId !== mcVersion && fs.existsSync(baseJarPath)) {
        const targetVerDir = path.join(rootDir, 'versions', versionId)
        fs.mkdirSync(targetVerDir, { recursive: true })
        const targetJarPath = path.join(targetVerDir, `${versionId}.jar`)
        if (!fs.existsSync(targetJarPath) || fs.statSync(targetJarPath).size < 100000) {
          try {
            fs.copyFileSync(baseJarPath, targetJarPath)
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.warn('[Versions] Failed to merge base metadata:', e.message)
  }
}

function getDefaultGameDir() {
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('appData'), '.minecraft')
  }
  return path.join(process.env.APPDATA || process.env.HOME || '', '.minecraft')
}

/**
 * Robust helper to extract underlying Minecraft version from folder or JSON
 */
function detectBaseMinecraftVersion(data, folderName, dirPath) {
  if (data?.inheritsFrom && typeof data.inheritsFrom === 'string') {
    return data.inheritsFrom.trim()
  }
  if (data?.jar && typeof data.jar === 'string') {
    const jarMatch = data.jar.match(/(\d+\.\d+(?:\.\d+)?)/)
    if (jarMatch) return jarMatch[1]
  }
  if (data?.clientVersion && typeof data.clientVersion === 'string') {
    return data.clientVersion.trim()
  }
  if (data?.assets && typeof data.assets === 'string') {
    const assetMatch = data.assets.match(/(\d+\.\d+)/)
    if (assetMatch) {
      if (assetMatch[1] === '1.16') return '1.16.5'
      if (assetMatch[1] === '1.20') return '1.20.1'
      if (assetMatch[1] === '1.21') return '1.21.1'
      if (assetMatch[1] === '1.19') return '1.19.4'
      if (assetMatch[1] === '1.18') return '1.18.2'
      if (assetMatch[1] === '1.12') return '1.12.2'
      if (assetMatch[1] === '1.8') return '1.8.9'
      if (assetMatch[1] === '1.7') return '1.7.10'
      return assetMatch[1]
    }
  }

  // Check libraries for net.minecraft:client:<version>
  if (Array.isArray(data?.libraries)) {
    for (const lib of data.libraries) {
      const name = typeof lib === 'string' ? lib : lib.name
      if (name && typeof name === 'string' && name.includes(':client:')) {
        const parts = name.split(':')
        if (parts.length >= 3 && /^\d+\.\d+/.test(parts[2])) {
          return parts[2]
        }
      }
    }
  }

  // Check data.id or folderName pattern
  const testStr = `${data?.id || ''} ${folderName || ''}`
  const match = testStr.match(/(\d+\.\d+(?:\.\d+)?)/)
  if (match) return match[1]

  // If dirPath is provided, check if mods directory exists and scan mod filenames for mc version
  if (dirPath && fs.existsSync(path.join(dirPath, 'mods'))) {
    try {
      const mFiles = fs.readdirSync(path.join(dirPath, 'mods'))
      for (const mf of mFiles) {
        const mMatch = mf.match(/1\.(?:21|20|19|18|17|16|15|14|13|12|8|7)(?:\.\d+)?/)
        if (mMatch) return mMatch[0]
      }
    } catch (e) {}
  }

  return '1.16.5'
}

/**
 * Scans the <gameDir>/versions directory for all installed / custom Minecraft versions
 */
function getLocalVersions(customGameDir) {
  const rootDir = customGameDir && customGameDir.trim() ? customGameDir.trim() : getDefaultGameDir()
  const versionsDir = path.join(rootDir, 'versions')

  if (!fs.existsSync(versionsDir)) {
    try {
      fs.mkdirSync(versionsDir, { recursive: true })
    } catch (e) {
      console.error('[Versions] Failed to create versions directory:', e.message)
      return { ok: true, versions: [] }
    }
  }

  const installed = []

  try {
    const entries = fs.readdirSync(versionsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue

      const versionId = entry.name
      const dirPath = path.join(versionsDir, versionId)

      // 1. Look for <versionId>.json or any .json file in the folder
      let jsonPath = path.join(dirPath, `${versionId}.json`)
      let hasJson = fs.existsSync(jsonPath)
      let foundJsonName = null

      if (!hasJson) {
        try {
          const files = fs.readdirSync(dirPath)
          const found = files.find((f) => f.endsWith('.json'))
          if (found) {
            foundJsonName = found
            const altJsonPath = path.join(dirPath, found)
            // Critical fix for MCLC: ensure <versionId>.json exists so MCLC never throws ENOENT
            try {
              fs.copyFileSync(altJsonPath, jsonPath)
              hasJson = true
            } catch (copyErr) {
              jsonPath = altJsonPath
              hasJson = true
            }
          }
        } catch (e) {}
      }

      // Check for jar inside version folder
      let jarExists = fs.existsSync(path.join(dirPath, `${versionId}.jar`))
      if (!jarExists) {
        try {
          const files = fs.readdirSync(dirPath)
          const foundJar = files.find((f) => f.endsWith('.jar'))
          if (foundJar) jarExists = true
        } catch (e) {}
      }

      // If no JSON exists at all, synthesize minimal JSON so the custom version loads and is playable
      if (!hasJson) {
        try {
          const detectedBase = detectBaseMinecraftVersion(null, versionId, dirPath)
          const syntheticJson = {
            id: versionId,
            inheritsFrom: detectedBase,
            mainClass: 'net.minecraft.client.main.Main',
            type: 'custom',
            releaseTime: new Date().toISOString(),
          }
          fs.writeFileSync(jsonPath, JSON.stringify(syntheticJson, null, 2), 'utf8')
          hasJson = true
        } catch (synthErr) {}

        if (!hasJson) {
          continue
        }
      }

      try {
        const raw = fs.readFileSync(jsonPath, 'utf8')
        const data = JSON.parse(raw)

        const baseVersion = detectBaseMinecraftVersion(data, versionId)
        const mainClass = data.mainClass || ''

        let type = 'custom'
        let label = versionId

        const lowerId = versionId.toLowerCase()
        const lowerMain = mainClass.toLowerCase()

        let isModpack = false
        let modpackMeta = null
        const modpackMetaPath = path.join(dirPath, '.vibelauncher_modpack.json')
        if (fs.existsSync(modpackMetaPath)) {
          try {
            modpackMeta = JSON.parse(fs.readFileSync(modpackMetaPath, 'utf8'))
            isModpack = true
          } catch (e) {}
        }

        if (isModpack && modpackMeta) {
          type = 'modpack'
          label = modpackMeta.title
            ? `${modpackMeta.title} (${baseVersion || modpackMeta.mcVersion || 'MC'})`
            : `Сборка ${versionId}`
        } else if (lowerId.startsWith('fabric') || lowerMain.includes('fabricmc')) {
          type = 'fabric'
          const loaderMatch = versionId.match(/fabric-loader-([^-]+)-(.+)/)
          if (loaderMatch) {
            label = `Fabric ${loaderMatch[2]} (${loaderMatch[1]})`
          } else {
            label = `Fabric ${baseVersion}`
          }
        } else if (lowerId.includes('forge') || lowerMain.includes('minecraftforge') || lowerMain.includes('fml')) {
          type = 'forge'
          const forgeMatch = versionId.match(/forge-[^-]+-(.+)/)
          if (forgeMatch) {
            label = `Forge ${baseVersion} (${forgeMatch[1]})`
          } else {
            label = `Forge ${baseVersion}`
          }
        } else if (lowerId.includes('quilt') || lowerMain.includes('quiltmc')) {
          type = 'quilt'
          const quiltMatch = versionId.match(/quilt-loader-([^-]+)-(.+)/)
          if (quiltMatch) {
            label = `Quilt ${quiltMatch[2]} (${quiltMatch[1]})`
          } else {
            label = `Quilt ${baseVersion}`
          }
        } else if (lowerId.includes('optifine') || lowerMain.includes('optifine')) {
          type = 'optifine'
          label = `OptiFine ${baseVersion}`
        } else if (data.type === 'release' && versionId === data.id && !data.inheritsFrom) {
          type = 'vanilla'
          label = `Vanilla ${versionId}`
        } else if (data.type === 'snapshot' && versionId === data.id && !data.inheritsFrom) {
          type = 'snapshot'
          label = `Snapshot ${versionId}`
        } else {
          type = 'custom'
          label = `${versionId}`
        }

        // Ensure asset index alias exists for custom versions so MCLC line 167 never throws ENOENT
        try {
          const indexDir = path.join(rootDir, 'assets', 'indexes')
          const customIndex = path.join(indexDir, `${versionId}.json`)
          if (!fs.existsSync(customIndex)) {
            const possibleSrc = [
              path.join(indexDir, `${baseVersion}.json`),
              path.join(indexDir, `${data.assetIndex?.id}.json`),
              path.join(indexDir, `${data.assets}.json`),
              path.join(indexDir, '1.16.json'),
              path.join(indexDir, '1.20.json'),
              path.join(indexDir, '1.21.json'),
            ].find((p) => fs.existsSync(p))

            if (possibleSrc) {
              fs.copyFileSync(possibleSrc, customIndex)
            }
          }
        } catch (idxAliasErr) {}

        installed.push({
          id: versionId,
          label: label,
          type: type,
          baseVersion: baseVersion,
          inheritsFrom: data.inheritsFrom || null,
          mainClass: mainClass,
          jsonPath: jsonPath,
          hasJar: jarExists,
          isLocal: true,
          isModpack: isModpack,
          modpackMeta: modpackMeta,
          releaseTime: data.releaseTime || null,
        })
      } catch (err) {
        console.warn(`[Versions] Skipping corrupted version folder ${versionId}:`, err.message)
      }
    }

    // Sort alphabetically by label
    installed.sort((a, b) => a.label.localeCompare(b.label))

    return { ok: true, versions: installed, gameDir: rootDir }
  } catch (err) {
    console.error('[Versions] getLocalVersions error:', err)
    return { ok: false, error: err.message, versions: [] }
  }
}

async function getVersionManifest() {
  try {
    const data = await fetchMojangManifest()
    return { ok: true, latest: data.latest, versions: data.versions }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function getFabricVersions(mcVersion) {
  try {
    const { data } = await axios.get(
      `${FABRIC_META_URL}/versions/loader/${encodeURIComponent(mcVersion)}`,
      { timeout: 15000 }
    )
    return {
      ok: true,
      versions: data.map(v => ({
        loader: v.loader.version,
        stable: v.loader.stable,
      })),
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function getForgeVersions(mcVersion) {
  try {
    const { data } = await axios.get(FORGE_PROMOTIONS_URL, { timeout: 15000 })
    const promos = data.promos || {}
    const versions = []

    for (const [key, val] of Object.entries(promos)) {
      if (key.startsWith(mcVersion + '-')) {
        versions.push({
          key,
          version: val,
          recommended: key.includes('recommended'),
          latest: key.includes('latest'),
        })
      }
    }

    return { ok: true, versions }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function getQuiltVersions(mcVersion) {
  try {
    const { data } = await axios.get(
      `${QUILT_META_URL}/versions/loader/${encodeURIComponent(mcVersion)}`,
      { timeout: 15000 }
    )
    return {
      ok: true,
      versions: data.map((v) => ({
        loader: v.loader.version,
        stable: !v.loader.version.includes('beta') && !v.loader.version.includes('alpha'),
      })),
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/**
 * Downloads and installs a version into <gameDir>/versions with full client jar & assets indexing
 */
async function installVersion(opts, onProgress) {
  const { type = 'vanilla', mcVersion, loaderVersion, gameDir, customVersionId } = opts
  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
  const versionsDir = path.join(rootDir, 'versions')

  if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir, { recursive: true })
  }

  const sendProgress = (task, current, total) => {
    if (onProgress) {
      onProgress({ task, current, total: Math.max(total, 1) })
    }
  }

  try {
    if (type.toLowerCase() === 'fabric') {
      const lVer = loaderVersion || '0.16.10'
      const versionId = customVersionId || `fabric-loader-${lVer}-${mcVersion}`
      const targetDir = path.join(versionsDir, versionId)
      const jsonPath = path.join(targetDir, `${versionId}.json`)

      sendProgress(`Запрос профиля Fabric ${mcVersion}...`, 0, 4)
      fs.mkdirSync(targetDir, { recursive: true })

      const url = `${FABRIC_META_URL}/versions/loader/${mcVersion}/${lVer}/profile/json`
      const res = await axios.get(url, { timeout: 20000 })
      const fabricData = res.data
      fabricData.id = versionId

      sendProgress(`Получение базовых данных и клиента ${mcVersion}...`, 1, 4)
      await mergeBaseManifest(mcVersion, fabricData, rootDir, versionId, sendProgress)

      sendProgress(`Сохранение Fabric профиля...`, 3, 4)
      fs.writeFileSync(jsonPath, JSON.stringify(fabricData, null, 2), 'utf8')

      sendProgress(`Fabric ${mcVersion} успешно установлен!`, 4, 4)
      return { ok: true, versionId, type: 'fabric', baseVersion: mcVersion, label: `Fabric ${mcVersion} (${lVer})` }
    } else if (type.toLowerCase() === 'quilt') {
      const lVer = loaderVersion || '0.26.0'
      const versionId = customVersionId || `quilt-loader-${lVer}-${mcVersion}`
      const targetDir = path.join(versionsDir, versionId)
      const jsonPath = path.join(targetDir, `${versionId}.json`)

      sendProgress(`Запрос профиля Quilt ${mcVersion}...`, 0, 4)
      fs.mkdirSync(targetDir, { recursive: true })

      const url = `${QUILT_META_URL}/versions/loader/${mcVersion}/${lVer}/profile/json`
      const res = await axios.get(url, { timeout: 20000 })
      const quiltData = res.data
      quiltData.id = versionId

      sendProgress(`Получение базовых данных и клиента ${mcVersion}...`, 1, 4)
      await mergeBaseManifest(mcVersion, quiltData, rootDir, versionId, sendProgress)

      sendProgress(`Сохранение Quilt профиля...`, 3, 4)
      fs.writeFileSync(jsonPath, JSON.stringify(quiltData, null, 2), 'utf8')

      sendProgress(`Quilt ${mcVersion} успешно установлен!`, 4, 4)
      return { ok: true, versionId, type: 'quilt', baseVersion: mcVersion, label: `Quilt ${mcVersion} (${lVer})` }
    } else if (type.toLowerCase() === 'vanilla' || type.toLowerCase() === 'snapshot') {
      const versionId = customVersionId || mcVersion
      const targetDir = path.join(versionsDir, versionId)
      const jsonPath = path.join(targetDir, `${versionId}.json`)
      const jarPath = path.join(targetDir, `${versionId}.jar`)

      sendProgress(`Получение манифеста Minecraft...`, 0, 4)
      const manifest = await fetchMojangManifest()
      const found = manifest.versions?.find(v => v.id === mcVersion)

      if (!found || !found.url) {
        throw new Error(`Версия Minecraft ${mcVersion} не найдена в манифесте Mojang`)
      }

      sendProgress(`Загрузка метаданных ${versionId}...`, 1, 4)
      fs.mkdirSync(targetDir, { recursive: true })

      const versionRes = await axios.get(found.url, { timeout: 20000 })
      const versionData = versionRes.data
      versionData.id = versionId
      fs.writeFileSync(jsonPath, JSON.stringify(versionData, null, 2), 'utf8')

      // Pre-download asset index
      if (versionData?.assetIndex?.url) {
        const indexDir = path.join(rootDir, 'assets', 'indexes')
        fs.mkdirSync(indexDir, { recursive: true })
        const idxPath = path.join(indexDir, `${versionData.assetIndex.id || mcVersion}.json`)
        const aliasPath = path.join(indexDir, `${versionId}.json`)
        if (!fs.existsSync(idxPath)) {
          try {
            const idxRes = await axios.get(versionData.assetIndex.url, { timeout: 20000 })
            const content = JSON.stringify(idxRes.data, null, 2)
            fs.writeFileSync(idxPath, content, 'utf8')
            if (!fs.existsSync(aliasPath)) fs.writeFileSync(aliasPath, content, 'utf8')
          } catch (e) {}
        }
      }

      // Pre-download client JAR so version is truly installed
      if (!fs.existsSync(jarPath) || fs.statSync(jarPath).size < 100000) {
        const clientUrl = versionData?.downloads?.client?.url
        if (clientUrl) {
          sendProgress(`Загрузка игрового клиента ${versionId}.jar...`, 2, 4)
          const jarRes = await axios.get(clientUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
          })
          fs.writeFileSync(jarPath, Buffer.from(jarRes.data))
        }
      }

      sendProgress(`Версия ${versionId} успешно установлена!`, 4, 4)
      return { ok: true, versionId, type: 'vanilla', baseVersion: mcVersion, label: `Vanilla ${mcVersion}` }
    } else if (type.toLowerCase() === 'forge') {
      sendProgress(`Поиск Forge для ${mcVersion}...`, 0, 5)
      let forgeVer = loaderVersion
      if (!forgeVer) {
        try {
          const promoRes = await axios.get(FORGE_PROMOTIONS_URL, { timeout: 15000 })
          const promos = promoRes.data?.promos || {}
          forgeVer = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`]
        } catch (pErr) {
          console.warn('[Versions] Failed to fetch forge promotions:', pErr.message)
        }
      }
      if (!forgeVer) {
        throw new Error(`Не удалось определить версию Forge для Minecraft ${mcVersion}`)
      }

      const versionId = customVersionId || `forge-${mcVersion}-${forgeVer}`
      const targetDir = path.join(versionsDir, versionId)
      const jsonPath = path.join(targetDir, `${versionId}.json`)
      fs.mkdirSync(targetDir, { recursive: true })

      sendProgress(`Загрузка установщика Forge ${mcVersion}-${forgeVer}...`, 1, 5)
      const candidateUrls = [
        `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${forgeVer}/forge-${mcVersion}-${forgeVer}-installer.jar`,
        `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${forgeVer}-${mcVersion}/forge-${mcVersion}-${forgeVer}-${mcVersion}-installer.jar`,
        `https://files.minecraftforge.net/maven/net/minecraftforge/forge/${mcVersion}-${forgeVer}/forge-${mcVersion}-${forgeVer}-installer.jar`,
        `https://bmclapi2.bangbang93.com/forge/download?mcversion=${mcVersion}&version=${forgeVer}&category=installer`,
      ]

      let installerBuffer = null
      let downloadErr = null
      for (const u of candidateUrls) {
        try {
          const res = await axios.get(u, { responseType: 'arraybuffer', timeout: 35000 })
          if (res.data && res.data.length > 50000) {
            installerBuffer = Buffer.from(res.data)
            break
          }
        } catch (e) {
          downloadErr = e
        }
      }

      if (!installerBuffer) {
        throw new Error(
          `Ошибка загрузки Forge инсталлятора (${mcVersion}-${forgeVer}): ${
            downloadErr?.response?.data?.message || downloadErr?.message || 'Download failed'
          }`
        )
      }

      sendProgress(`Извлечение профиля Forge...`, 2, 5)
      let forgeData = null

      const vEntry = findAndExtractZipEntry(
        installerBuffer,
        (n) => n === 'version.json' || n.endsWith('/version.json')
      )
      if (vEntry) {
        try {
          forgeData = JSON.parse(vEntry.data.toString('utf8'))
        } catch (e) {}
      }

      if (!forgeData) {
        const pEntry = findAndExtractZipEntry(
          installerBuffer,
          (n) => n === 'install_profile.json' || n.endsWith('/install_profile.json')
        )
        if (pEntry) {
          try {
            const pJson = JSON.parse(pEntry.data.toString('utf8'))
            forgeData = pJson.versionInfo || pJson
          } catch (e) {}
        }
      }

      if (!forgeData) {
        throw new Error('Не удалось найти метаданные версии внутри установщика Forge')
      }

      forgeData.id = versionId
      if (!forgeData.inheritsFrom) {
        forgeData.inheritsFrom = mcVersion
      }

      if (Array.isArray(forgeData.libraries)) {
        for (const lib of forgeData.libraries) {
          if (lib.name && lib.name.startsWith('net.minecraftforge:') && !lib.url) {
            lib.url = 'https://maven.minecraftforge.net/'
          }
        }
      }

      // Save installer jar in version folder so launcher can execute ForgeWrapper
      try {
        fs.writeFileSync(path.join(targetDir, 'forge-installer.jar'), installerBuffer)
      } catch (e) {}

      // Extract universal jar if present
      try {
        const uniEntry = findAndExtractZipEntry(installerBuffer, (n) =>
          n.endsWith('-universal.jar') || (n.startsWith('forge-') && n.endsWith('.jar') && !n.includes('installer'))
        )
        if (uniEntry) {
          const libTargetDir = path.join(
            rootDir,
            'libraries',
            'net',
            'minecraftforge',
            'forge',
            `${mcVersion}-${forgeVer}`
          )
          fs.mkdirSync(libTargetDir, { recursive: true })
          fs.writeFileSync(path.join(libTargetDir, path.basename(uniEntry.name)), uniEntry.data)
        }
      } catch (uniErr) {}

      sendProgress(`Синхронизация базового Minecraft ${mcVersion}...`, 3, 5)
      await mergeBaseManifest(mcVersion, forgeData, rootDir, versionId, sendProgress)

      sendProgress(`Сохранение Forge профиля...`, 4, 5)
      fs.writeFileSync(jsonPath, JSON.stringify(forgeData, null, 2), 'utf8')

      sendProgress(`Forge ${mcVersion} успешно установлен!`, 5, 5)
      return {
        ok: true,
        versionId,
        type: 'forge',
        baseVersion: mcVersion,
        label: `Forge ${mcVersion} (${forgeVer})`,
      }
    }

    return { ok: false, error: 'Неизвестный тип версии: ' + type }
  } catch (err) {
    console.error('[Versions] installVersion error:', err)
    return { ok: false, error: err?.response?.data?.message || err.message }
  }
}

/**
 * Deletes a version directory safely with Path Traversal protection
 */
function deleteVersion(versionId, customGameDir) {
  if (!versionId || typeof versionId !== 'string') {
    return { ok: false, error: 'Не указан ID версии' }
  }

  const cleanId = versionId.trim()
  const safeId = path.basename(cleanId)
  if (!safeId || safeId === '.' || safeId === '..' || safeId !== cleanId) {
    return { ok: false, error: 'Недопустимый ID версии (Path Traversal)' }
  }

  const rootDir = customGameDir && customGameDir.trim() ? customGameDir.trim() : getDefaultGameDir()
  const targetDir = path.join(rootDir, 'versions', safeId)

  // Verify target is strictly inside versions directory
  const versionsDir = path.join(rootDir, 'versions')
  const rel = path.relative(versionsDir, targetDir)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, error: 'Запрещенная попытка выхода за пределы папки versions' }
  }

  try {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
      return { ok: true }
    }
    return { ok: false, error: 'Директория версии не найдена' }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

module.exports = {
  getDefaultGameDir,
  getLocalVersions,
  getVersionManifest,
  getForgeVersions,
  getFabricVersions,
  getQuiltVersions,
  installVersion,
  deleteVersion,
  detectBaseMinecraftVersion,
}
