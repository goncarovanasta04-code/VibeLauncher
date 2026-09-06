const { app, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const axios = require('axios')
const { spawn } = require('child_process')

// GitHub repository endpoint for updates
const GITHUB_REPO = 'goncarovanasta04-code/VibeLauncher'
const GITHUB_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
const RELEASES_LIST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases`

let downloadedInstallerPath = null
let isDownloading = false
let abortController = null

function getHeaders() {
  const h = {
    'User-Agent': 'VibeLauncher-App',
    Accept: 'application/vnd.github.v3+json',
  }
  if (GITHUB_TOKEN) {
    h['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }
  return h
}

function getCurrentVersion() {
  try {
    return app.getVersion() || '1.0.0'
  } catch (e) {
    return '1.0.0'
  }
}

/**
 * Compare two semver strings: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const clean1 = (v1 || '').replace(/^v/, '').split('.').map(Number)
  const clean2 = (v2 || '').replace(/^v/, '').split('.').map(Number)

  for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
    const num1 = clean1[i] || 0
    const num2 = clean2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

/**
 * Checks for updates from GitHub Releases or manifest
 */
async function checkForUpdates() {
  const currentVersion = getCurrentVersion()

  try {
    let release = null
    try {
      const res = await axios.get(RELEASES_API, {
        headers: getHeaders(),
        timeout: 10000,
      })
      release = res.data
    } catch (e) {
      // Fallback: fetch release list and take the first one
      const listRes = await axios.get(RELEASES_LIST_API, {
        headers: getHeaders(),
        timeout: 10000,
      })
      if (Array.isArray(listRes.data) && listRes.data.length > 0) {
        release = listRes.data[0]
      }
    }

    if (!release) {
      return { available: false, currentVersion, latestVersion: currentVersion }
    }

    const remoteVersion = (release.tag_name || release.name || '').replace(/^v/, '')
    const hasUpdate = compareVersions(remoteVersion, currentVersion) > 0

    // Find installer asset (.exe or setup)
    const asset = release.assets?.find(
      (a) => a.name.endsWith('.exe') || a.name.includes('Setup') || a.name.includes('installer')
    )

    return {
      available: hasUpdate,
      currentVersion,
      latestVersion: remoteVersion || currentVersion,
      releaseNotes: release.body || 'Улучшения стабильности и новые функции.',
      downloadUrl: asset ? asset.browser_download_url : release.html_url,
      releaseName: release.name || `Обновление v${remoteVersion}`,
      pubDate: release.published_at,
    }
  } catch (err) {
    console.error('[Updater] Failed to check for updates:', err.message)
    return {
      available: false,
      currentVersion,
      latestVersion: currentVersion,
    }
  }
}

/**
 * Downloads the update installer with live progress
 */
async function downloadUpdate(downloadUrl, onProgress) {
  if (isDownloading) return { ok: false, error: 'Загрузка уже выполняется' }
  if (!downloadUrl) return { ok: false, error: 'URL для скачивания не указан' }

  // If download URL is a webpage, open in browser
  if (!downloadUrl.endsWith('.exe')) {
    shell.openExternal(downloadUrl)
    return { ok: true, redirected: true }
  }

  isDownloading = true
  abortController = new AbortController()

  const tempDir = os.tmpdir()
  const targetPath = path.join(tempDir, `VibeLauncher-Setup-${Date.now()}.exe`)

  try {
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      signal: abortController.signal,
      headers: {
        'User-Agent': 'VibeLauncher-App',
      },
    })

    const totalBytes = parseInt(response.headers['content-length'], 10) || 0
    let receivedBytes = 0
    let lastTime = Date.now()
    let lastBytes = 0

    const writer = fs.createWriteStream(targetPath)

    response.data.on('data', (chunk) => {
      receivedBytes += chunk.length
      const now = Date.now()
      const timeDiff = (now - lastTime) / 1000

      if (timeDiff >= 0.2 || receivedBytes === totalBytes) {
        const speed = timeDiff > 0 ? (receivedBytes - lastBytes) / timeDiff : 0
        const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0

        if (onProgress) {
          onProgress({
            percent,
            transferred: receivedBytes,
            total: totalBytes,
            speed,
          })
        }

        lastTime = now
        lastBytes = receivedBytes
      }
    })

    return new Promise((resolve, reject) => {
      response.data.pipe(writer)

      writer.on('finish', () => {
        isDownloading = false
        downloadedInstallerPath = targetPath
        resolve({ ok: true, path: targetPath })
      })

      writer.on('error', (err) => {
        isDownloading = false
        try {
          fs.unlinkSync(targetPath)
        } catch (e) {}
        reject({ ok: false, error: err.message })
      })
    })
  } catch (err) {
    isDownloading = false
    try {
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
    } catch (e) {}
    return { ok: false, error: err.message }
  }
}

/**
 * Installs the downloaded update and exits launcher
 */
function installDownloadedUpdate() {
  if (!downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
    return { ok: false, error: 'Файл установщика не найден' }
  }

  try {
    console.log('[Updater] Launching installer:', downloadedInstallerPath)
    // Run the installer detached and quit the current process
    const child = spawn(downloadedInstallerPath, ['--updated'], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()

    setTimeout(() => {
      app.quit()
    }, 400)

    return { ok: true }
  } catch (err) {
    console.error('[Updater] Failed to execute installer:', err)
    return { ok: false, error: err.message }
  }
}

module.exports = {
  getCurrentVersion,
  checkForUpdates,
  downloadUpdate,
  installDownloadedUpdate,
}
