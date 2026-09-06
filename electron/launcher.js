const { Client, Authenticator } = require('minecraft-launcher-core')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const { app } = require('electron')
const { generateOfflineUUID } = require('./auth/elyby')
const { resolveJavaRuntime, getRequiredJavaVersion, autoDownloadJava, probeJavaInfo } = require('./java')
const { applyPotatoMinecraftOptions } = require('./potato')
const child_process = require('child_process')
const { execSync } = child_process

function getDefaultGameDir() {
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('appData'), '.minecraft')
  }
  return path.join(process.env.APPDATA || process.env.HOME || '', '.minecraft')
}

function isValidZip(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r')
    const stat = fs.fstatSync(fd)
    if (stat.size < 22) {
      fs.closeSync(fd)
      return false
    }
    const readSize = Math.min(stat.size, 1024)
    const buf = Buffer.alloc(readSize)
    fs.readSync(fd, buf, 0, readSize, stat.size - readSize)
    fs.closeSync(fd)
    return buf.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  } catch (e) {
    return false
  }
}

/**
 * Removes 0-byte or corrupted/truncated files that cause SyntaxError or ZipException
 */
function cleanupCorruptFiles(rootDir) {
  const cleanDir = (dir) => {
    if (!fs.existsSync(dir)) return
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          cleanDir(full)
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(full)
            if (stat.size === 0) {
              console.log('[Launcher] Removing 0-byte corrupt file:', full)
              fs.unlinkSync(full)
            } else if (entry.name.endsWith('.jar') && !isValidZip(full)) {
              console.log('[Launcher] Removing corrupted truncated JAR file:', full)
              fs.unlinkSync(full)
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  cleanDir(path.join(rootDir, 'assets', 'indexes'))
  cleanDir(path.join(rootDir, 'libraries'))
  cleanDir(path.join(rootDir, 'versions'))
  cleanDir(path.join(rootDir, 'cache'))
}

/**
 * Ensures the base vanilla version JSON and client JAR are downloaded and valid
 */
async function ensureBaseMinecraftFiles(rootDir, baseMcVersion, onProgress) {
  const versionDir = path.join(rootDir, 'versions', baseMcVersion)
  const jsonPath = path.join(versionDir, `${baseMcVersion}.json`)
  const jarPath = path.join(versionDir, `${baseMcVersion}.jar`)

  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true })
  }

  let baseJson = null
  if (fs.existsSync(jsonPath) && fs.statSync(jsonPath).size > 500) {
    try {
      baseJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    } catch (e) {}
  }

  // If baseJson not found at <baseMcVersion>.json, check for any alternative .json in version directory
  if (!baseJson && fs.existsSync(versionDir)) {
    try {
      const files = fs.readdirSync(versionDir)
      const foundJson = files.find((f) => f.endsWith('.json'))
      if (foundJson) {
        const altJson = path.join(versionDir, foundJson)
        if (fs.statSync(altJson).size > 500) {
          baseJson = JSON.parse(fs.readFileSync(altJson, 'utf8'))
        }
      }
    } catch (e) {}
  }

  if (!baseJson) {
    try {
      if (onProgress) onProgress({ type: 'status', text: `Получение манифеста для Minecraft ${baseMcVersion}...` })
      const manifestRes = await axios.get(
        'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json',
        { timeout: 15000 }
      )
      const found = manifestRes.data?.versions?.find((v) => v.id === baseMcVersion)
      if (found && found.url) {
        if (onProgress) onProgress({ type: 'status', text: `Загрузка данных версии ${baseMcVersion}...` })
        const versionRes = await axios.get(found.url, { timeout: 20000 })
        baseJson = versionRes.data
        fs.writeFileSync(jsonPath, JSON.stringify(baseJson, null, 2), 'utf8')
      }
    } catch (e) {
      console.warn('[Launcher] Mojang manifest lookup note:', e.message)
    }

    // If version is a custom offline/modded pack with local jar/json, allow it without Mojang manifest
    if (!baseJson) {
      const files = fs.existsSync(versionDir) ? fs.readdirSync(versionDir) : []
      const hasAnyJar = files.some((f) => f.endsWith('.jar'))
      if (!hasAnyJar && !fs.existsSync(jarPath)) {
        throw new Error(`Версия Minecraft ${baseMcVersion} не найдена в манифесте Mojang и локальных файлах`)
      }
    }
  }

  // Ensure asset index JSON exists for vanilla and modded lookups
  if (baseJson?.assetIndex?.url) {
    const indexId = baseJson.assetIndex.id || baseMcVersion
    const indexDir = path.join(rootDir, 'assets', 'indexes')
    fs.mkdirSync(indexDir, { recursive: true })
    const primaryIndexPath = path.join(indexDir, `${indexId}.json`)

    if (!fs.existsSync(primaryIndexPath) || fs.statSync(primaryIndexPath).size < 1000) {
      if (onProgress) onProgress({ type: 'status', text: `Загрузка индекса ресурсов ${indexId}...` })
      try {
        const indexRes = await axios.get(baseJson.assetIndex.url, { timeout: 20000 })
        fs.writeFileSync(primaryIndexPath, JSON.stringify(indexRes.data, null, 2), 'utf8')
      } catch (e) {
        console.warn('[Launcher] Error downloading asset index:', e.message)
      }
    }

    // Ensure aliases exist (e.g. 1.16.5.json) so all components find assets reliably
    if (fs.existsSync(primaryIndexPath)) {
      const content = fs.readFileSync(primaryIndexPath)
      const vIndexPath = path.join(indexDir, `${baseMcVersion}.json`)
      if (!fs.existsSync(vIndexPath) || fs.statSync(vIndexPath).size < 1000) {
        fs.writeFileSync(vIndexPath, content)
      }
    }
  }

  // Ensure base client JAR exists
  if (!fs.existsSync(jarPath) || fs.statSync(jarPath).size < 100000) {
    const clientUrl = baseJson?.downloads?.client?.url
    if (clientUrl) {
      if (onProgress) onProgress({ type: 'status', text: `Загрузка Minecraft ${baseMcVersion}.jar...` })
      const jarRes = await axios.get(clientUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            onProgress({
              type: 'download-status',
              data: {
                name: `${baseMcVersion}.jar`,
                type: 'version-jar',
                current: progressEvent.loaded,
                total: progressEvent.total,
              },
            })
          }
        },
      })
      fs.writeFileSync(jarPath, Buffer.from(jarRes.data))
    }
  }

  return { baseJson, jsonPath, jarPath }
}

/**
 * Ensures Fabric profile JSON is downloaded and properly merged with base version metadata
 */
async function ensureFabricProfile(rootDir, mcVersion, loaderVersion, baseJson) {
  const versionId = `fabric-loader-${loaderVersion}-${mcVersion}`
  const versionDir = path.join(rootDir, 'versions', versionId)
  const jsonPath = path.join(versionDir, `${versionId}.json`)

  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true })
  }

  let fabricData = null
  if (fs.existsSync(jsonPath) && fs.statSync(jsonPath).size > 500) {
    try {
      fabricData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    } catch (e) {}
  }

  if (!fabricData) {
    const url = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`
    const res = await axios.get(url, { timeout: 15000 })
    fabricData = res.data
  }

  // Ensure base Minecraft version metadata is available
  if (!baseJson) {
    const baseJsonPath = path.join(rootDir, 'versions', mcVersion, `${mcVersion}.json`)
    if (fs.existsSync(baseJsonPath)) {
      try {
        baseJson = JSON.parse(fs.readFileSync(baseJsonPath, 'utf8'))
      } catch (e) {}
    }
  }

  // Merge base Minecraft version metadata into Fabric JSON
  if (baseJson) {
    if ((!fabricData.assetIndex || !fabricData.assetIndex.id) && baseJson.assetIndex) {
      fabricData.assetIndex = baseJson.assetIndex
    }
    if (!fabricData.assets && baseJson.assets) {
      fabricData.assets = baseJson.assets
    }
    if (!fabricData.downloads && baseJson.downloads) {
      fabricData.downloads = baseJson.downloads
    }
    if (baseJson.arguments) {
      if (!fabricData.arguments) fabricData.arguments = {}
      if (!fabricData.arguments.game || fabricData.arguments.game.length === 0) {
        fabricData.arguments.game = baseJson.arguments.game || []
      }
      if (!fabricData.arguments.jvm || fabricData.arguments.jvm.length === 0) {
        fabricData.arguments.jvm = baseJson.arguments.jvm || []
      }
    }
    if (!fabricData.minecraftArguments && baseJson.minecraftArguments) {
      fabricData.minecraftArguments = baseJson.minecraftArguments
    }

    // Merge libraries: loader libraries take priority, followed by base vanilla libraries
    const seen = new Set()
    const mergedLibs = []
    const allLibs = [...(fabricData.libraries || []), ...(baseJson.libraries || [])]

    for (const lib of allLibs) {
      const key = lib.name || lib.id || JSON.stringify(lib)
      if (!seen.has(key)) {
        seen.add(key)
        mergedLibs.push(lib)
      }
    }
    fabricData.libraries = mergedLibs
  }

  fs.writeFileSync(jsonPath, JSON.stringify(fabricData, null, 2), 'utf8')

  // Ensure index aliases exist in assets/indexes
  const indexDir = path.join(rootDir, 'assets', 'indexes')
  fs.mkdirSync(indexDir, { recursive: true })
  const assetIndexId = baseJson?.assetIndex?.id || fabricData?.assetIndex?.id || mcVersion
  const srcIndex = path.join(indexDir, `${assetIndexId}.json`)

  if (fs.existsSync(srcIndex)) {
    const content = fs.readFileSync(srcIndex)
    const dstAliases = [
      path.join(indexDir, `${mcVersion}.json`),
      path.join(indexDir, `${versionId}.json`),
      path.join(indexDir, `${assetIndexId}.json`),
    ]
    for (const aliasPath of dstAliases) {
      if (!fs.existsSync(aliasPath) || fs.statSync(aliasPath).size < 1000) {
        fs.writeFileSync(aliasPath, content)
      }
    }
  }

  return versionId
}

/**
 * Downloads authlib-injector for Ely.by skin and online session support
 */
async function ensureAuthlibInjector(rootDir) {
  const injectorPath = path.join(rootDir, 'authlib-injector.jar')
  if (fs.existsSync(injectorPath) && fs.statSync(injectorPath).size > 100000) {
    return injectorPath
  }

  // 1. Check if bundled in launcher assets directory
  try {
    const bundledPaths = [
      path.join(__dirname, '..', 'assets', 'authlib-injector.jar'),
      app && app.isPackaged ? path.join(process.resourcesPath, 'assets', 'authlib-injector.jar') : null,
      path.join(process.cwd(), 'assets', 'authlib-injector.jar'),
    ].filter(Boolean)

    for (const bPath of bundledPaths) {
      if (fs.existsSync(bPath) && fs.statSync(bPath).size > 100000) {
        console.log('[Launcher] Copying bundled authlib-injector from:', bPath)
        fs.copyFileSync(bPath, injectorPath)
        return injectorPath
      }
    }
  } catch (copyErr) {
    console.warn('[Launcher] Note copying bundled authlib-injector:', copyErr.message)
  }

  // 2. Download from official GitHub Releases
  const releaseUrls = [
    'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.8/authlib-injector-1.2.8.jar',
    'https://bmclapi2.bangbang93.com/mirrors/authlib-injector/artifact/latest.jar',
  ]

  for (const url of releaseUrls) {
    try {
      console.log('[Launcher] Downloading authlib-injector from:', url)
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
      if (res.data && res.data.length > 50000) {
        fs.writeFileSync(injectorPath, Buffer.from(res.data))
        console.log('[Launcher] authlib-injector downloaded successfully')
        return injectorPath
      }
    } catch (e) {
      console.warn(`[Launcher] Download failed from ${url}:`, e.message)
    }
  }

  return null
}

/**
 * Auto-detects available Java executable on Windows
 */
function findJavaExecutable(customPath) {
  if (customPath && customPath.trim()) {
    const cp = customPath.trim()
    if (fs.existsSync(cp)) return cp
  }

  // Check JAVA_HOME
  if (process.env.JAVA_HOME) {
    const javaw = path.join(process.env.JAVA_HOME, 'bin', 'javaw.exe')
    const java = path.join(process.env.JAVA_HOME, 'bin', 'java.exe')
    if (fs.existsSync(javaw)) return javaw
    if (fs.existsSync(java)) return java
  }

  // Check common Windows directories
  const searchDirs = [
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Zulu',
    'C:\\Program Files (x86)\\Java',
  ]

  for (const baseDir of searchDirs) {
    if (fs.existsSync(baseDir)) {
      try {
        const subdirs = fs.readdirSync(baseDir)
        for (const sub of subdirs) {
          const javaw = path.join(baseDir, sub, 'bin', 'javaw.exe')
          const java = path.join(baseDir, sub, 'bin', 'java.exe')
          if (fs.existsSync(javaw)) return javaw
          if (fs.existsSync(java)) return java
        }
      } catch (e) {}
    }
  }

  // Default to system PATH
  return 'java'
}

/**
 * Launches Minecraft with live progress and proper error trapping
 */
async function launchMinecraft(opts, onLog, onProgress) {
  const {
    mcVersion = '1.16.5',
    type = 'vanilla',
    loaderVersion = '0.16.10',
    username = 'Player',
    token,
    uuid,
    isOnline = false,
    authType = 'offline',
    gameDir,
    ramMin = 1,
    ramMax = 4,
    javaMode = 'auto',
    javaPath,
    width = 1920,
    height = 1080,
    fullscreen = false,
    forceUpdate = false,
    isolateVersionFolders = true,
  } = opts

  const rootDir = gameDir && gameDir.trim() ? gameDir.trim() : getDefaultGameDir()
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true })
  }

  // Ensure Fuflandiya server is in player's Minecraft servers.dat list
  try {
    const { ensureFuflandiyaServer } = require('./servers')
    await ensureFuflandiyaServer(rootDir)
  } catch (e) {
    console.warn('[Launcher] Error ensuring server in servers.dat:', e.message)
  }

  // Purge any 0-byte corrupt files that cause SyntaxError
  cleanupCorruptFiles(rootDir)

  if (forceUpdate) {
    const vDir = path.join(rootDir, 'versions', mcVersion)
    if (fs.existsSync(vDir)) {
      try {
        fs.rmSync(vDir, { recursive: true, force: true })
      } catch (e) {}
    }
  }

  // Sanitize player username against shell injection vulnerabilities
  const safeUsername = (username || 'Player').replace(/[^a-zA-Z0-9_\-\u0400-\u04FF]/g, '') || 'Player'
  const assignedUUID = uuid || generateOfflineUUID(safeUsername)

  let auth
  let customJvmArgs = []

  if (authType === 'microsoft' && token) {
    // Official Microsoft account
    auth = {
      access_token: token,
      client_token: 'VibeLauncher',
      uuid: assignedUUID,
      name: safeUsername,
      user_properties: '{}',
      meta: {
        type: 'msa',
        xuid: opts.xuid || uuid || '',
        clientId: 'VibeLauncher',
      },
    }
  } else if (authType === 'elyby' && token) {
    // Ely.by account with authlib-injector
    auth = {
      access_token: token,
      client_token: 'VibeLauncher',
      uuid: assignedUUID,
      name: safeUsername,
      user_properties: '{}',
      meta: {
        type: 'legacy',
        xuid: '',
        clientId: 'VibeLauncher',
      },
    }

    try {
      const injectorJar = await ensureAuthlibInjector(rootDir)
      if (injectorJar) {
        customJvmArgs.push(`-javaagent:${injectorJar}=https://authserver.ely.by/api/authlib-injector`)
        customJvmArgs.push('-Dauthlibinjector.side=client')
      }
    } catch (e) {
      console.warn('[Launcher] Could not set up authlib-injector:', e.message)
    }
  } else {
    // Clean offline / pirate account - pure offline auth with standard offline UUID
    auth = {
      access_token: '0',
      client_token: '0',
      uuid: assignedUUID,
      name: safeUsername,
      user_properties: '{}',
      meta: {
        type: 'legacy',
        xuid: '',
        clientId: '',
      },
    }
  }

  // Server auto-connect if configured (sanitized to prevent CLI injection)
  if (opts.serverAutoConnect && opts.serverAutoConnect.trim()) {
    const parts = opts.serverAutoConnect.trim().split(':')
    const host = (parts[0] || '').replace(/[^a-zA-Z0-9.\-_]/g, '')
    const port = (parts[1] || '25565').replace(/[^0-9]/g, '')
    if (host) {
      customJvmArgs.push(`-Dminecraft.server=${host}`, `-Dminecraft.port=${port}`)
    }
  }

  // For clean offline accounts: ensure Minecraft's SocialInteractionsService automatically uses OfflineSocialInteractions,
  // completely unlocking Multiplayer and Server list with zero Microsoft restriction tooltips.
  // Note: authlib-injector handles Ely.by automatically; do NOT override Mojang hosts for Ely.by.
  // Note: never inject dead local ports (e.g. 127.0.0.1:25560) which cause ConnectException hangs.
  if (authType === 'offline') {
    customJvmArgs.push(
      '-Dminecraft.api.auth.host=https://authserver.mojang.com',
      '-Dminecraft.api.account.host=https://api.mojang.com',
      '-Dminecraft.api.session.host=https://sessionserver.mojang.com'
    )
  }

  function extractBaseMinecraftVersion(versionStr, data) {
    if (data?.inheritsFrom) return data.inheritsFrom
    const testStr = `${versionStr} ${data?.id || ''}`
    const match = testStr.match(/(\d+\.\d+(?:\.\d+)?)/)
    if (match) return match[1]
    return versionStr
  }

  let baseMcVersion = mcVersion
  let customVersion = undefined
  let versionJsonOverride = undefined
  let customMinecraftJar = undefined

  // Determine base version if mcVersion is e.g. "fabric-loader-0.16.10-1.16.5"
  if (mcVersion.startsWith('fabric-loader-')) {
    const match = mcVersion.match(/fabric-loader-[^-]+-(.+)/)
    if (match) baseMcVersion = match[1]
  } else if (mcVersion.startsWith('forge-')) {
    const match = mcVersion.match(/forge-([^-]+)/)
    if (match) baseMcVersion = match[1]
  }

  // Check if local version exists in <rootDir>/versions/<mcVersion>
  const versionFolder = path.join(rootDir, 'versions', mcVersion)
  let localJsonPath = path.join(versionFolder, `${mcVersion}.json`)
  if (!fs.existsSync(localJsonPath) && fs.existsSync(versionFolder)) {
    try {
      const vFiles = fs.readdirSync(versionFolder)
      const foundJson = vFiles.find((f) => f.endsWith('.json'))
      if (foundJson) {
        localJsonPath = path.join(versionFolder, foundJson)
      }
    } catch (e) {}
  }

  let localData = null
  if (fs.existsSync(localJsonPath)) {
    try {
      localData = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'))
      baseMcVersion = extractBaseMinecraftVersion(mcVersion, localData)
      customVersion = mcVersion
      versionJsonOverride = localJsonPath
    } catch (e) {}
  } else {
    const extracted = extractBaseMinecraftVersion(mcVersion, null)
    if (extracted !== mcVersion) {
      baseMcVersion = extracted
      customVersion = mcVersion
    }
  }

  // Check for local jar inside version folder
  if (fs.existsSync(versionFolder)) {
    try {
      const directJar = path.join(versionFolder, `${mcVersion}.jar`)
      if (fs.existsSync(directJar) && fs.statSync(directJar).size > 10000) {
        customMinecraftJar = directJar
      } else {
        const vFiles = fs.readdirSync(versionFolder)
        const anyJar = vFiles.find((f) => f.endsWith('.jar'))
        if (anyJar) {
          const jarP = path.join(versionFolder, anyJar)
          if (fs.statSync(jarP).size > 10000) customMinecraftJar = jarP
        }
      }
    } catch (e) {}
  }

  // 1. Ensure base vanilla Minecraft files (.json and .jar) are ready
  let baseMeta = null
  try {
    baseMeta = await ensureBaseMinecraftFiles(rootDir, baseMcVersion, onProgress)
  } catch (err) {
    console.warn('[Launcher] Could not ensure base Minecraft files:', err.message)
  }

  // If custom jar wasn't found in version folder, use base vanilla jar
  if (!customMinecraftJar && baseMcVersion) {
    const baseJar = path.join(rootDir, 'versions', baseMcVersion, `${baseMcVersion}.jar`)
    if (fs.existsSync(baseJar)) {
      customMinecraftJar = baseJar
    }
  }

  // Ensure asset index is also duplicated for customVersion alias so MCLC never fails to find it
  if (customVersion && baseMeta?.baseJson?.assetIndex) {
    try {
      const indexDir = path.join(rootDir, 'assets', 'indexes')
      const indexId = baseMeta.baseJson.assetIndex.id || baseMcVersion
      const primaryIndexPath = path.join(indexDir, `${indexId}.json`)
      if (fs.existsSync(primaryIndexPath)) {
        const customIndexPath = path.join(indexDir, `${customVersion}.json`)
        if (!fs.existsSync(customIndexPath)) {
          fs.copyFileSync(primaryIndexPath, customIndexPath)
        }
      }
    } catch (e) {}
  }

  // 2. Resolve Fabric or custom version profile
  if (type === 'fabric' || mcVersion.startsWith('fabric-loader-')) {
    try {
      let lVer = loaderVersion
      if (!lVer) {
        const match = mcVersion.match(/fabric-loader-([^-]+)-/)
        if (match) lVer = match[1]
      }
      if (!lVer) {
        const metaRes = await axios.get(
          `https://meta.fabricmc.net/v2/versions/loader/${baseMcVersion}`,
          { timeout: 10000 }
        )
        if (metaRes.data && metaRes.data[0]) {
          lVer = metaRes.data[0].loader.version
        }
      }

      const fabricId = await ensureFabricProfile(
        rootDir,
        baseMcVersion,
        lVer || '0.16.10',
        baseMeta?.baseJson
      )
      customVersion = fabricId
      versionJsonOverride = path.join(rootDir, 'versions', fabricId, `${fabricId}.json`)
      if (!customMinecraftJar) {
        customMinecraftJar = path.join(rootDir, 'versions', baseMcVersion, `${baseMcVersion}.jar`)
      }
    } catch (e) {
      console.warn('Fabric profile fetch fallback:', e.message)
    }
  } else if (localData) {
    customVersion = mcVersion
    versionJsonOverride = localJsonPath
    if (!customMinecraftJar && baseMcVersion) {
      customMinecraftJar = path.join(rootDir, 'versions', baseMcVersion, `${baseMcVersion}.jar`)
    }

    // Merge base JSON properties if missing
    if (baseMeta?.baseJson) {
      let updated = false
      if (!localData.assetIndex && baseMeta.baseJson.assetIndex) {
        localData.assetIndex = baseMeta.baseJson.assetIndex
        updated = true
      }
      if (!localData.assets && baseMeta.baseJson.assets) {
        localData.assets = baseMeta.baseJson.assets
        updated = true
      }
      if (!localData.downloads && baseMeta.baseJson.downloads) {
        localData.downloads = baseMeta.baseJson.downloads
        updated = true
      }
      if (baseMeta.baseJson.arguments) {
        if (!localData.arguments) localData.arguments = {}
        if (!localData.arguments.game || localData.arguments.game.length === 0) {
          localData.arguments.game = baseMeta.baseJson.arguments.game || []
          updated = true
        }
        if (!localData.arguments.jvm || localData.arguments.jvm.length === 0) {
          localData.arguments.jvm = baseMeta.baseJson.arguments.jvm || []
          updated = true
        }
      }
      if (!localData.minecraftArguments && baseMeta.baseJson.minecraftArguments) {
        localData.minecraftArguments = baseMeta.baseJson.minecraftArguments
        updated = true
      }
      if (updated) {
        try {
          fs.writeFileSync(localJsonPath, JSON.stringify(localData, null, 2), 'utf8')
        } catch (e) {}
      }
    }
  }

  const isPotato = Boolean(opts.potatoMode)

  // Potato PC optimization: apply ultra-low FPS options to Minecraft options.txt
  if (isPotato) {
    try {
      applyPotatoMinecraftOptions(rootDir)
    } catch (e) {
      console.warn('[Potato] Failed to apply root potato options:', e.message)
    }
  }

  let numRamMax = Math.max(1, Number(ramMax) || 2)
  if (isPotato && numRamMax > 3) {
    numRamMax = 2 // Potato mode caps at 2GB to avoid Windows memory pressure and JVM crashes
  }
  const numRamMin = Math.min(numRamMax, Math.max(1, Number(ramMin) || 1))

  // Pass exact megabytes so MCLC never gets confused by string units or min > max
  let maxMemory = `${numRamMax * 1024}M`
  let minMemory = `${numRamMin * 1024}M`

  // Memory & GC presets: safe flags without -XX:+AlwaysPreTouch (which causes 'Could not create JVM' error)
  const gc = opts.gcPreset || 'aikar'
  if (isPotato || gc === 'potato' || numRamMax <= 2) {
    // Ultra-safe Potato / Low-end PC preset: lightweight G1GC without excessive region sizing or pre-touch
    customJvmArgs.push(
      '-XX:+UseG1GC',
      '-XX:MaxGCPauseMillis=50',
      '-XX:+OptimizeStringConcat'
    )
  } else if (gc === 'aikar') {
    customJvmArgs.push(
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=100',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:G1NewSizePercent=20',
      '-XX:G1ReservePercent=15',
      '-XX:InitiatingHeapOccupancyPercent=25',
      '-XX:SurvivorRatio=32',
      '-XX:+OptimizeStringConcat'
    )
  } else if (gc === 'shenandoah') {
    customJvmArgs.push('-XX:+UseShenandoahGC', '-XX:+UnlockExperimentalVMOptions')
  } else if (gc === 'zgc') {
    customJvmArgs.push('-XX:+UseZGC', '-XX:+UnlockExperimentalVMOptions')
  } else if (gc === 'default') {
    customJvmArgs.push('-XX:+UseG1GC')
  }

  // Resolve accurate, version-compatible Java runtime (Java 8, 17, or 21)
  let resolvedJava = 'java'
  try {
    if (javaMode === 'manual' && javaPath && javaPath.trim() && fs.existsSync(javaPath.trim())) {
      const manualInfo = probeJavaInfo(javaPath.trim())
      if (manualInfo?.is64Bit === false && numRamMax > 1.5) {
        console.warn('[Launcher] Selected manual Java is 32-bit, capping RAM to 1024M to avoid crash')
        maxMemory = '1024M'
        minMemory = '512M'
      }
      resolvedJava = javaPath.trim()
      console.log(`[Launcher] Using user manual Java: ${resolvedJava}`)
    } else {
      resolvedJava = await resolveJavaRuntime(baseMcVersion, null, rootDir, onProgress, localData)
    }
  } catch (jErr) {
    console.warn('[Launcher] Error resolving Java runtime:', jErr.message)
    resolvedJava = findJavaExecutable(javaPath)
  }

  // Fast pre-flight dry run to ensure the selected Java executable can actually allocate heap without crashing
  try {
    execSync(`"${resolvedJava}" -Xms64M -Xmx128M -version 2>&1`, { timeout: 3000 })
  } catch (dryErr) {
    console.warn(`[Launcher] Java dry-run failed with ${resolvedJava}:`, dryErr.message)
    try {
      const reqMajor = getRequiredJavaVersion(baseMcVersion, localData)
      console.log(`[Launcher] Automatically downloading clean portable Java ${reqMajor}...`)
      resolvedJava = await autoDownloadJava(reqMajor, rootDir, onProgress)
    } catch (e) {
      console.warn('[Launcher] Auto-download fallback failed:', e.message)
    }
  }

  // Per-version content isolation: create mods/, shaderpacks/, resourcepacks/ inside version folder
  const effectiveVersionFolder = customVersion || mcVersion || baseMcVersion
  const isolatedGameDir = path.join(rootDir, 'versions', effectiveVersionFolder)

  if (isolateVersionFolders !== false) {
    try {
      fs.mkdirSync(isolatedGameDir, { recursive: true })
      fs.mkdirSync(path.join(isolatedGameDir, 'mods'), { recursive: true })
      fs.mkdirSync(path.join(isolatedGameDir, 'shaderpacks'), { recursive: true })
      fs.mkdirSync(path.join(isolatedGameDir, 'resourcepacks'), { recursive: true })
      const { ensureFuflandiyaServer } = require('./servers')
      await ensureFuflandiyaServer(isolatedGameDir)
    } catch (e) {}
  }

  // Ensure natives directory exists for base version
  const nativesDir = path.join(rootDir, 'natives', baseMcVersion)
  if (fs.existsSync(nativesDir)) {
    try {
      const files = fs.readdirSync(nativesDir)
      if (files.length === 0) {
        fs.rmSync(nativesDir, { recursive: true, force: true })
      }
    } catch (e) {}
  }

  const launchOptions = {
    authorization: auth,
    root: rootDir,
    version: {
      number: baseMcVersion,
      type: 'release',
      custom: customVersion,
    },
    memory: {
      max: maxMemory,
      min: minMemory,
    },
    window: fullscreen
      ? { fullscreen: true }
      : { width: Number(width) || 1920, height: Number(height) || 1080 },
    javaPath: resolvedJava,
    customArgs: customJvmArgs.length > 0 ? customJvmArgs : undefined,
    overrides: {
      detached: false,
      versionJson: versionJsonOverride,
      versionName: customVersion,
      minecraftJar: customMinecraftJar,
      gameDirectory: isolateVersionFolders === true ? isolatedGameDir : undefined,
      cwd: rootDir,
      natives: nativesDir,
      assetRoot: path.join(rootDir, 'assets'),
      assetIndex: baseMeta?.baseJson?.assetIndex?.id || baseMcVersion,
    },
  }

function analyzeCrashLogs(logs, exitCode) {
  const fullText = (logs || []).join('\n')

  if (
    fullText.includes('Could not reserve enough space') ||
    fullText.includes('OutOfMemoryError') ||
    fullText.includes('Out of memory') ||
    fullText.includes('insufficient memory')
  ) {
    return 'Недостаточно оперативной памяти для выделения JVM. Уменьшите или увеличьте объем RAM в настройках лаунчера.'
  }
  if (
    fullText.includes('UnsupportedClassVersionError') ||
    fullText.includes('has been compiled by a more recent version of the Java Runtime')
  ) {
    return 'Несовместимая версия Java. Установленная версия игры требует другую версию Java Runtime.'
  }
  if (
    fullText.includes('Unrecognized VM option') ||
    fullText.includes('Could not create the Java Virtual Machine') ||
    fullText.includes('Unrecognized option')
  ) {
    return 'Неподдерживаемый параметр Java (JVM). Проверьте аргументы JVM или сбросьте пресет памяти.'
  }
  if (
    fullText.includes('Pixel format not accelerated') ||
    fullText.includes('GLFW error 65542') ||
    fullText.includes('WGL: The driver does not appear to support OpenGL')
  ) {
    return 'Ошибка графического видеодрайвера (OpenGL / GLFW). Пожалуйста, обновите драйверы видеокарты.'
  }
  if (
    fullText.includes('Incompatible mod set') ||
    fullText.includes('ModResolutionException') ||
    fullText.includes('Mixin transformation failed') ||
    fullText.includes('MixinApplyError')
  ) {
    return 'Конфликт или несовместимость установленных модов. Проверьте папку mods на ошибки версий.'
  }
  if (
    fullText.includes('NoClassDefFoundError') ||
    fullText.includes('ClassNotFoundException')
  ) {
    return 'Повреждены или отсутствуют файлы клиента игры. Включите чекбокс «Обновить клиент» и запустите снова.'
  }
  if (
    fullText.includes('java.nio.file.FileSystemException') ||
    fullText.includes('AccessDeniedException')
  ) {
    return 'Ошибка доступа к файлам игры. Закройте другие запущенные копии Minecraft или антивирус, блокирующий папку.'
  }

  // Exact phrase requested by the user for unknown errors:
  return 'Произошла неизвестная ошибка, о которой мы не знаем :( Попробуйте исправить сами.'
}

  return new Promise((resolve) => {
    const launcher = new Client()
    const recentLogs = []

    const addLog = (text) => {
      if (typeof text !== 'string') text = String(text || '')
      recentLogs.push(text)
      if (recentLogs.length > 100) recentLogs.shift()
    }

    launcher.on('progress', (p) => {
      if (onProgress) onProgress({ type: 'progress', data: p })
    })

    launcher.on('download-status', (d) => {
      if (onProgress) onProgress({ type: 'download-status', data: d })
    })

    launcher.on('debug', (d) => {
      addLog(`[DEBUG] ${d}`)
      if (onLog) onLog({ type: 'debug', text: d })
      if (typeof d === 'string' && d.includes('[MCLC]: Downloading')) {
        if (onProgress) onProgress({ type: 'status', text: d.replace('[MCLC]: ', '') })
      }
    })

    launcher.on('data', (e) => {
      addLog(`[OUT] ${e}`)
      if (onLog) onLog({ type: 'out', text: e })
    })

    launcher.on('close', (code) => {
      launcher.removeAllListeners()
      if (code === 0) {
        resolve({ ok: true, code: 0 })
      } else {
        const errorReason = analyzeCrashLogs(recentLogs, code)
        resolve({
          ok: false,
          code,
          error: errorReason,
          logs: recentLogs.slice(-60).join('\n'),
        })
      }
    })

    launcher.on('error', (err) => {
      launcher.removeAllListeners()
      const errorReason = analyzeCrashLogs([...recentLogs, err?.message || String(err)])
      resolve({
        ok: false,
        code: -1,
        error: errorReason,
        logs: recentLogs.slice(-60).join('\n') || err?.stack || err?.message || String(err),
      })
    })

    try {
      launcher.launch(launchOptions).catch((err) => {
        launcher.removeAllListeners()
        const errorReason = analyzeCrashLogs([...recentLogs, err?.message || String(err)])
        resolve({
          ok: false,
          code: -1,
          error: errorReason,
          logs: recentLogs.slice(-60).join('\n') || err?.stack || err?.message || String(err),
        })
      })
    } catch (e) {
      launcher.removeAllListeners()
      const errorReason = analyzeCrashLogs([...recentLogs, e?.message || String(e)])
      resolve({
        ok: false,
        code: -1,
        error: errorReason,
        logs: recentLogs.slice(-60).join('\n') || e?.stack || e?.message || String(e),
      })
    }
  })
}

module.exports = { launchMinecraft, getDefaultGameDir }


