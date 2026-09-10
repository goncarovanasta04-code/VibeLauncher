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

function getSafeVersionId(versionId) {
  if (!versionId || typeof versionId !== 'string') return null
  const cleaned = path.basename(versionId.trim())
  if (!cleaned || cleaned === '.' || cleaned === '..') return null
  return cleaned
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
    const facets = []

    // Project type facet: mod, modpack, resourcepack, shader, datapack
    let pType = 'mod'
    if (type === 'shader') pType = 'shader'
    else if (type === 'resourcepack') pType = 'resourcepack'
    else if (type === 'modpack') pType = 'modpack'
    else if (type === 'datapack') pType = 'datapack'
    facets.push([`project_type:${pType}`])

    // Version filter (apply if provided and not searching modpacks that might have their own bundle versioning)
    if (mcVersion && mcVersion.trim()) {
      facets.push([`versions:${mcVersion.trim()}`])
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
  const baseDir = (versionId && isolateVersionFolders !== false)
    ? path.join(rootDir, 'versions', versionId)
    : rootDir

  const categories = [
    { key: 'mods', type: 'mod' },
    { key: 'shaderpacks', type: 'shader' },
    { key: 'resourcepacks', type: 'resourcepack' },
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

module.exports = {
  searchModrinth,
  getModrinthProjectDetails,
  getModrinthProjectVersions,
  installModFile,
  getInstalledContent,
  toggleModFile,
  deleteModFile,
  openContentFolder,
  getVersionContentDir,
}
