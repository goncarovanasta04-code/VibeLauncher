const { app, BrowserWindow, ipcMain, shell, dialog, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const { launchMinecraft } = require('./launcher')
const { applyPotatoMinecraftOptions } = require('./potato')
const {
  getVersionManifest,
  getForgeVersions,
  getFabricVersions,
  getQuiltVersions,
  installVersion,
  getLocalVersions,
  deleteVersion,
  getDefaultGameDir,
} = require('./versions')
const { loginElyByCredentials } = require('./auth/elyby')
const { loginMicrosoft } = require('./auth/microsoft')
const {
  searchModrinth,
  getModrinthProjectDetails,
  getModrinthProjectVersions,
  installModFile,
  installModpack,
  getInstalledContent,
  toggleModFile,
  deleteModFile,
  openContentFolder,
} = require('./mods')
const {
  connectDiscord,
  setLauncherActivity,
  setPlayingActivity,
  stopPlayingActivity,
  setDiscordEnabled,
  destroyDiscordRPC,
} = require('./discord')
const {
  getCurrentVersion,
  checkForUpdates,
  downloadUpdate,
  installDownloadedUpdate,
} = require('./updater')

// Hardware acceleration & GPU rendering performance optimizations
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

// Prevent unhandled crashes from showing ugly system error dialogs
process.on('uncaughtException', (err) => {
  console.error('[Main process uncaughtException]:', err?.message || err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Main process unhandledRejection]:', reason)
})

const { ensureFuflandiyaServer } = require('./servers')
const { discoverLocalJavaInstallations, probeJavaVersion } = require('./java')

// Set App User Model ID so Windows associates the taskbar item and shortcuts with our custom icon
app.setAppUserModelId('com.vibelauncher.app')

const store = new Store({ name: 'config' })
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow

function getAppIcon() {
  const icoPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.ico')
    : path.join(__dirname, '..', 'assets', 'icon.ico')
  if (fs.existsSync(icoPath)) return icoPath

  const pngPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.png')
    : path.join(__dirname, '..', 'assets', 'icon.png')
  if (fs.existsSync(pngPath)) return pngPath

  return path.join(__dirname, '..', 'assets', 'icon.png')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 620,
    minWidth: 840,
    minHeight: 520,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: getAppIcon(),
    show: false,
    resizable: true,
  })

  // Ensure Fuflandiya server is in player's Minecraft servers.dat list
  try {
    const defaultDir = getDefaultGameDir()
    ensureFuflandiyaServer(defaultDir)
    const customDir = store.get('settings.gameDir')
    if (customDir && customDir !== defaultDir) {
      ensureFuflandiyaServer(customDir)
    }
  } catch (e) {
    console.warn('[Main] ensureFuflandiyaServer error:', e.message)
  }

  // Prevent untrusted window popups and restrict navigation to external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url)
      }
    } catch (e) {}
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (isDev && url.startsWith('http://localhost:5173')) return
    if (url.startsWith('file://')) return
    e.preventDefault()
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url)
      }
    } catch (err) {}
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Initialize Discord Rich Presence if enabled
  const currentSettings = store.get('settings') || {}
  if (currentSettings.discordRpc !== false) {
    connectDiscord()
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  destroyDiscordRPC()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  destroyDiscordRPC()
})

// ─── Window controls ───────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())

// ─── System / Display Resolution ──────────────────────────────────────────────
ipcMain.handle('system:getScreenResolution', () => {
  try {
    const primary = screen.getPrimaryDisplay()
    if (primary && primary.bounds) {
      return {
        width: primary.bounds.width,
        height: primary.bounds.height,
        scaleFactor: primary.scaleFactor || 1,
      }
    }
  } catch (e) {}
  return { width: 1920, height: 1080, scaleFactor: 1 }
})

// ─── electron-store IPC (Protected against prototype pollution) ─────────────────
ipcMain.handle('store:get', (_, key) => {
  if (typeof key !== 'string' || key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) return undefined
  return store.get(key)
})
ipcMain.handle('store:set', (_, key, val) => {
  if (typeof key !== 'string' || key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) return false
  store.set(key, val)
  return true
})
ipcMain.handle('store:delete', (_, key) => {
  if (typeof key !== 'string' || key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) return false
  store.delete(key)
  return true
})
ipcMain.handle('store:getAll', () => store.store)

// ─── Versions ──────────────────────────────────────────────────────────────────
ipcMain.handle('versions:getLocal', async (_, customDir) => {
  const settings = store.get('settings') || {}
  const targetDir = customDir || settings.gameDir
  return getLocalVersions(targetDir)
})

ipcMain.handle('versions:getManifest', async () => {
  return await getVersionManifest()
})

ipcMain.handle('versions:getForge', async (_, mcVersion) => {
  return await getForgeVersions(mcVersion)
})

ipcMain.handle('versions:getFabric', async (_, mcVersion) => {
  return await getFabricVersions(mcVersion)
})

ipcMain.handle('versions:getQuilt', async (_, mcVersion) => {
  return await getQuiltVersions(mcVersion)
})

ipcMain.handle('versions:install', async (_, opts) => {
  const settings = store.get('settings') || {}
  return await installVersion(
    { ...opts, gameDir: opts.gameDir || settings.gameDir },
    (progress) => {
      mainWindow?.webContents.send('install:progress', progress)
    }
  )
})

ipcMain.handle('versions:delete', async (_, { versionId, gameDir }) => {
  const settings = store.get('settings') || {}
  return deleteVersion(versionId, gameDir || settings.gameDir)
})

// ─── Auth ─────────────────────────────────────────────────────────────────────
ipcMain.handle('auth:elyby:credentials', async (_, { username, password }) => {
  return await loginElyByCredentials(username, password)
})

ipcMain.handle('auth:microsoft:login', async () => {
  return await loginMicrosoft(mainWindow)
})

// ─── Mods / Shaders / Resourcepacks (Modrinth) ─────────────────────────────────
ipcMain.handle('mods:searchModrinth', async (_, params) => {
  return await searchModrinth(params || {})
})

ipcMain.handle('mods:getDetails', async (_, slugOrId) => {
  return await getModrinthProjectDetails(slugOrId)
})

ipcMain.handle('mods:getVersions', async (_, params) => {
  return await getModrinthProjectVersions(params || {})
})

ipcMain.handle('mods:installFile', async (_, opts) => {
  const settings = store.get('settings') || {}
  const isolateVersionFolders =
    opts.isolateVersionFolders !== undefined
      ? opts.isolateVersionFolders
      : settings.isolateVersionFolders !== undefined
      ? settings.isolateVersionFolders
      : true
  return await installModFile(
    {
      ...opts,
      gameDir: opts.gameDir || settings.gameDir,
      isolateVersionFolders,
    },
    (progress) => {
      mainWindow?.webContents.send('mods:installProgress', progress)
    }
  )
})

ipcMain.handle('mods:installModpack', async (_, opts) => {
  const settings = store.get('settings') || {}
  return await installModpack(
    {
      ...opts,
      gameDir: opts.gameDir || settings.gameDir,
    },
    (progress) => {
      mainWindow?.webContents.send('mods:installProgress', progress)
      mainWindow?.webContents.send('install:progress', progress)
    }
  )
})

ipcMain.handle('mods:getInstalled', async (_, { versionId, gameDir, isolateVersionFolders } = {}) => {
  const settings = store.get('settings') || {}
  const iso =
    isolateVersionFolders !== undefined
      ? isolateVersionFolders
      : settings.isolateVersionFolders !== undefined
      ? settings.isolateVersionFolders
      : true
  return getInstalledContent({
    versionId,
    gameDir: gameDir || settings.gameDir,
    isolateVersionFolders: iso,
  })
})

ipcMain.handle('mods:toggle', async (_, opts) => {
  const filePath = typeof opts === 'string' ? opts : opts?.filePath
  const settings = store.get('settings') || {}
  return toggleModFile(filePath, settings.gameDir)
})

ipcMain.handle('mods:delete', async (_, opts) => {
  const filePath = typeof opts === 'string' ? opts : opts?.filePath
  const versionId = typeof opts === 'object' ? opts?.versionId : undefined
  const settings = store.get('settings') || {}
  const iso =
    opts?.isolateVersionFolders !== undefined
      ? opts.isolateVersionFolders
      : settings.isolateVersionFolders !== undefined
      ? settings.isolateVersionFolders
      : true
  return deleteModFile(filePath, versionId, settings.gameDir, iso)
})

ipcMain.handle('mods:openFolder', async (_, { versionId, type, gameDir, isolateVersionFolders } = {}) => {
  const settings = store.get('settings') || {}
  const iso =
    isolateVersionFolders !== undefined
      ? isolateVersionFolders
      : settings.isolateVersionFolders !== undefined
      ? settings.isolateVersionFolders
      : true
  return openContentFolder({
    versionId,
    type,
    gameDir: gameDir || settings.gameDir,
    isolateVersionFolders: iso,
  })
})

// ─── Launch Minecraft ──────────────────────────────────────────────────────────
ipcMain.handle('game:launch', async (_, opts) => {
  const settings = store.get('settings') || {}
  const effectiveGameDir = opts.gameDir || settings.gameDir || getDefaultGameDir()
  const isolateVersionFolders =
    opts.isolateVersionFolders !== undefined
      ? opts.isolateVersionFolders
      : settings.isolateVersionFolders !== undefined
      ? settings.isolateVersionFolders
      : false
  const ramMax = opts.ramMax || (settings.ram ? Math.max(1, Math.round(settings.ram / 1024)) : (settings.ramMax || 4))
  const ramMin = opts.ramMin || settings.ramMin || (settings.ram ? Math.max(1, Math.floor(ramMax / 2)) : 1)
  const javaMode = opts.javaMode || settings.javaMode || 'auto'
  const javaPath = opts.javaPath !== undefined ? opts.javaPath : (settings.javaPath || '')
  const fullscreen = opts.fullscreen !== undefined ? opts.fullscreen : (settings.fullscreen !== undefined ? settings.fullscreen : false)
  const width = opts.width || settings.width || 1920
  const height = opts.height || settings.height || 1080
  const gcPreset = opts.gcPreset || settings.gcPreset || 'aikar'
  const serverAutoConnect = opts.serverAutoConnect || settings.serverAutoConnect || ''
  const potatoMode = opts.potatoMode !== undefined ? opts.potatoMode : Boolean(settings.potatoMode)
  let hasHidden = false

  const hideLauncherWhenGameReady = () => {
    if (hasHidden || !isGameProcessRunning) return
    hasHidden = true
    hideTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && isGameProcessRunning) {
        try {
          mainWindow.webContents.send('game:started')
          mainWindow.hide()
        } catch (e) {
          console.warn('[Main] Window hide error:', e.message)
        }
      }
    }, 600)
  }

  // Set Discord RPC status to Playing
  setPlayingActivity({
    mcVersion: opts.mcVersion || '1.16.5',
    type: opts.type || 'vanilla',
    username: opts.username || 'Player',
  })

  let isGameProcessRunning = true
  let hideTimeout = null
  const sessionStartTime = Date.now()

  try {
    const result = await launchMinecraft(
      {
        ...opts,
        gameDir: effectiveGameDir,
        isolateVersionFolders,
        ramMin,
        ramMax,
        javaMode,
        javaPath,
        fullscreen,
        width,
        height,
        gcPreset,
        serverAutoConnect,
        potatoMode,
      },
      (data) => {
        mainWindow?.webContents.send('game:log', data)
        // Hide launcher as soon as game logs start coming in
        if (!hasHidden && isGameProcessRunning && mainWindow && !mainWindow.isDestroyed()) {
          const text = typeof data?.text === 'string' ? data.text : (typeof data === 'string' ? data : '')
          if (text && text.trim().length > 0) {
            hideLauncherWhenGameReady()
          }
        }
      },
      (progress) => {
        mainWindow?.webContents.send('game:progress', progress)
        if (progress?.type === 'game_started') {
          hideLauncherWhenGameReady()
        }
      }
    )

    return result
  } catch (err) {
    console.error('[Main] game:launch unhandled error:', err)
    return {
      ok: false,
      code: -1,
      error: err?.message || 'Ошибка запуска игры',
      logs: err?.stack || String(err),
    }
  } finally {
    isGameProcessRunning = false
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }

    // Record session playtime in stats
    try {
      const sessionDurationMs = Math.max(0, Date.now() - sessionStartTime)
      const currentTotal = store.get('stats.totalPlaytimeMs') || 0
      store.set('stats.totalPlaytimeMs', currentTotal + sessionDurationMs)
      store.set('stats.lastSessionDurationMs', sessionDurationMs)
      store.set('stats.lastPlayedTimestamp', Date.now())
    } catch (statsErr) {
      console.warn('[Main] Playtime save error:', statsErr.message)
    }

    // Revert Discord RPC status back to launcher
    stopPlayingActivity()

    // Safely restore and show launcher window without DWM freeze
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('game:stopped')
      } catch (winErr) {
        console.warn('[Main] Window restore error:', winErr.message)
      }
    }
  }
})

ipcMain.handle('playtime:get', async () => {
  try {
    const totalPlaytimeMs = store.get('stats.totalPlaytimeMs') || 0
    const lastSessionDurationMs = store.get('stats.lastSessionDurationMs') || 0
    const lastPlayedTimestamp = store.get('stats.lastPlayedTimestamp') || null
    return { totalPlaytimeMs, lastSessionDurationMs, lastPlayedTimestamp }
  } catch (e) {
    return { totalPlaytimeMs: 0, lastSessionDurationMs: 0, lastPlayedTimestamp: null }
  }
})

ipcMain.handle('discord:setEnabled', async (_, enabled) => {
  return setDiscordEnabled(enabled)
})

// ─── Open game directories in Explorer ────────────────────────────────────────
ipcMain.handle('folder:openGameDir', async (_, customDir) => {
  const settings = store.get('settings') || {}
  const gameDir = customDir || settings.gameDir || getDefaultGameDir()
  if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true })
  shell.openPath(gameDir)
  return true
})

ipcMain.handle('folder:openVersionsDir', async (_, customDir) => {
  const settings = store.get('settings') || {}
  const gameDir = customDir || settings.gameDir || getDefaultGameDir()
  const versionsDir = path.join(gameDir, 'versions')
  if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true })
  shell.openPath(versionsDir)
  return true
})

ipcMain.handle('folder:openScreenshots', async (_, customDir) => {
  const settings = store.get('settings') || {}
  const gameDir = customDir || settings.gameDir || getDefaultGameDir()
  const screenshotsDir = path.join(gameDir, 'screenshots')
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true })
  shell.openPath(screenshotsDir)
  return true
})

ipcMain.handle('folder:openSaves', async (_, customDir) => {
  const settings = store.get('settings') || {}
  const gameDir = customDir || settings.gameDir || getDefaultGameDir()
  const savesDir = path.join(gameDir, 'saves')
  if (!fs.existsSync(savesDir)) fs.mkdirSync(savesDir, { recursive: true })
  shell.openPath(savesDir)
  return true
})

ipcMain.handle('folder:getDefaultGameDir', async () => {
  return getDefaultGameDir()
})

// ─── Potato PC Settings Applicator ───────────────────────────────────────────
ipcMain.handle('potato:apply', async (_, customGameDir) => {
  try {
    const settings = store.get('settings') || {}
    const gameDir = customGameDir || settings.gameDir || getDefaultGameDir()
    return applyPotatoMinecraftOptions(gameDir)
  } catch (e) {
    console.warn('[Main] Failed to apply potato settings:', e.message)
    return { ok: false, error: e.message }
  }
})

// ─── File & Dir dialogs ────────────────────────────────────────────────────────
ipcMain.handle('dialog:openDir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openJavaFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите java.exe или javaw.exe',
    filters: [{ name: 'Java Executable', extensions: ['exe'] }],
    properties: ['openFile'],
  })
  return result.canceled ? null : result.filePaths[0]
})

// ─── Java Detection & Verification ──────────────────────────────────────────
ipcMain.handle('java:discover', async () => {
  try {
    return discoverLocalJavaInstallations()
  } catch (e) {
    console.warn('[Main] Failed to discover Java installations:', e.message)
    return []
  }
})

ipcMain.handle('java:probe', async (_, customPath) => {
  try {
    if (!customPath || typeof customPath !== 'string' || !customPath.trim()) {
      return { valid: false, major: null }
    }
    const major = probeJavaVersion(customPath.trim())
    return { valid: !!major, major, path: customPath.trim() }
  } catch (e) {
    return { valid: false, major: null, error: e.message }
  }
})

// ─── System Memory Info ───────────────────────────────────────────────────────
ipcMain.handle('system:getMemory', async () => {
  try {
    const os = require('os')
    const totalBytes = os.totalmem()
    const totalGb = Math.round(totalBytes / (1024 * 1024 * 1024))
    const freeBytes = os.freemem()
    const freeGb = Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10
    return { totalGb, freeGb }
  } catch (e) {
    return { totalGb: 16, freeGb: 8 }
  }
})

// ─── Launcher Updater ────────────────────────────────────────────────────────
ipcMain.handle('updater:getCurrentVersion', () => getCurrentVersion())
ipcMain.handle('updater:check', async () => {
  return await checkForUpdates()
})
ipcMain.handle('updater:download', async (_, downloadUrl) => {
  return await downloadUpdate(downloadUrl, (progress) => {
    mainWindow?.webContents.send('updater:progress', progress)
  })
})
ipcMain.handle('updater:install', async () => {
  return installDownloadedUpdate()
})

// ─── Open external link (strictly sanitized against arbitrary code execution) ───
ipcMain.on('open:external', (_, url) => {
  if (typeof url !== 'string') return
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      shell.openExternal(url)
    } else {
      console.warn('[Security] Blocked unauthorized protocol in openExternal:', parsed.protocol)
    }
  } catch (e) {
    console.warn('[Security] Invalid URL rejected:', url)
  }
})

