const DiscordRPC = require('discord-rpc')

const CLIENT_ID = '1546070473253847050'

let rpcClient = null
let isConnected = false
let isConnecting = false
let isEnabled = true
let retryTimer = null
let launcherStartTime = Math.floor(Date.now() / 1000)
let currentPlayingInfo = null

// Register RPC application
try {
  DiscordRPC.register(CLIENT_ID)
} catch (e) {
  // Silent catch
}

function scheduleReconnect() {
  if (retryTimer || !isEnabled) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (!isConnected && isEnabled) {
      connectDiscord()
    }
  }, 15000)
}

async function connectDiscord() {
  if (!isEnabled || isConnected || isConnecting) return

  isConnecting = true

  try {
    if (rpcClient) {
      try {
        await rpcClient.destroy()
      } catch (e) {}
      rpcClient = null
    }

    const client = new DiscordRPC.Client({ transport: 'ipc' })

    client.on('ready', () => {
      isConnected = true
      isConnecting = false
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      console.log('[Discord RPC] Connected successfully as', client.user?.username || 'User')
      if (currentPlayingInfo) {
        setPlayingActivity(currentPlayingInfo)
      } else {
        setLauncherActivity()
      }
    })

    client.on('disconnected', () => {
      isConnected = false
      isConnecting = false
      scheduleReconnect()
    })

    client.on('error', () => {
      isConnected = false
      isConnecting = false
    })

    rpcClient = client
    await client.login({ clientId: CLIENT_ID })
  } catch (err) {
    isConnected = false
    isConnecting = false
    scheduleReconnect()
  }
}

async function setLauncherActivity() {
  if (!isEnabled) return
  if (!isConnected || !rpcClient) {
    connectDiscord()
    return
  }

  try {
    await rpcClient.setActivity({
      details: 'В главном меню',
      state: 'Выбирает сборку игры',
      startTimestamp: launcherStartTime,
      largeImageKey: 'icon',
      largeImageText: 'VibeLauncher Next-Gen',
      buttons: [
        { label: 'Discord Сервер', url: 'https://discord.gg/fAS92DwB8R' },
      ],
      instance: false,
    })
  } catch (err) {
    // Retry on next frame or state change
  }
}

async function setPlayingActivity({ mcVersion = '1.16.5', type = 'vanilla', username = 'Player' }) {
  currentPlayingInfo = { mcVersion, type, username }
  if (!isEnabled) return
  if (!isConnected || !rpcClient) {
    connectDiscord()
    return
  }

  const verType = type.toUpperCase()
  const now = Math.floor(Date.now() / 1000)

  try {
    await rpcClient.setActivity({
      details: `В игре Minecraft ${mcVersion}`,
      state: `Игрок: ${username} (${verType})`,
      startTimestamp: now,
      largeImageKey: 'icon',
      largeImageText: `VibeLauncher • Minecraft ${mcVersion}`,
      smallImageKey: 'icon',
      smallImageText: `Minecraft ${mcVersion}`,
      buttons: [
        { label: 'Discord Сервер', url: 'https://discord.gg/fAS92DwB8R' },
      ],
      instance: false,
    })
  } catch (err) {
    // Ignore transient errors
  }
}

async function stopPlayingActivity() {
  currentPlayingInfo = null
  if (isEnabled && isConnected) {
    await setLauncherActivity()
  }
}

async function setDiscordEnabled(enabled) {
  isEnabled = Boolean(enabled)
  if (!isEnabled) {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    if (rpcClient && isConnected) {
      try {
        await rpcClient.clearActivity()
      } catch (e) {}
    }
  } else {
    if (!isConnected) {
      connectDiscord()
    } else {
      if (currentPlayingInfo) {
        setPlayingActivity(currentPlayingInfo)
      } else {
        setLauncherActivity()
      }
    }
  }
}

async function destroyDiscordRPC() {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  if (rpcClient) {
    try {
      await rpcClient.destroy()
    } catch (e) {}
    rpcClient = null
    isConnected = false
    isConnecting = false
  }
}

module.exports = {
  connectDiscord,
  setLauncherActivity,
  setPlayingActivity,
  stopPlayingActivity,
  setDiscordEnabled,
  destroyDiscordRPC,
}
