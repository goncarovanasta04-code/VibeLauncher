const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vibe', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Store / config.json
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store:set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store:delete', key),
  storeGetAll: () => ipcRenderer.invoke('store:getAll'),

  // Versions
  getLocalVersions: (gameDir) => ipcRenderer.invoke('versions:getLocal', gameDir),
  getVersionManifest: () => ipcRenderer.invoke('versions:getManifest'),
  getForgeVersions: (mcVersion) => ipcRenderer.invoke('versions:getForge', mcVersion),
  getFabricVersions: (mcVersion) => ipcRenderer.invoke('versions:getFabric', mcVersion),
  getQuiltVersions: (mcVersion) => ipcRenderer.invoke('versions:getQuilt', mcVersion),
  installVersion: (opts) => ipcRenderer.invoke('versions:install', opts),
  deleteVersion: (versionId, gameDir) => ipcRenderer.invoke('versions:delete', { versionId, gameDir }),
  onInstallProgress: (cb) => ipcRenderer.on('install:progress', (_, data) => cb(data)),
  offInstallProgress: () => ipcRenderer.removeAllListeners('install:progress'),

  // Auth
  loginElyByCredentials: (data) => ipcRenderer.invoke('auth:elyby:credentials', data),
  loginMicrosoft: () => ipcRenderer.invoke('auth:microsoft:login'),

  // Mods / Shaders / Resourcepacks (Modrinth)
  searchMods: (params) => ipcRenderer.invoke('mods:searchModrinth', params),
  getModVersions: (params) => ipcRenderer.invoke('mods:getVersions', params),
  installModFile: (opts) => ipcRenderer.invoke('mods:installFile', opts),
  getInstalledMods: (versionId, gameDir) => ipcRenderer.invoke('mods:getInstalled', { versionId, gameDir }),
  toggleModFile: (filePath) => ipcRenderer.invoke('mods:toggle', filePath),
  deleteModFile: (filePath) => ipcRenderer.invoke('mods:delete', filePath),
  openModFolder: (versionId, type, gameDir) => ipcRenderer.invoke('mods:openFolder', { versionId, type, gameDir }),
  onModInstallProgress: (cb) => ipcRenderer.on('mods:installProgress', (_, data) => cb(data)),
  offModInstallProgress: () => ipcRenderer.removeAllListeners('mods:installProgress'),

  // Game launch
  launchGame: (opts) => ipcRenderer.invoke('game:launch', opts),
  onGameLog: (cb) => ipcRenderer.on('game:log', (_, data) => cb(data)),
  offGameLog: () => ipcRenderer.removeAllListeners('game:log'),
  onGameProgress: (cb) => ipcRenderer.on('game:progress', (_, data) => cb(data)),
  offGameProgress: () => ipcRenderer.removeAllListeners('game:progress'),
  onGameStarted: (cb) => ipcRenderer.on('game:started', (_, data) => cb(data)),
  offGameStarted: () => ipcRenderer.removeAllListeners('game:started'),
  onGameStopped: (cb) => ipcRenderer.on('game:stopped', (_, data) => cb(data)),
  offGameStopped: () => ipcRenderer.removeAllListeners('game:stopped'),
  openGameDir: (gameDir) => ipcRenderer.invoke('folder:openGameDir', gameDir),
  openVersionsDir: (gameDir) => ipcRenderer.invoke('folder:openVersionsDir', gameDir),
  getDefaultGameDir: () => ipcRenderer.invoke('folder:getDefaultGameDir'),

  // Dialogs & Java discovery
  openDir: () => ipcRenderer.invoke('dialog:openDir'),
  openJavaFile: () => ipcRenderer.invoke('dialog:openJavaFile'),
  discoverJava: () => ipcRenderer.invoke('java:discover'),
  probeJava: (javaPath) => ipcRenderer.invoke('java:probe', javaPath),
  getSystemMemory: () => ipcRenderer.invoke('system:getMemory'),
  applyPotatoOptions: (gameDir) => ipcRenderer.invoke('potato:apply', gameDir),

  // Discord RPC
  setDiscordEnabled: (enabled) => ipcRenderer.invoke('discord:setEnabled', enabled),

  // Launcher Updater
  getCurrentVersion: () => ipcRenderer.invoke('updater:getCurrentVersion'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (downloadUrl) => ipcRenderer.invoke('updater:download', downloadUrl),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateProgress: (cb) => ipcRenderer.on('updater:progress', (_, data) => cb(data)),
  offUpdateProgress: () => ipcRenderer.removeAllListeners('updater:progress'),

  // External
  openExternal: (url) => ipcRenderer.send('open:external', url),
})

