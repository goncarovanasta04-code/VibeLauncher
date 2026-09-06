const axios = require('axios')
const path = require('path')
const fs = require('fs')
const zlib = require('zlib')
const { app } = require('electron')

const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'
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

async function mergeBaseManifest(mcVersion, targetData, rootDir, versionId) {
  try {
    const manifestRes = await axios.get(MANIFEST_URL, { timeout: 15000 })
    const found = manifestRes.data?.versions?.find((v) => v.id === mcVersion)
    if (found?.url) {
      const vRes = await axios.get(found.url, { timeout: 20000 })
      const baseData = vRes.data
      if (baseData?.assetIndex) targetData.assetIndex = baseData.assetIndex
      if (baseData?.assets) targetData.assets = baseData.assets
      if (baseData?.downloads && !targetData.downloads) targetData.downloads = baseData.downloads

      // Download asset index immediately
      if (baseData?.assetIndex?.url) {
        const indexDir = path.join(rootDir, 'assets', 'indexes')
        fs.mkdirSync(indexDir, { recursive: true })
        const assetIndexId = baseData.assetIndex.id || mcVersion
        const primaryPath = path.join(indexDir, `${assetIndexId}.json`)
        if (!fs.existsSync(primaryPath) || fs.statSync(primaryPath).size < 1000) {
          const idxRes = await axios.get(baseData.assetIndex.url, { timeout: 20000 })
          fs.writeFileSync(primaryPath, JSON.stringify(idxRes.data, null, 2), 'utf8')
        }
        if (fs.existsSync(primaryPath)) {
          const content = fs.readFileSync(primaryPath)
          const alias1 = path.join(indexDir, `${mcVersion}.json`)
          const alias2 = path.join(indexDir, `${versionId}.json`)
          if (!fs.existsSync(alias1)) fs.writeFileSync(alias1, content)
          if (!fs.existsSync(alias2)) fs.writeFileSync(alias2, content)
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
      if (!entry.isDirectory()) continue

      const versionId = entry.name
      const dirPath = path.join(versionsDir, versionId)

      // Look for <versionId>.json or any .json file in the folder
      let jsonPath = path.join(dirPath, `${versionId}.json`)
      let hasJson = fs.existsSync(jsonPath)
      if (!hasJson) {
        try {
          const files = fs.readdirSync(dirPath)
          const found = files.find(f => f.endsWith('.json'))
          if (found) {
            jsonPath = path.join(dirPath, found)
            hasJson = true
          }
        } catch (e) {}
      }

      const jarExists = fs.existsSync(path.join(dirPath, `${versionId}.jar`))

      if (!hasJson) {
        if (jarExists) {
          // A version folder with just a jar (e.g. custom jar or drop-in)
          installed.push({
            id: versionId,
            label: versionId,
            type: 'custom',
            baseVersion: versionId,
            inheritsFrom: null,
            mainClass: '',
            jsonPath: null,
            hasJar: true,
            isLocal: true,
            releaseTime: null,
          })
        }
        continue
      }

      try {
        const raw = fs.readFileSync(jsonPath, 'utf8')
        const data = JSON.parse(raw)

        const baseVersion = data.inheritsFrom || data.id || versionId
        const mainClass = data.mainClass || ''
        const jarExists = fs.existsSync(path.join(dirPath, `${versionId}.jar`))

        let type = 'custom'
        let label = versionId

        const lowerId = versionId.toLowerCase()
        const lowerMain = mainClass.toLowerCase()

        if (lowerId.startsWith('fabric') || lowerMain.includes('fabricmc')) {
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
          releaseTime: data.releaseTime || null,
        })
      } catch (err) {
        console.warn(`[Versions] Skipping corrupted version folder ${versionId}:`, err.message)
      }
    }

    // Sort alphabetically or release time
    installed.sort((a, b) => a.label.localeCompare(b.label))

    return { ok: true, versions: installed, gameDir: rootDir }
  } catch (err) {
    console.error('[Versions] getLocalVersions error:', err)
    return { ok: false, error: err.message, versions: [] }
  }
}

async function getVersionManifest() {
  try {
    const { data } = await axios.get(MANIFEST_URL, { timeout: 15000 })
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
    const promos = data.promos
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
 * Downloads and installs a version into <gameDir>/versions
 */
async function installVersion(opts, onProgress) {
  const { type = 'vanilla', mcVersion, loaderVersion, gameDir } = opts
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
      const versionId = `fabric-loader-${lVer}-${mcVersion}`
      const targetDir = path.join(versionsDir, versionId)
      const jsonPath = path.join(targetDir, `${versionId}.json`)

      sendProgress(`Запрос профиля Fabric ${mcVersion}...`, 0, 3)
      fs.mkdirSync(targetDir, { recursive: true })

      const url = `${FABRIC_META_URL}/versions/loader/${mcVersion}/${lVer}/profile/json`
      const res = await axios.get(url, { timeout: 20000 })
      const fabricData = res.data

      sendProgress(`Получение данных ванильной версии ${mcVersion}...`, 1, 3)
      await mergeBaseManifest(mcVersion, fabricData, rootDir, versionId)

      sendProgress(`Сохранение Fabric профиля...`, 2, 3)
      fs.writeFileSync(jsonPath, JSON.stringify(fabricData, null, 2), 'utf8')

      sendProgress(`Fabric ${mcVersion} успешно установлен!`, 3, 3)
      return { ok: true, versionId, type: 'fabric', baseVersion: mcVersion, label: `Fabric ${mcVersion} (${lVer})` }
    } else if (type.toLowerCase() === 'quilt') {
      const lVer = loaderVersion || '0.26.0'
      const versionId = `quilt-loader-${lVer}-${mcVersion}`
      const targetDir = path.join(versionsDir, versionId)
      const jsonPath = path.join(targetDir, `${versionId}.json`)

      sendProgress(`Запрос профиля Quilt ${mcVersion}...`, 0, 3)
      fs.mkdirSync(targetDir, { recursive: true })

      const url = `${QUILT_META_URL}/versions/loader/${mcVersion}/${lVer}/profile/json`
      const res = await axios.get(url, { timeout: 20000 })
      const quiltData = res.data

      sendProgress(`Получение данных ванильной версии ${mcVersion}...`, 1, 3)
      await mergeBaseManifest(mcVersion, quiltData, rootDir, versionId)

      sendProgress(`Сохранение Quilt профиля...`, 2, 3)
      fs.writeFileSync(jsonPath, JSON.stringify(quiltData, null, 2), 'utf8')

      sendProgress(`Quilt ${mcVersion} успешно установлен!`, 3, 3)
      return { ok: true, versionId, type: 'quilt', baseVersion: mcVersion, label: `Quilt ${mcVersion} (${lVer})` }
    } else if (type.toLowerCase() === 'vanilla' || type.toLowerCase() === 'snapshot') {
      const versionId = mcVersion
      const targetDir = path.join(versionsDir, versionId)
      const jsonPath = path.join(targetDir, `${versionId}.json`)

      sendProgress(`Получение манифеста Minecraft...`, 0, 3)
      const manifestRes = await axios.get(MANIFEST_URL, { timeout: 15000 })
      const found = manifestRes.data?.versions?.find(v => v.id === versionId)

      if (!found || !found.url) {
        throw new Error(`Версия Minecraft ${versionId} не найдена в манифесте Mojang`)
      }

      sendProgress(`Загрузка метаданных ${versionId}...`, 1, 3)
      fs.mkdirSync(targetDir, { recursive: true })

      const versionRes = await axios.get(found.url, { timeout: 20000 })
      fs.writeFileSync(jsonPath, JSON.stringify(versionRes.data, null, 2), 'utf8')

      sendProgress(`Версия ${versionId} успешно подготовлена!`, 3, 3)
      return { ok: true, versionId, type: 'vanilla', baseVersion: versionId, label: `Vanilla ${versionId}` }
    } else if (type.toLowerCase() === 'forge') {
      sendProgress(`Поиск Forge для ${mcVersion}...`, 0, 4)
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

      const versionId = `forge-${mcVersion}-${forgeVer}`
      const targetDir = path.join(versionsDir, versionId)
      const jsonPath = path.join(targetDir, `${versionId}.json`)
      fs.mkdirSync(targetDir, { recursive: true })

      sendProgress(`Загрузка установщика Forge ${mcVersion}-${forgeVer}...`, 1, 4)
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

      sendProgress(`Извлечение профиля Forge...`, 2, 4)
      let forgeData = null

      // Check version.json first
      const vEntry = findAndExtractZipEntry(
        installerBuffer,
        (n) => n === 'version.json' || n.endsWith('/version.json')
      )
      if (vEntry) {
        try {
          forgeData = JSON.parse(vEntry.data.toString('utf8'))
        } catch (e) {}
      }

      // Check install_profile.json
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

      // Guarantee proper id & inheritsFrom
      forgeData.id = versionId
      if (!forgeData.inheritsFrom) {
        forgeData.inheritsFrom = mcVersion
      }

      // Ensure Forge maven URL for net.minecraftforge libraries so launcher downloads them properly
      if (Array.isArray(forgeData.libraries)) {
        for (const lib of forgeData.libraries) {
          if (lib.name && lib.name.startsWith('net.minecraftforge:') && !lib.url) {
            lib.url = 'https://maven.minecraftforge.net/'
          }
        }
      }

      // If installer contains embedded universal jar, extract it directly into libraries/
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
      } catch (uniErr) {
        console.warn('[Versions] Optional universal jar extraction skipped:', uniErr.message)
      }

      // Save installer jar in version folder as fallback / reference
      try {
        fs.writeFileSync(path.join(targetDir, 'forge-installer.jar'), installerBuffer)
      } catch (e) {}

      sendProgress(`Синхронизация ресурсов Minecraft ${mcVersion}...`, 3, 4)
      await mergeBaseManifest(mcVersion, forgeData, rootDir, versionId)

      sendProgress(`Сохранение Forge профиля...`, 4, 4)
      fs.writeFileSync(jsonPath, JSON.stringify(forgeData, null, 2), 'utf8')

      sendProgress(`Forge ${mcVersion} успешно установлен!`, 4, 4)
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
 * Deletes a version directory from <gameDir>/versions/<versionId>
 */
function deleteVersion(versionId, customGameDir) {
  const rootDir = customGameDir && customGameDir.trim() ? customGameDir.trim() : getDefaultGameDir()
  const targetDir = path.join(rootDir, 'versions', versionId)

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
}
