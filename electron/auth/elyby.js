const axios = require('axios')
const crypto = require('crypto')

function generateOfflineUUID(username) {
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username).digest('hex')
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '3' + hash.substring(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-')
}

/**
 * Direct Yggdrasil authentication via Ely.by
 * Endpoint: https://authserver.ely.by/auth/authenticate
 */
async function loginElyByCredentials(username, password) {
  if (!username || !username.trim()) {
    return { ok: false, error: 'Введите логин или email' }
  }
  if (!password) {
    return { ok: false, error: 'Введите пароль' }
  }

  try {
    const clientToken = crypto.randomUUID ? crypto.randomUUID() : 'vibelauncher-' + Date.now()

    const res = await axios.post(
      'https://authserver.ely.by/auth/authenticate',
      {
        agent: {
          name: 'Minecraft',
          version: 1,
        },
        username: username.trim(),
        password: password,
        clientToken: clientToken,
        requestUser: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VibeLauncher/1.0',
        },
        timeout: 10000,
      }
    )

    if (res.data && res.data.accessToken) {
      const profile = res.data.selectedProfile || (res.data.user ? { name: username.trim(), id: res.data.user.id } : null)
      const playerName = (profile && profile.name) ? profile.name : username.trim()
      const playerUUID = (profile && profile.id) ? profile.id : generateOfflineUUID(playerName)

      return {
        ok: true,
        token: res.data.accessToken,
        clientToken: res.data.clientToken || clientToken,
        username: playerName,
        uuid: playerUUID,
        skinUrl: `https://skinsystem.ely.by/skins/${playerName}.png`,
        avatarUrl: `https://mc-heads.net/avatar/${playerName}/64`,
        isOnline: true,
        authType: 'elyby',
      }
    }

    return { ok: false, error: 'Неверный ответ от сервера Ely.by' }
  } catch (err) {
    if (err.response && err.response.data) {
      const errorMsg = err.response.data.errorMessage || err.response.data.error || 'Ошибка входа'
      if (errorMsg.includes('Invalid credentials') || errorMsg.includes('Invalid username or password')) {
        return { ok: false, error: 'Неверный логин или пароль Ely.by' }
      }
      return { ok: false, error: errorMsg }
    }
    return { ok: false, error: 'Не удалось подключиться к Ely.by: ' + (err.message || 'Ошибка сети') }
  }
}

module.exports = { loginElyByCredentials, generateOfflineUUID }
