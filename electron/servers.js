const fs = require('fs')
const path = require('path')
const nbt = require('prismarine-nbt')

const SERVER_IP = 'fuflandiya.ru'
const SERVER_NAME = 'VibeLauncher Server | discord.gg/fAS92DwB8R'

/**
 * Ensures Fuflandiya server is present in the player's Minecraft multiplayer server list (servers.dat)
 * @param {string} gameDir - Path to .minecraft or instance directory
 */
async function ensureFuflandiyaServer(gameDir) {
  if (!gameDir || !fs.existsSync(gameDir)) {
    return
  }

  const serversDatPath = path.join(gameDir, 'servers.dat')

  try {
    let serversList = []

    if (fs.existsSync(serversDatPath)) {
      const data = fs.readFileSync(serversDatPath)
      try {
        const { parsed } = await nbt.parse(data)
        if (parsed?.value?.servers?.value?.value) {
          serversList = parsed.value.servers.value.value
        }
      } catch (parseErr) {
        console.warn('[Servers] Could not parse existing servers.dat, creating clean list:', parseErr.message)
      }
    }

    // Check if fuflandiya.ru is already in the list
    const existingIndex = serversList.findIndex(
      (s) => s.ip?.value?.toLowerCase()?.trim() === SERVER_IP.toLowerCase()
    )

    const fuflandiyaEntry = {
      ip: { type: 'string', value: SERVER_IP },
      name: { type: 'string', value: SERVER_NAME },
      acceptTextures: { type: 'byte', value: 1 },
    }

    if (existingIndex >= 0) {
      // Update name and keep it in position
      serversList[existingIndex].name = { type: 'string', value: SERVER_NAME }
    } else {
      // Add to top of server list
      serversList.unshift(fuflandiyaEntry)
    }

    // Build NBT root compound
    const nbtData = {
      type: 'compound',
      name: '',
      value: {
        servers: {
          type: 'list',
          value: {
            type: 'compound',
            value: serversList,
          },
        },
      },
    }

    const uncompressedBuffer = nbt.writeUncompressed(nbtData)
    fs.writeFileSync(serversDatPath, uncompressedBuffer)
    console.log(`[Servers] Successfully ensured ${SERVER_IP} in ${serversDatPath}`)
  } catch (err) {
    console.error('[Servers] Error writing servers.dat:', err)
  }
}

module.exports = {
  ensureFuflandiyaServer,
}
