const { BrowserWindow } = require('electron')
const msmc = require('msmc')

/**
 * Opens Microsoft login window, captures OAuth code, and completes Xbox Live + Minecraft authentication
 * Powered by msmc (supports Xbox Live, XSTS, Minecraft Services, and Game Pass entitlements)
 */
async function loginMicrosoft(parentWindow) {
  return new Promise((resolve) => {
    const auth = new msmc.Auth('select_account')
    const authUrl = auth.createLink()

    let authWindow = new BrowserWindow({
      width: 540,
      height: 680,
      parent: parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined,
      modal: false, // Non-modal to avoid Windows OS input/focus locks
      title: 'Вход в аккаунт Microsoft',
      autoHideMenuBar: true,
      center: true,
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    let resolved = false
    let pollInterval = null

    const cleanup = () => {
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
      if (authWindow && !authWindow.isDestroyed()) {
        try {
          authWindow.close()
        } catch (e) {}
      }
      authWindow = null
    }

    const checkUrl = async (rawUrl) => {
      if (resolved || !rawUrl) return
      if (!rawUrl.includes('oauth20_desktop.srf')) return

      let code = null
      let error = null

      try {
        const u = new URL(rawUrl)
        error = u.searchParams.get('error_description') || u.searchParams.get('error')
        code = u.searchParams.get('code')
      } catch (e) {
        const matchCode = rawUrl.match(/[?&#]code=([^&#]+)/)
        if (matchCode) code = decodeURIComponent(matchCode[1])
        const matchErr = rawUrl.match(/[?&#]error(?:_description)?=([^&#]+)/)
        if (matchErr) error = decodeURIComponent(matchErr[1])
      }

      if (error) {
        resolved = true
        cleanup()
        return resolve({ ok: false, error: error })
      }

      if (!code) return

      resolved = true
      cleanup()

      try {
        console.log('[Microsoft Auth] Exchanging code for Xbox Live & Minecraft tokens...')
        const xbox = await auth.login(code)
        const mc = await xbox.getMinecraft()

        if (mc.isDemo()) {
          return resolve({
            ok: false,
            error:
              'На этом аккаунте Microsoft не найдена лицензия Minecraft (Java Edition). Проверьте аккаунт на minecraft.net или наличие Xbox Game Pass.',
          })
        }

        const profile = mc.profile || {}
        const mclc = mc.mclc(true)
        const skinUrl =
          profile.skins?.[0]?.url || `https://mc-heads.net/avatar/${profile.name || mclc.name}/64`

        console.log('[Microsoft Auth] Successfully logged in as:', profile.name || mclc.name)

        return resolve({
          ok: true,
          username: profile.name || mclc.name,
          uuid: profile.id || mclc.uuid,
          token: mclc.access_token,
          xuid: mclc.meta?.xuid || '',
          refreshToken: mc.save ? mc.save() : undefined,
          skinUrl: skinUrl,
          avatarUrl: `https://mc-heads.net/avatar/${profile.name || mclc.name}/64`,
          isOnline: true,
          authType: 'microsoft',
        })
      } catch (err) {
        console.error('[Microsoft Auth] Error:', err)
        let msg = 'Ошибка авторизации Microsoft'
        if (typeof err === 'string') {
          msg = err
        } else if (err?.ts) {
          msg = err.ts
        } else if (err?.message) {
          msg = err.message
        }
        return resolve({ ok: false, error: msg })
      }
    }

    // Attach all navigation listeners
    authWindow.webContents.on('will-redirect', (_, targetUrl) => checkUrl(targetUrl))
    authWindow.webContents.on('will-navigate', (_, targetUrl) => checkUrl(targetUrl))
    authWindow.webContents.on('did-navigate', (_, targetUrl) => checkUrl(targetUrl))
    authWindow.webContents.on('did-start-navigation', (_, targetUrl) => checkUrl(targetUrl))
    authWindow.webContents.on('did-finish-load', () => {
      if (authWindow && !authWindow.isDestroyed()) {
        checkUrl(authWindow.webContents.getURL())
      }
    })

    // Poll every 200ms to catch in-page redirects
    pollInterval = setInterval(() => {
      if (authWindow && !authWindow.isDestroyed()) {
        const cur = authWindow.webContents.getURL()
        if (cur && cur.includes('oauth20_desktop.srf')) {
          checkUrl(cur)
        }
      } else {
        if (pollInterval) clearInterval(pollInterval)
      }
    }, 200)

    authWindow.on('closed', () => {
      if (pollInterval) clearInterval(pollInterval)
      authWindow = null
      if (!resolved) {
        resolved = true
        resolve({ ok: false, error: 'Авторизация отменена пользователем' })
      }
    })

    authWindow.loadURL(authUrl)
  })
}

module.exports = { loginMicrosoft }
