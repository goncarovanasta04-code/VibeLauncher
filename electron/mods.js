const axios = require('axios')
const path = require('path')
const fs = require('fs')
const zlib = require('zlib')
const crypto = require('crypto')
const yauzl = require('yauzl')
const { app, shell } = require('electron')
const { installVersion } = require('./versions')

function getDefaultGameDir() {
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('appData'), '.minecraft')
  }
  return path.join(process.env.APPDATA || process.env.HOME || '', '.minecraft')
}

function getSafeVersionId(versionId) {
  if (!versionId || typeof versionId !== 'string') return null
  const cleaned = path.basename(versionId.trim())
  if (!cleaned || cleaned === '.' || cleaned === '..') return null
  return cleaned
}

function getSafeArchiveDestination(baseDir, relativePath) {
  const normal = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normal || normal.includes('\0')) return null
  const destination = path.resolve(baseDir, normal)
  const base = path.resolve(baseDir) + path.sep
  return destination.startsWith(base) ? destination : null
}

function verifyMrpackFile(buffer, hashes = {}) {
  for (const [algorithm, expected] of Object.entries(hashes || {})) {
    if (!expected || !crypto.getHashes().includes(algorithm)) continue
    const actual = crypto.createHash(algorithm).update(buffer).digest('hex')
    if (actual.toLowerCase() !== String(expected).toLowerCase()) {
      throw new Error(`Проверка целостности не пройдена (${algorithm})`)
    }
    return
  }
}

function getVersionContentDir(rootDir, versionId, contentType, isolateVersionFolders = true) {
  const safeVerId = getSafeVersionId(versionId)
  const baseDir = (safeVerId && isolateVersionFolders !== false)
    ? path.join(rootDir, 'versions', safeVerId)
    : rootDir
  let sub = 'mods'
  if (contentType === 'resourcepack' || contentType === 'resourcepacks') sub = 'resourcepacks'
  else if (contentType === 'shader' || contentType === 'shaderpacks') sub = 'shaderpacks'
  else if (contentType === 'datapack' || contentType === 'datapacks') sub = 'datapacks'
  else if (contentType === 'modpack' || contentType === 'modpacks') sub = 'modpacks'

  const targetDir = path.join(baseDir, sub)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  return targetDir
}

function getManifestPath(rootDir, versionId, isolateVersionFolders = true) {
  const safeVerId = getSafeVersionId(versionId)
  const baseDir = (safeVerId && isolateVersionFolders !== false)
    ? path.join(rootDir, 'versions', safeVerId)
    : rootDir
  return path.join(baseDir, '.vibelauncher_content.json')
}

function readContentManifest(rootDir, versionId, isolateVersionFolders = true) {
  const p = getManifestPath(rootDir, versionId, isolateVersionFolders)
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch (e) {}
  }
  return { installed: {} }
}

function writeContentManifest(rootDir, versionId, data, isolateVersionFolders = true) {
  const p = getManifestPath(rootDir, versionId, isolateVersionFolders)
  try {
    const dir = path.dirname(p)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.warn('[Mods] Could not write content manifest:', e.message)
  }
}

// Russian to English search keywords dictionary for Modrinth
const RU_EN_MOD_SYNONYMS = {
  'содиум': 'sodium',
  'рубидий': 'rubidium',
  'эмбеддиум': 'embeddium',
  'оптифайн': 'optifine',
  'ирис': 'iris',
  'шейдер': 'shader',
  'шейдеры': 'shaders',
  'миникарта': 'minimap',
  'карта': 'minimap map',
  'джетпак': 'jetpack',
  'мебель': 'furniture',
  'оружие': 'guns weapon',
  'магия': 'magic spell',
  'еда': 'food delight',
  'ферма': 'farming delight',
  'броня': 'armor',
  'техника': 'tech technology',
  'технологии': 'technology machines',
  'анимации': 'animations fresh',
  'физика': 'physics',
  'голос': 'simple voice chat',
  'голосовой': 'voice chat',
  'двойной прыжок': 'double jump',
  'зум': 'zoom',
  'крафты': 'jei recipes',
  'рецепты': 'jei recipes',
  'джеи': 'jei',
  'рей': 'rei',
  'эми': 'emi',
  'сундук': 'chests',
  'сундуки': 'chests',
  'рюкзак': 'backpack',
  'рюкзаки': 'backpacks',
  'оптимизация': 'optimization performance',
  'фпс': 'fps',
  'криэйт': 'create',
  'крейт': 'create',
  'меканизм': 'mekanism',
  'ботания': 'botania',
  'астрал': 'astral',
  'сумеречный лес': 'twilight forest',
  'твайлайт': 'twilight forest',
  'мобы': 'mobs',
  'боссы': 'bosses',
  'данжи': 'dungeons',
  'структуры': 'structures',
  'биомы': 'biomes',
  'звуки': 'sound',
  'освещение': 'dynamic lights',
}

function expandSearchQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return ''
  const trimmed = rawQuery.trim()
  const lower = trimmed.toLowerCase()
  if (RU_EN_MOD_SYNONYMS[lower]) {
    return RU_EN_MOD_SYNONYMS[lower]
  }
  for (const [ru, en] of Object.entries(RU_EN_MOD_SYNONYMS)) {
    if (lower.includes(ru)) {
      return lower.replace(new RegExp(ru, 'g'), en).trim()
    }
  }
  return trimmed
}

/**
 * Search Modrinth for mods, modpacks, shaders, resourcepacks, and datapacks
 */
async function searchModrinth({
  query = '',
  type = 'mod',
  mcVersion,
  loader = 'fabric',
  limit = 30,
  offset = 0,
}) {
  try {
    const effectiveQuery = expandSearchQuery(query)
    const facets = []

    // Project type facet: mod, modpack, resourcepack, shader, datapack
    let pType = 'mod'
    if (type === 'shader') pType = 'shader'
    else if (type === 'resourcepack') pType = 'resourcepack'
    else if (type === 'modpack') pType = 'modpack'
    else if (type === 'datapack') pType = 'datapack'
    facets.push([`project_type:${pType}`])

    // Version filter: normalize e.g. "fabric-loader-0.16.10-1.20.1" or "better_mc_1_20_1" -> "1.20.1"
    let cleanMcVer = mcVersion ? mcVersion.trim() : null
    if (cleanMcVer && cleanMcVer !== 'all') {
      const match = cleanMcVer.replace(/_/g, '.').match(/((?:1\.\d+|2[6-9])(?:\.\d+)*)/)
      if (match) cleanMcVer = match[1]
      else if (!/^(?:1\.\d+|2[6-9])/.test(cleanMcVer)) cleanMcVer = null
    } else {
      cleanMcVer = null
    }

    if (cleanMcVer) {
      facets.push([`versions:${cleanMcVer}`])
    }

    // Loader filter (ONLY for mods and modpacks; shaders, datapacks and resourcepacks do not use loader filters)
    if (
      (pType === 'mod' || pType === 'modpack') &&
      loader &&
      loader.trim() &&
      loader !== 'all' &&
      loader !== 'vanilla'
    ) {
      facets.push([`categories:${loader.toLowerCase().trim()}`])
    }

    const queryModrinthApi = async (curQuery, curFacets) => {
      const params = {
        query: curQuery,
        facets: JSON.stringify(curFacets),
        index: curQuery ? 'relevance' : 'downloads',
        limit: Math.max(1, Math.min(100, Number(limit) || 30)),
        offset: Math.max(0, Number(offset) || 0),
      }
      const res = await axios.get('https://api.modrinth.com/v2/search', {
        params,
        headers: { 'User-Agent': 'VibeLauncher/1.0 (contact@vibelauncher.app)' },
        timeout: 15000,
      })
      return res.data || {}
    }

    // Attempt 1: Strict query with version and loader facets
    let data = await queryModrinthApi(effectiveQuery, facets)
    let hits = data.hits || []

    // Attempt 2: If query had 0 hits and was filtered by version, relax version filter
    if (hits.length === 0 && effectiveQuery && cleanMcVer) {
      const facetsNoVer = facets.filter((f) => !f[0]?.startsWith('versions:'))
      const fallbackData = await queryModrinthApi(effectiveQuery, facetsNoVer)
      if ((fallbackData.hits || []).length > 0) {
        data = fallbackData
        hits = fallbackData.hits
      }
    }

    // Attempt 3: If still 0 hits and loader was filtered, relax loader filter
    if (hits.length === 0 && effectiveQuery && loader && loader !== 'all') {
      const facetsPlain = [[`project_type:${pType}`]]
      const fallbackData = await queryModrinthApi(effectiveQuery, facetsPlain)
      if ((fallbackData.hits || []).length > 0) {
        data = fallbackData
        hits = fallbackData.hits
      }
    }

    const results = hits.map((hit) => ({
      id: hit.project_id,
      slug: hit.slug,
      title: hit.title,
      description: hit.description,
      icon: hit.icon_url,
      downloads: hit.downloads,
      follows: hit.follows,
      author: hit.author,
      categories: hit.categories || [],
      versions: hit.versions || [],
      projectType: hit.project_type,
    }))

    return {
      ok: true,
      total: data.total_hits || results.length,
      hits: results,
      limit: Number(limit) || 30,
      offset: Number(offset) || 0,
    }
  } catch (err) {
    console.error('[Modrinth Search Error]:', err.message)
    return { ok: false, error: err.message, hits: [], total: 0 }
  }
}

/**
 * Gets rich project details from Modrinth (full description, gallery, links, metadata)
 */
async function getModrinthProjectDetails(slugOrId) {
  if (!slugOrId || typeof slugOrId !== 'string') {
    return { ok: false, error: 'Не указан ID или slug проекта' }
  }
  try {
    const res = await axios.get(
      `https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId.trim())}`,
      {
        headers: { 'User-Agent': 'VibeLauncher/1.0 (contact@vibelauncher.app)' },
        timeout: 15000,
      }
    )
    const data = res.data
    return {
      ok: true,
      project: {
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description,
        body: data.body,
        icon: data.icon_url,
        projectType: data.project_type,
        downloads: data.downloads,
        followers: data.followers,
        categories: data.categories || [],
        additionalCategories: data.additional_categories || [],
        loaders: data.loaders || [],
        gameVersions: data.game_versions || [],
        published: data.published,
        updated: data.updated,
        license: data.license ? data.license.name || data.license.id : null,
        gallery: (data.gallery || []).map((img) => ({
          url: img.url,
          title: img.title || '',
          description: img.description || '',
          featured: img.featured || false,
        })),
        sourceUrl: data.source_url || null,
        issuesUrl: data.issues_url || null,
        wikiUrl: data.wiki_url || null,
        discordUrl: data.discord_url || null,
        donationUrls: data.donation_urls || [],
      },
    }
  } catch (err) {
    console.error('[Modrinth Project Details Error]:', err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Gets project version files from Modrinth (supports mods, shaders, resourcepacks)
 */
async function getModrinthProjectVersions({ slugOrId, mcVersion, loader, type = 'mod' }) {
  try {
    const params = {}

    // Only apply loader filter for mods (shaders/resourcepacks do not use standard mod loaders)
    if (type === 'mod' && loader && loader !== 'all' && loader !== 'vanilla') {
      params.loaders = JSON.stringify([loader.toLowerCase()])
    }

    if (mcVersion) {
      params.game_versions = JSON.stringify([mcVersion])
    }

    const res = await axios.get(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
      params,
      headers: { 'User-Agent': 'VibeLauncher/1.0' },
      timeout: 15000,
    })

    const versions = (res.data || []).map((v) => {
      const primaryFile = v.files?.find((f) => f.primary) || v.files?.[0]
      return {
        id: v.id,
        name: v.name,
        versionNumber: v.version_number,
        gameVersions: v.game_versions,
        loaders: v.loaders,
        datePublished: v.date_published,
        dependencies: v.dependencies || [],
        file: primaryFile
          ? {
              url: primaryFile.url,
              filename: primaryFile.filename,
              size: primaryFile.size,
              sha512: primaryFile.hashes?.sha512,
            }
          : null,
      }
    })

    return { ok: true, versions }
  } catch (err) {
    console.error('[Modrinth Project Versions Error]:', err.message)
    return { ok: false, error: err.message, versions: [] }
  }
}

// Visual-performance profile: these projects improve renderer, culling and
// memory behaviour without rewriting the player's graphics settings.  Every
// file is still resolved from Modrinth for the exact Minecraft version/loader.
const PERFORMANCE_PROJECTS = {
  fabric: ['sodium', 'lithium', 'ferrite-core', 'entityculling', 'modernfix', 'immediatelyfast'],
  quilt: ['sodium', 'lithium', 'ferrite-core', 'entityculling', 'modernfix', 'immediatelyfast'],
  forge: ['rubidium', 'ferrite-core', 'entityculling', 'modernfix'],
  neoforge: ['embeddium', 'ferrite-core', 'entityculling', 'modernfix'],
}

async function installPerformanceProfile({ versionId, mcVersion, loader, gameDir, isolateVersionFolders = true }, onProgress) {
  const normalizedLoader = String(loader || '').toLowerCase()
  const projects = PERFORMANCE_PROJECTS[normalizedLoader]
  if (!projects) {
    return { ok: false, error: 'Профиль производительности доступен для Fabric, Quilt, Forge и NeoForge.' }
  }
  if (!getSafeVersionId(versionId) || !mcVersion) {
    return { ok: false, error: 'Не выбрана корректная версия Minecraft.' }
  }

  const installed = []
  const skipped = []
  for (let index = 0; index < projects.length; index += 1) {
    const slug = projects[index]
    if (onProgress) onProgress({
      task: `Подбор ${slug} (${index + 1}/${projects.length})`,
      current: index,
      total: projects.length,
    })
    const versionResult = await getModrinthProjectVersions({
      slugOrId: slug,
      mcVersion,
      loader: normalizedLoader,
      type: 'mod',
    })
    const selected = versionResult?.versions?.[0]
    if (!selected?.file?.url || !selected.file.filename) {
      skipped.push(slug)
      continue
    }
    const installResult = await installModFile({
      fileUrl: selected.file.url,
      fileName: selected.file.filename,
      versionId,
      type: 'mod',
      projectId: slug,
      projectSlug: slug,
      projectTitle: slug,
      gameDir,
      isolateVersionFolders,
      dependencies: selected.dependencies,
      mcVersion,
      loader: normalizedLoader,
    }, (progress) => {
      if (onProgress) onProgress({
        ...progress,
        task: `${index + 1}/${projects.length}: ${progress.task}`,
        current: index + (Number(progress.current) || 0) / 100,
        total: projects.length,
      })
    })
    if (installResult?.ok) installed.push(slug)
    else skipped.push(slug)
  }

  if (onProgress) onProgress({ task: 'Профиль производительности готов', current: projects.length, total: projects.length })
  return { ok: installed.length > 0, installed, skipped }
}

/**
 * Installs (downloads) a mod/shader/resourcepack file into the version folder
 */
async function installModFile(
  {
    fileUrl,
    fileName,
    versionId,
    type = 'mod',
    projectId,
    projectSlug,
    projectTitle,
    gameDir,
    isolateVersionFolders = true,
    dependencies,
    mcVersion,
    loader,
  },
  onProgress
) {
  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
  const targetDir = getVersionContentDir(rootDir, versionId, type, isolateVersionFolders)
  const safeFileName = path.basename(fileName)
  const targetPath = path.join(targetDir, safeFileName)

  try {
    if (onProgress) onProgress({ task: `Загрузка ${safeFileName}...`, current: 0, total: 100 })

    const res = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      onDownloadProgress: (evt) => {
        if (onProgress && evt.total) {
          const pct = Math.round((evt.loaded / evt.total) * 100)
          onProgress({ task: `Загрузка ${safeFileName}`, current: pct, total: 100 })
        }
      },
    })

    fs.writeFileSync(targetPath, Buffer.from(res.data))

    // Record installation in .vibelauncher_content.json manifest
    const manifest = readContentManifest(rootDir, versionId, isolateVersionFolders)
    const key = projectId || projectSlug || safeFileName
    manifest.installed[key] = {
      id: projectId || '',
      slug: projectSlug || '',
      title: projectTitle || safeFileName,
      fileName: safeFileName,
      filePath: targetPath,
      type: type,
      installedAt: Date.now(),
    }
    writeContentManifest(rootDir, versionId, manifest, isolateVersionFolders)

    // Auto-download required dependencies from Modrinth (if type === 'mod')
    if (type === 'mod' && Array.isArray(dependencies) && dependencies.length > 0) {
      for (const dep of dependencies) {
        if (dep.dependency_type === 'required' && (dep.version_id || dep.project_id)) {
          try {
            const currentManifest = readContentManifest(rootDir, versionId, isolateVersionFolders)
            const depKey = dep.project_id || dep.version_id
            if (currentManifest.installed && currentManifest.installed[depKey]) {
              continue
            }

            let depFileUrl = null
            let depFileName = null
            let depProjectId = dep.project_id

            if (dep.version_id) {
              const vRes = await axios.get(`https://api.modrinth.com/v2/version/${dep.version_id}`, {
                headers: { 'User-Agent': 'VibeLauncher/1.0' },
                timeout: 15000,
              })
              const pFile = vRes.data?.files?.find((f) => f.primary) || vRes.data?.files?.[0]
              if (pFile) {
                depFileUrl = pFile.url
                depFileName = pFile.filename
                depProjectId = vRes.data.project_id
              }
            } else if (dep.project_id) {
              const pParams = {}
              if (loader && loader !== 'all' && loader !== 'vanilla') {
                pParams.loaders = JSON.stringify([loader.toLowerCase()])
              }
              if (mcVersion) {
                pParams.game_versions = JSON.stringify([mcVersion])
              }
              const pRes = await axios.get(`https://api.modrinth.com/v2/project/${dep.project_id}/version`, {
                params: pParams,
                headers: { 'User-Agent': 'VibeLauncher/1.0' },
                timeout: 15000,
              })
              const firstVer = pRes.data?.[0]
              const pFile = firstVer?.files?.find((f) => f.primary) || firstVer?.files?.[0]
              if (pFile) {
                depFileUrl = pFile.url
                depFileName = pFile.filename
              }
            }

            if (depFileUrl && depFileName) {
              const safeDepFileName = path.basename(depFileName)
              const depTargetPath = path.join(targetDir, safeDepFileName)
              if (!fs.existsSync(depTargetPath)) {
                if (onProgress) {
                  onProgress({ task: `Загрузка зависимости: ${safeDepFileName}...`, current: 50, total: 100 })
                }
                const depRes = await axios.get(depFileUrl, {
                  responseType: 'arraybuffer',
                  timeout: 45000,
                })
                fs.writeFileSync(depTargetPath, Buffer.from(depRes.data))

                const updatedManifest = readContentManifest(rootDir, versionId, isolateVersionFolders)
                updatedManifest.installed[depProjectId || safeDepFileName] = {
                  id: depProjectId || '',
                  slug: '',
                  title: safeDepFileName,
                  fileName: safeDepFileName,
                  filePath: depTargetPath,
                  type: 'mod',
                  isDependency: true,
                  installedAt: Date.now(),
                }
                writeContentManifest(rootDir, versionId, updatedManifest, isolateVersionFolders)
              }
            }
          } catch (depErr) {
            console.warn('[Mods] Could not auto-install dependency:', depErr.message)
          }
        }
      }
    }

    if (onProgress) onProgress({ task: `Установлено: ${safeFileName}`, current: 100, total: 100 })
    return { ok: true, filePath: targetPath, fileName: safeFileName, projectId, projectSlug }
  } catch (err) {
    console.error('[Mod Install Error]:', err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Scans installed mods, shaders, and resourcepacks in the version directory
 */
function getInstalledContent({ versionId, gameDir, isolateVersionFolders = true }) {
  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
  const safeVersionId = getSafeVersionId(versionId)
  const baseDir = (safeVersionId && isolateVersionFolders !== false)
    ? path.join(rootDir, 'versions', safeVersionId)
    : rootDir

  if (versionId && isolateVersionFolders !== false && !safeVersionId) {
    return { ok: false, error: 'Недопустимый ID версии' }
  }

  const categories = [
    { key: 'mods', type: 'mod' },
    { key: 'shaderpacks', type: 'shader' },
    { key: 'resourcepacks', type: 'resourcepack' },
    { key: 'datapacks', type: 'datapack' },
  ]

  const items = []
  const manifest = readContentManifest(rootDir, versionId, isolateVersionFolders)
  const installedProjectIds = new Set()
  const installedSlugs = new Set()
  const installedFileNames = new Set()

  for (const info of Object.values(manifest.installed || {})) {
    if (info.id) installedProjectIds.add(info.id)
    if (info.slug) installedSlugs.add(info.slug.toLowerCase())
    if (info.fileName) installedFileNames.add(info.fileName.toLowerCase())
  }

  // Check if current version is a standalone Modpack
  const modpackMetaPath = path.join(baseDir, '.vibelauncher_modpack.json')
  if (fs.existsSync(modpackMetaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(modpackMetaPath, 'utf8'))
      if (meta.id) installedProjectIds.add(meta.id)
      if (meta.slug) installedSlugs.add(meta.slug.toLowerCase())
      items.push({
        name: meta.title || versionId,
        rawName: versionId,
        path: baseDir,
        size: 0,
        type: 'modpack',
        enabled: true,
        category: 'modpacks',
        isModpack: true,
        modpackMeta: meta,
      })
    } catch (e) {}
  }

  for (const cat of categories) {
    const dir = path.join(baseDir, cat.key)
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true })
        for (const file of files) {
          if (file.isDirectory()) continue
          const fullPath = path.join(dir, file.name)
          const isEnabled = !file.name.endsWith('.disabled')
          let cleanName = file.name
          if (cleanName.endsWith('.disabled')) cleanName = cleanName.replace(/\.disabled$/, '')

          let size = 0
          try {
            size = fs.statSync(fullPath).size
          } catch (e) {}

          installedFileNames.add(cleanName.toLowerCase())

          items.push({
            name: cleanName,
            rawName: file.name,
            path: fullPath,
            size: size,
            type: cat.type,
            enabled: isEnabled,
            category: cat.key,
          })
        }
      } catch (e) {}
    }
  }

  return {
    ok: true,
    items,
    versionId,
    baseDir,
    installedProjectIds: Array.from(installedProjectIds),
    installedSlugs: Array.from(installedSlugs),
    installedFileNames: Array.from(installedFileNames),
  }
}

function isPathWithinGameDir(targetPath, gameDir) {
  if (!targetPath || typeof targetPath !== 'string') return false
  const root = path.resolve(gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir())
  const resolved = path.resolve(targetPath)
  return resolved.startsWith(root + path.sep) || resolved === root
}

/**
 * Enables or disables a mod file (.jar <-> .jar.disabled)
 */
function toggleModFile(filePath, gameDir) {
  try {
    if (!filePath || typeof filePath !== 'string') return { ok: false, error: 'Неверный путь' }
    if (!isPathWithinGameDir(filePath, gameDir)) {
      return { ok: false, error: 'Доступ запрещен: путь выходит за пределы папки игры' }
    }
    if (!fs.existsSync(filePath)) return { ok: false, error: 'Файл не найден' }

    let newPath
    if (filePath.endsWith('.disabled')) {
      newPath = filePath.substring(0, filePath.length - 9)
    } else {
      newPath = filePath + '.disabled'
    }

    fs.renameSync(filePath, newPath)
    return { ok: true, newPath, enabled: !newPath.endsWith('.disabled') }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/**
 * Deletes a mod/shader/resourcepack file and updates manifest
 */
function deleteModFile(filePath, versionId, gameDir, isolateVersionFolders = true) {
  try {
    if (!filePath || typeof filePath !== 'string') return { ok: false, error: 'Неверный путь' }
    if (!isPathWithinGameDir(filePath, gameDir)) {
      return { ok: false, error: 'Доступ запрещен: путь выходит за пределы папки игры' }
    }
    if (fs.existsSync(filePath)) {
      const fileName = path.basename(filePath)
      fs.unlinkSync(filePath)

      // Clean from manifest if versionId is provided
      if (versionId) {
        const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
        const manifest = readContentManifest(rootDir, versionId, isolateVersionFolders)
        for (const [key, val] of Object.entries(manifest.installed || {})) {
          if (val.fileName === fileName || val.filePath === filePath) {
            delete manifest.installed[key]
          }
        }
        writeContentManifest(rootDir, versionId, manifest, isolateVersionFolders)
      }

      return { ok: true }
    }
    return { ok: false, error: 'Файл не найден' }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/**
 * Opens the mods/shaderpacks/resourcepacks folder in Explorer
 */
function openContentFolder({ versionId, type = 'mods', gameDir, isolateVersionFolders = true }) {
  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
  const dir = getVersionContentDir(rootDir, versionId, type, isolateVersionFolders)
  shell.openPath(dir)
  return true
}

/**
 * Fast pure Node.js ZIP entry extractor using zlib.inflateRawSync.
 */
function extractAllZipEntries(buffer) {
  const entries = []
  if (!buffer || buffer.length < 22) return entries
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

        if (localHeaderOffset + 30 <= buffer.length) {
          const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26)
          const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28)
          const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen
          if (dataOffset + compSize <= buffer.length) {
            const slice = buffer.slice(dataOffset, dataOffset + compSize)
            let data = null
            if (compMethod === 0) {
              data = slice
            } else if (compMethod === 8) {
              try {
                data = zlib.inflateRawSync(slice)
              } catch (zErr) {
                console.warn(`[Mods] zlib inflate failed for ${fileName}:`, zErr.message)
              }
            }
            if (data !== null) {
              entries.push({ name: fileName, data, isDirectory: fileName.endsWith('/') })
            }
          }
        }
        ptr += 46 + nameLen + extraLen + commentLen
      }
      break
    }
  }
  return entries
}

function getMrpackOverrideRelativePath(entryName) {
  const normalized = String(entryName || '').replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.startsWith('overrides/')) return normalized.slice('overrides/'.length)
  if (normalized.startsWith('client-overrides/')) return normalized.slice('client-overrides/'.length)
  return null
}

/**
 * Reads a Modrinth index without loading the whole archive into memory.
 * yauzl supports ZIP64 archives, which are common for large official Modrinth packs.
 */
function readMrpackIndexFromFile(filePath) {
  return new Promise((resolve, reject) => {
    let zip = null
    let settled = false
    let foundIndex = false

    const fail = (error) => {
      if (settled) return
      settled = true
      try { zip?.close() } catch (_) {}
      reject(error instanceof Error ? error : new Error(String(error)))
    }
    const succeed = (value) => {
      if (settled) return
      settled = true
      try { zip?.close() } catch (_) {}
      resolve(value)
    }

    yauzl.open(filePath, { lazyEntries: true, autoClose: true, validateEntrySizes: true }, (openError, archive) => {
      if (openError) return fail(new Error(`Не удалось открыть .mrpack: ${openError.message}`))
      zip = archive
      zip.on('error', fail)
      zip.on('entry', (entry) => {
        const entryName = String(entry.fileName || '').replace(/\\/g, '/')
        if (entryName !== 'modrinth.index.json' && !entryName.endsWith('/modrinth.index.json')) {
          zip.readEntry()
          return
        }

        foundIndex = true
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return fail(new Error(`Не удалось прочитать modrinth.index.json: ${streamError.message}`))
          const chunks = []
          let size = 0
          stream.on('data', (chunk) => {
            size += chunk.length
            if (size > 5 * 1024 * 1024) {
              stream.destroy(new Error('Файл modrinth.index.json слишком большой'))
              return
            }
            chunks.push(chunk)
          })
          stream.on('error', fail)
          stream.on('end', () => {
            try {
              succeed(JSON.parse(Buffer.concat(chunks).toString('utf8')))
            } catch (parseError) {
              fail(new Error(`Не удалось прочитать modrinth.index.json: ${parseError.message}`))
            }
          })
        })
      })
      zip.on('end', () => {
        if (!foundIndex) fail(new Error('Файл modrinth.index.json не найден внутри пакета сборки'))
      })
      zip.readEntry()
    })
  })
}

/** Extracts only overrides from a local .mrpack, preserving paths safely and streaming every file. */
function extractMrpackOverridesFromFile(filePath, targetVersionDir, onProgress) {
  return new Promise((resolve, reject) => {
    let zip = null
    let copied = 0
    let settled = false
    const fail = (error) => {
      if (settled) return
      settled = true
      try { zip?.close() } catch (_) {}
      reject(error instanceof Error ? error : new Error(String(error)))
    }
    const finish = () => {
      if (settled) return
      settled = true
      resolve(copied)
    }
    const next = () => {
      if (!settled) zip.readEntry()
    }

    yauzl.open(filePath, { lazyEntries: true, autoClose: true, validateEntrySizes: true }, (openError, archive) => {
      if (openError) return fail(new Error(`Не удалось открыть .mrpack для извлечения: ${openError.message}`))
      zip = archive
      zip.on('error', fail)
      zip.on('end', finish)
      zip.on('entry', (entry) => {
        const relativePath = getMrpackOverrideRelativePath(entry.fileName)
        if (!relativePath || entry.fileName.endsWith('/')) {
          next()
          return
        }

        const destination = getSafeArchiveDestination(targetVersionDir, relativePath)
        if (!destination) {
          fail(new Error(`Недопустимый путь в overrides: ${relativePath}`))
          return
        }
        fs.mkdirSync(path.dirname(destination), { recursive: true })
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return fail(new Error(`Не удалось извлечь ${relativePath}: ${streamError.message}`))
          const output = fs.createWriteStream(destination)
          stream.on('error', fail)
          output.on('error', fail)
          output.on('close', () => {
            copied += 1
            if (onProgress && copied % 25 === 0) {
              onProgress({ task: `Применение настроек сборки: ${copied} файлов`, current: 96, total: 100 })
            }
            next()
          })
          stream.pipe(output)
        })
      })
      zip.readEntry()
    })
  })
}

/**
 * Installs a Modrinth modpack (.mrpack) as a complete standalone version!
 */
async function installModpack(
  {
    fileUrl,
    localFilePath,
    fileName,
    projectId,
    projectSlug,
    projectTitle,
    projectIcon,
    specificVersion,
    gameDir,
  },
  onProgress
) {
  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()

  try {
    if (onProgress) onProgress({ task: localFilePath ? 'Проверка выбранной сборки (.mrpack)...' : `Загрузка сборки ${projectTitle || 'modpack'}...`, current: 5, total: 100 })

    // Step 1: read a local archive stream or download a Modrinth archive.
    let zipBuffer = null
    let indexJson = null
    let resolvedLocalFile = null
    if (localFilePath) {
      resolvedLocalFile = path.resolve(localFilePath)
      if (path.extname(resolvedLocalFile).toLowerCase() !== '.mrpack' || !fs.existsSync(resolvedLocalFile)) {
        throw new Error('Выберите существующий файл сборки в формате .mrpack')
      }
      const stat = fs.statSync(resolvedLocalFile)
      // Modrinth packs may include worlds, maps and resource assets in overrides.
      // Keep a high safety ceiling while processing every file as a stream.
      if (stat.size < 22 || stat.size > 16 * 1024 * 1024 * 1024) {
        throw new Error('Размер .mrpack некорректен или превышает 16 ГБ')
      }
      // Do not use readFileSync here: a legitimate Modrinth pack can be ZIP64 and exceed 1 GB.
      indexJson = await readMrpackIndexFromFile(resolvedLocalFile)
    } else {
      if (!fileUrl) throw new Error('Не указана ссылка на файл .mrpack')
      const mrpackRes = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        onDownloadProgress: (evt) => {
          if (onProgress && evt.total) {
            const pct = Math.min(25, Math.round((evt.loaded / evt.total) * 20) + 5)
            onProgress({ task: 'Загрузка пакета сборки (.mrpack)...', current: pct, total: 100 })
          }
        },
      })
      zipBuffer = Buffer.from(mrpackRes.data)
    }

    // Step 2: Locate and parse modrinth.index.json
    let entries = []
    if (!indexJson) {
      entries = extractAllZipEntries(zipBuffer)
      const indexEntry = entries.find((e) => e.name === 'modrinth.index.json' || e.name.endsWith('/modrinth.index.json'))
      if (!indexEntry) {
        throw new Error('Файл modrinth.index.json не найден внутри пакета сборки')
      }
      indexJson = JSON.parse(indexEntry.data.toString('utf8'))
    }
    const deps = indexJson.dependencies || {}
    const mcVersion = deps.minecraft || '1.20.1'

    let loader = 'fabric'
    let loaderVersion = null

    if (deps['fabric-loader']) {
      loader = 'fabric'
      loaderVersion = deps['fabric-loader']
    } else if (deps['quilt-loader']) {
      loader = 'quilt'
      loaderVersion = deps['quilt-loader']
    } else if (deps['forge']) {
      loader = 'forge'
      loaderVersion = deps['forge']
    } else if (deps['neoforge']) {
      loader = 'neoforge'
      loaderVersion = deps['neoforge']
    } else {
      loader = 'vanilla'
    }

    // Step 3: Create unique standalone version ID
    const titleSlug = (projectSlug || projectTitle || indexJson.name || 'modpack')
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .substring(0, 35)

    const rawVerNum = specificVersion?.versionNumber || indexJson.versionId || ''
    const cleanVerNum = rawVerNum ? `-${rawVerNum.replace(/[^a-zA-Z0-9_\-\.]/g, '_').substring(0, 20)}` : ''

    let customVersionId = `${titleSlug}-${mcVersion}${cleanVerNum}`
    let targetVersionDir = path.join(rootDir, 'versions', customVersionId)

    // Ensure multiple versions or additional instances of the same modpack can be installed without collision
    let counter = 2
    while (fs.existsSync(targetVersionDir)) {
      customVersionId = `${titleSlug}-${mcVersion}${cleanVerNum}-${counter++}`
      targetVersionDir = path.join(rootDir, 'versions', customVersionId)
    }

    if (onProgress) {
      onProgress({ task: `Установка загрузчика ${loader} (${mcVersion})...`, current: 28, total: 100 })
    }

    // Step 4: Install base loader & client jar inside versions/<customVersionId>
    const verResult = await installVersion(
      {
        type: loader,
        mcVersion,
        loaderVersion,
        gameDir: rootDir,
        customVersionId,
      },
      (p) => {
        if (onProgress) {
          const mapped = 28 + Math.round(((p.current || 0) / (p.total || 1)) * 12)
          onProgress({ task: `Подготовка ядра: ${p.task}`, current: Math.min(40, mapped), total: 100 })
        }
      }
    )

    if (!verResult?.ok) {
      throw new Error(verResult?.error || 'Не удалось установить базовое ядро Minecraft/Loader для сборки')
    }

    // Step 5: Download files declared in index.files
    const filesToDownload = (indexJson.files || []).filter(
      (f) => f.env?.client !== 'unsupported' && Array.isArray(f.downloads) && f.downloads.length > 0
    )

    const totalMods = filesToDownload.length
    let downloadedCount = 0

    // Concurrently download files in chunks
    const chunkSize = 5
    for (let i = 0; i < filesToDownload.length; i += chunkSize) {
      const chunk = filesToDownload.slice(i, i + chunkSize)
      await Promise.all(
        chunk.map(async (modFile) => {
          const modRelPath = modFile.path
          const modDestPath = getSafeArchiveDestination(targetVersionDir, modRelPath)
          if (!modDestPath) throw new Error(`Недопустимый путь в сборке: ${modRelPath}`)
          const modDestDir = path.dirname(modDestPath)
          if (!fs.existsSync(modDestDir)) {
            fs.mkdirSync(modDestDir, { recursive: true })
          }

          if (fs.existsSync(modDestPath) && modFile.fileSize && fs.statSync(modDestPath).size === modFile.fileSize) {
            downloadedCount++
            return
          }

          let downloaded = false
          for (const downloadUrl of modFile.downloads) {
            try {
              const dRes = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 45000,
              })
              const payload = Buffer.from(dRes.data)
              verifyMrpackFile(payload, modFile.hashes)
              fs.writeFileSync(modDestPath, payload)
              downloaded = true
              break
            } catch (dErr) {
              console.warn(`[Modpack] Failed download from ${downloadUrl}:`, dErr.message)
            }
          }

          if (!downloaded) {
            throw new Error(`Не удалось скачать обязательный файл: ${path.basename(modRelPath)}`)
          }

          downloadedCount++
          if (onProgress) {
            const pct = 40 + Math.round((downloadedCount / Math.max(totalMods, 1)) * 50)
            onProgress({
              task: `Загрузка модов (${downloadedCount}/${totalMods}): ${path.basename(modRelPath)}`,
              current: Math.min(92, pct),
              total: 100,
            })
          }
        })
      )
    }

    // Step 6: Extract overrides & client-overrides
    if (onProgress) {
      onProgress({ task: `Применение настроек и конфигураций сборки...`, current: 93, total: 100 })
    }

    if (resolvedLocalFile) {
      await extractMrpackOverridesFromFile(resolvedLocalFile, targetVersionDir, onProgress)
    } else {
      for (const entry of entries) {
        if (entry.isDirectory) continue
        const relativePath = getMrpackOverrideRelativePath(entry.name)
        if (!relativePath || !relativePath.trim()) continue

        const overrideDest = getSafeArchiveDestination(targetVersionDir, relativePath)
        if (!overrideDest) {
          throw new Error(`Недопустимый путь в overrides: ${relativePath}`)
        }
        const overrideDir = path.dirname(overrideDest)
        if (!fs.existsSync(overrideDir)) {
          fs.mkdirSync(overrideDir, { recursive: true })
        }
        try {
          fs.writeFileSync(overrideDest, entry.data)
        } catch (e) {
          console.warn(`[Modpack] Error extracting override ${relativePath}:`, e.message)
        }
      }
    }

    // Step 7: Write .vibelauncher_modpack.json
    const modpackMeta = {
      isModpack: true,
      id: projectId || projectSlug || customVersionId,
      slug: projectSlug || '',
      title: projectTitle || indexJson.name || customVersionId,
      versionNumber: indexJson.versionId || specificVersion?.versionNumber || '',
      mcVersion: mcVersion,
      loader: loader,
      loaderVersion: loaderVersion,
      icon: projectIcon || null,
      importedFrom: localFilePath ? 'mrpack-file' : 'modrinth',
      installedAt: Date.now(),
    }
    fs.writeFileSync(
      path.join(targetVersionDir, '.vibelauncher_modpack.json'),
      JSON.stringify(modpackMeta, null, 2),
      'utf8'
    )

    // Step 8: Populate .vibelauncher_content.json manifest
    const contentManifest = { installed: {} }
    for (const mf of filesToDownload) {
      const fileName = path.basename(mf.path)
      contentManifest.installed[fileName] = {
        id: '',
        slug: '',
        title: fileName,
        fileName: fileName,
        filePath: path.join(targetVersionDir, mf.path),
        type: mf.path.startsWith('shader') ? 'shader' : mf.path.startsWith('resource') ? 'resourcepack' : 'mod',
        installedAt: Date.now(),
      }
    }
    writeContentManifest(rootDir, customVersionId, contentManifest, true)

    if (onProgress) {
      onProgress({ task: `Сборка «${modpackMeta.title}» готова к запуску!`, current: 100, total: 100 })
    }

    return {
      ok: true,
      versionId: customVersionId,
      label: `${modpackMeta.title} (${mcVersion})`,
      type: 'modpack',
      baseVersion: mcVersion,
      loader: loader,
      modpackMeta: modpackMeta,
    }
  } catch (err) {
    console.error('[Modpack Install Error]:', err)
    return { ok: false, error: err.message }
  }
}

module.exports = {
  searchModrinth,
  getModrinthProjectDetails,
  getModrinthProjectVersions,
  installPerformanceProfile,
  installModFile,
  installModpack,
  getInstalledContent,
  toggleModFile,
  deleteModFile,
  openContentFolder,
  getVersionContentDir,
}
