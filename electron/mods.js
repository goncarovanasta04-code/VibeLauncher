const axios = require('axios')
const path = require('path')
const fs = require('fs')
const { app, shell } = require('electron')

function getDefaultGameDir() {
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('appData'), '.minecraft')
  }
  return path.join(process.env.APPDATA || process.env.HOME || '', '.minecraft')
}

function getVersionContentDir(rootDir, versionId, contentType) {
  const baseDir = versionId ? path.join(rootDir, 'versions', versionId) : rootDir
  let sub = 'mods'
  if (contentType === 'resourcepack' || contentType === 'resourcepacks') sub = 'resourcepacks'
  else if (contentType === 'shader' || contentType === 'shaderpacks') sub = 'shaderpacks'

  const targetDir = path.join(baseDir, sub)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  return targetDir
}

function getManifestPath(rootDir, versionId) {
  const baseDir = versionId ? path.join(rootDir, 'versions', versionId) : rootDir
  return path.join(baseDir, '.vibelauncher_content.json')
}

function readContentManifest(rootDir, versionId) {
  const p = getManifestPath(rootDir, versionId)
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch (e) {}
  }
  return { installed: {} }
}

function writeContentManifest(rootDir, versionId, data) {
  const p = getManifestPath(rootDir, versionId)
  try {
    const dir = path.dirname(p)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.warn('[Mods] Could not write content manifest:', e.message)
  }
}

/**
 * Search Modrinth for mods, shaders, and resourcepacks
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
    const facets = []

    // Project type facet
    const pType =
      type === 'shader' ? 'shader' : type === 'resourcepack' ? 'resourcepack' : 'mod'
    facets.push([`project_type:${pType}`])

    // Version filter
    if (mcVersion && mcVersion.trim()) {
      facets.push([`versions:${mcVersion.trim()}`])
    }

    // Loader filter (ONLY for mods; shaders and resourcepacks do not use loader category filters)
    if (
      pType === 'mod' &&
      loader &&
      loader.trim() &&
      loader !== 'all' &&
      loader !== 'vanilla'
    ) {
      facets.push([`categories:${loader.toLowerCase().trim()}`])
    }

    const params = {
      query: query.trim(),
      facets: JSON.stringify(facets),
      index: 'downloads',
      limit: limit,
      offset: offset,
    }

    const res = await axios.get('https://api.modrinth.com/v2/search', {
      params,
      headers: { 'User-Agent': 'VibeLauncher/1.0 (contact@vibelauncher.app)' },
      timeout: 15000,
    })

    const hits = res.data?.hits || []
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

    return { ok: true, total: res.data?.total_hits || 0, hits: results }
  } catch (err) {
    console.error('[Modrinth Search Error]:', err.message)
    return { ok: false, error: err.message, hits: [] }
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

    let res = await axios.get(`https://api.modrinth.com/v2/project/${slugOrId}/version`, {
      params,
      headers: { 'User-Agent': 'VibeLauncher/1.0' },
      timeout: 15000,
    })

    // If no versions found with strict game_version filter, fallback to all versions of the project
    if ((!res.data || res.data.length === 0) && mcVersion) {
      delete params.game_versions
      res = await axios.get(`https://api.modrinth.com/v2/project/${slugOrId}/version`, {
        params,
        headers: { 'User-Agent': 'VibeLauncher/1.0' },
        timeout: 15000,
      })
    }

    const versions = (res.data || []).map((v) => {
      const primaryFile = v.files?.find((f) => f.primary) || v.files?.[0]
      return {
        id: v.id,
        name: v.name,
        versionNumber: v.version_number,
        gameVersions: v.game_versions,
        loaders: v.loaders,
        datePublished: v.date_published,
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

/**
 * Installs (downloads) a mod/shader/resourcepack file into the version folder
 */
async function installModFile(
  { fileUrl, fileName, versionId, type = 'mod', projectId, projectSlug, projectTitle, gameDir },
  onProgress
) {
  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
  const targetDir = getVersionContentDir(rootDir, versionId, type)
  const targetPath = path.join(targetDir, fileName)

  try {
    if (onProgress) onProgress({ task: `Загрузка ${fileName}...`, current: 0, total: 100 })

    const res = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      onDownloadProgress: (evt) => {
        if (onProgress && evt.total) {
          const pct = Math.round((evt.loaded / evt.total) * 100)
          onProgress({ task: `Загрузка ${fileName}`, current: pct, total: 100 })
        }
      },
    })

    fs.writeFileSync(targetPath, Buffer.from(res.data))

    // Record installation in .vibelauncher_content.json manifest
    const manifest = readContentManifest(rootDir, versionId)
    const key = projectId || projectSlug || fileName
    manifest.installed[key] = {
      id: projectId || '',
      slug: projectSlug || '',
      title: projectTitle || fileName,
      fileName: fileName,
      filePath: targetPath,
      type: type,
      installedAt: Date.now(),
    }
    writeContentManifest(rootDir, versionId, manifest)

    if (onProgress) onProgress({ task: `Установлено: ${fileName}`, current: 100, total: 100 })
    return { ok: true, filePath: targetPath, fileName, projectId, projectSlug }
  } catch (err) {
    console.error('[Mod Install Error]:', err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Scans installed mods, shaders, and resourcepacks in the version directory
 */
function getInstalledContent({ versionId, gameDir }) {
  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
  const baseDir = versionId ? path.join(rootDir, 'versions', versionId) : rootDir

  const categories = [
    { key: 'mods', type: 'mod' },
    { key: 'shaderpacks', type: 'shader' },
    { key: 'resourcepacks', type: 'resourcepack' },
  ]

  const items = []
  const manifest = readContentManifest(rootDir, versionId)
  const installedProjectIds = new Set()
  const installedSlugs = new Set()
  const installedFileNames = new Set()

  for (const info of Object.values(manifest.installed || {})) {
    if (info.id) installedProjectIds.add(info.id)
    if (info.slug) installedSlugs.add(info.slug.toLowerCase())
    if (info.fileName) installedFileNames.add(info.fileName.toLowerCase())
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

/**
 * Enables or disables a mod file (.jar <-> .jar.disabled)
 */
function toggleModFile(filePath) {
  try {
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
function deleteModFile(filePath, versionId, gameDir) {
  try {
    if (fs.existsSync(filePath)) {
      const fileName = path.basename(filePath)
      fs.unlinkSync(filePath)

      // Clean from manifest if versionId is provided
      if (versionId) {
        const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
        const manifest = readContentManifest(rootDir, versionId)
        for (const [key, val] of Object.entries(manifest.installed || {})) {
          if (val.fileName === fileName || val.filePath === filePath) {
            delete manifest.installed[key]
          }
        }
        writeContentManifest(rootDir, versionId, manifest)
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
function openContentFolder({ versionId, type = 'mods', gameDir }) {
  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
  const dir = getVersionContentDir(rootDir, versionId, type)
  shell.openPath(dir)
  return true
}

module.exports = {
  searchModrinth,
  getModrinthProjectVersions,
  installModFile,
  getInstalledContent,
  toggleModFile,
  deleteModFile,
  openContentFolder,
  getVersionContentDir,
}
