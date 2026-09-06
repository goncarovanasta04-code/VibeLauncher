const fs = require('fs')
const path = require('path')
const nbt = require('prismarine-nbt')

const SERVER_IP = 'fuflandiya.ru'
const SERVER_NAME = 'discord.gg/fAS92DwB8R'

/**
 * Ensures server is present in the player's Minecraft multiplayer server list (servers.dat)
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

    // Check if server is already in the list
    const existingIndex = serversList.findIndex(
      (s) =>
        s.ip?.value?.toLowerCase()?.trim() === SERVER_IP.toLowerCase() ||
        (typeof s.name?.value === 'string' &&
          (s.name.value.includes('fAS92DwB8R') ||
           s.name.value.toLowerCase().includes('vibelauncher') ||
           s.name.value.toLowerCase().includes('фуфляндия')))
    )

    const serverEntry = {
      ip: { type: 'string', value: SERVER_IP },
      name: { type: 'string', value: SERVER_NAME },
      acceptTextures: { type: 'byte', value: 1 },
    }

    if (existingIndex >= 0) {
      // Update name to strictly Discord link and update IP if needed
      serversList[existingIndex].name = { type: 'string', value: SERVER_NAME }
      serversList[existingIndex].ip = { type: 'string', value: SERVER_IP }
    } else {
      // Add to top of server list
      serversList.unshift(serverEntry)
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
