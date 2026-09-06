const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')
const http = require('http')
const { execSync, spawn } = require('child_process')

// Direct verified Eclipse Temurin (Adoptium) portable JDK downloads for Windows x64
const ADOPTIUM_URLS = {
  8: 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u442-b06/OpenJDK8U-jdk_x64_windows_hotspot_8u442b06.zip',
  17: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.14_7.zip',
  21: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.6%2B7/OpenJDK21U-jdk_x64_windows_hotspot_21.0.6_7.zip',
}

/**
 * Determines required Java major version for a given Minecraft version.
 * - <= 1.16.5: Java 8
 * - 1.17 - 1.20.4: Java 17
 * - >= 1.20.5, 1.21+: Java 21
 */
function getRequiredJavaVersion(mcVersion, versionData = null) {
  // 1. Authoritative check: version JSON specifies javaVersion.majorVersion
  if (versionData?.javaVersion?.majorVersion) {
    const jsonMajor = parseInt(versionData.javaVersion.majorVersion, 10)
    if (!isNaN(jsonMajor) && jsonMajor > 0) return jsonMajor
  }

  // 2. Check inheritsFrom (very common in Fabric/Forge/custom modpack JSONs)
  if (versionData?.inheritsFrom && typeof versionData.inheritsFrom === 'string') {
    const fromInherits = getRequiredJavaVersion(versionData.inheritsFrom, null)
    if (fromInherits) return fromInherits
  }

  // 3. Check jar specification
  if (versionData?.jar && typeof versionData.jar === 'string') {
    const fromJar = getRequiredJavaVersion(versionData.jar, null)
    if (fromJar) return fromJar
  }

  if (!mcVersion || typeof mcVersion !== 'string') return 17

  // Clean version string (e.g. "fabric-loader-0.16.10-1.21.1" -> "1.21.1")
  let cleanVer = mcVersion
  const fabricMatch = mcVersion.match(/fabric-loader-[^-]+-(.+)/)
  if (fabricMatch) cleanVer = fabricMatch[1]
  const forgeMatch = mcVersion.match(/forge-([^-]+)/)
  if (forgeMatch) cleanVer = forgeMatch[1]
  const neoforgeMatch = mcVersion.match(/neoforge-([^-]+)/)
  if (neoforgeMatch) cleanVer = neoforgeMatch[1]

  // Robustly extract version pattern X.Y or X.Y.Z
  const verMatch = cleanVer.match(/(\d+\.\d+(?:\.\d+)?)/)
  if (verMatch) {
    cleanVer = verMatch[1]
  } else if (versionData?.assets && typeof versionData.assets === 'string') {
    const assetMatch = versionData.assets.match(/(\d+\.\d+)/)
    if (assetMatch) cleanVer = assetMatch[1]
  }

  const parts = cleanVer.split('.').map((p) => parseInt(p, 10))
  const major = parts[0] || 1
  const minor = parts[1] || 16
  const patch = parts[2] || 0

  if (major === 1) {
    if (minor <= 16) return 8
    if (minor >= 17 && minor <= 19) return 17
    if (minor === 20) {
      // 1.20.5 and 1.20.6 require Java 21!
      return patch >= 5 ? 21 : 17
    }
    if (minor >= 21) return 21
  }

  return 21
}

/**
 * Checks a java.exe / javaw.exe executable and returns { major, is64Bit, valid: true }, or null if failed.
 */
function probeJavaInfo(javaExePath) {
  if (!javaExePath || !fs.existsSync(javaExePath)) return null
  try {
    const out = execSync(`"${javaExePath}" -version 2>&1`, {
      encoding: 'utf8',
      timeout: 3500,
    })
    const is64Bit = /64-Bit|x86_64|amd64/i.test(out)
    const match = out.match(/version\s*["']?([0-9._]+)/i)
    if (match && match[1]) {
      const verStr = match[1]
      let major = 8
      if (verStr.startsWith('1.8')) major = 8
      else if (verStr.startsWith('1.7')) major = 7
      else {
        const firstNum = parseInt(verStr.split('.')[0], 10)
        if (!isNaN(firstNum)) major = firstNum
      }
      return { major, is64Bit, raw: verStr, valid: true }
    }
  } catch (e) {}
  return null
}

function probeJavaVersion(javaExePath) {
  const info = probeJavaInfo(javaExePath)
  return info ? info.major : null
}

/**
 * Discovers all valid 64-bit Java installations on the machine.
 */
function discoverLocalJavaInstallations() {
  const discovered = []
  const seenPaths = new Set()

  const addIfValid = (p) => {
    if (!p || seenPaths.has(p) || !fs.existsSync(p)) return
    seenPaths.add(p)
    const info = probeJavaInfo(p)
    // Exclude 32-bit Java because 32-bit JVM crashes with 'Could not create JVM' on normal RAM
    if (info && info.major && info.is64Bit) {
      discovered.push({ path: p, major: info.major, is64Bit: true })
    }
  }

  const searchRoots = [
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Zulu',
    'C:\\Program Files\\Amazon Corretto',
    path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft', 'runtime'),
    path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft', 'runtimes'),
  ]

  if (process.env.JAVA_HOME) {
    searchRoots.unshift(process.env.JAVA_HOME)
  }

  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue

    addIfValid(path.join(root, 'bin', 'javaw.exe'))
    addIfValid(path.join(root, 'bin', 'java.exe'))

    try {
      const subdirs = fs.readdirSync(root)
      for (const sub of subdirs) {
        const subPath = path.join(root, sub)
        addIfValid(path.join(subPath, 'bin', 'javaw.exe'))
        addIfValid(path.join(subPath, 'bin', 'java.exe'))
      }
    } catch (e) {}
  }

  return discovered
}

/**
 * Downloads a file with redirect following and progress reporting.
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    let activeTimer = null

    const resetTimer = (req) => {
      if (activeTimer) clearTimeout(activeTimer)
      // 2-minute inactivity timeout (if no bytes received for 120s)
      activeTimer = setTimeout(() => {
        req.destroy()
        try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch (e) {}
        reject(new Error('Download timeout: network inactive for 120s'))
      }, 120000)
    }

    const cleanup = () => {
      if (activeTimer) clearTimeout(activeTimer)
    }

    let appVer = '1.4.0'
    try { appVer = require('../package.json').version || '1.4.0' } catch (e) {}

    const makeRequest = (curUrl) => {
      const client = curUrl.startsWith('https:') ? https : http
      const options = {
        headers: {
          'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) VibeLauncher/${appVer}`,
          Accept: '*/*',
        },
      }
      const req = client.get(curUrl, options, (res) => {
        resetTimer(req)

        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          cleanup()
          return makeRequest(res.headers.location)
        }

        if (res.statusCode !== 200) {
          cleanup()
          try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch (e) {}
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`))
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
        let downloadedBytes = 0

        const fileStream = fs.createWriteStream(destPath)
        res.on('data', (chunk) => {
          resetTimer(req)
          downloadedBytes += chunk.length
          if (totalBytes > 0 && onProgress) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100)
            onProgress({
              percent,
              current: Math.round(downloadedBytes / 1024 / 1024),
              total: Math.round(totalBytes / 1024 / 1024),
            })
          }
        })

        res.pipe(fileStream)
        fileStream.on('finish', () => {
          cleanup()
          fileStream.close(() => resolve(destPath))
        })
        fileStream.on('error', (err) => {
          cleanup()
          try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch (e) {}
          reject(err)
        })
      })

      resetTimer(req)

      req.on('error', (err) => {
        cleanup()
        try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch (e) {}
        reject(err)
      })
    }

    makeRequest(url)
  })
}

/**
 * Extracts a ZIP archive natively on Windows using tar or PowerShell.
 */
async function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  return new Promise((resolve, reject) => {
    const proc = spawn('tar', ['-xf', zipPath, '-C', outDir], {
      windowsHide: true,
    })
    proc.on('close', (code) => {
      if (code === 0) return resolve()
      const ps = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force`,
        ],
        { windowsHide: true }
      )
      ps.on('close', (psCode) => {
        if (psCode === 0) resolve()
        else reject(new Error(`Extraction failed with exit code ${psCode}`))
      })
    })
    proc.on('error', (err) => {
      const ps = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force`,
        ],
        { windowsHide: true }
      )
      ps.on('close', (psCode) => {
        if (psCode === 0) resolve()
        else reject(new Error(`Extraction failed with error: ${err.message}`))
      })
    })
  })
}

/**
 * Automatically downloads and installs a portable OpenJDK runtime.
 */
async function autoDownloadJava(majorVersion, rootDir, onProgress) {
  const url = ADOPTIUM_URLS[majorVersion]
  if (!url) {
    throw new Error(`No portable download URL available for Java ${majorVersion}`)
  }

  const runtimesDir = path.join(rootDir, 'runtimes')
  const targetDir = path.join(runtimesDir, `java-${majorVersion}`)
  const zipPath = path.join(runtimesDir, `temurin-jdk-${majorVersion}.zip`)

  fs.mkdirSync(runtimesDir, { recursive: true })

  if (onProgress) {
    onProgress({
      type: 'status',
      text: `Загрузка официальной Java ${majorVersion} (OpenJDK Temurin)...`,
    })
  }

  // 1. Download
  await downloadFile(url, zipPath, (info) => {
    if (onProgress) {
      onProgress({
        type: 'progress',
        data: {
          task: `Java ${majorVersion} (${info.current} МБ / ${info.total} МБ)`,
          percent: info.percent,
        },
      })
    }
  })

  // 2. Extract
  if (onProgress) {
    onProgress({
      type: 'status',
      text: `Распаковка Java ${majorVersion}...`,
    })
  }

  await extractZip(zipPath, targetDir)

  // Clean up zip
  try {
    fs.unlinkSync(zipPath)
  } catch (e) {}

  const extracted = findJavaInDirectory(targetDir)
  if (extracted) {
    return extracted
  }

  throw new Error(`Could not find java.exe in extracted directory ${targetDir}`)
}

function findJavaInDirectory(dir) {
  if (!fs.existsSync(dir)) return null
  const javaw = path.join(dir, 'bin', 'javaw.exe')
  const java = path.join(dir, 'bin', 'java.exe')
  if (fs.existsSync(javaw)) return javaw
  if (fs.existsSync(java)) return java

  try {
    const subs = fs.readdirSync(dir)
    for (const sub of subs) {
      const subDir = path.join(dir, sub)
      if (fs.statSync(subDir).isDirectory()) {
        const found = findJavaInDirectory(subDir)
        if (found) return found
      }
    }
  } catch (e) {}
  return null
}

/**
 * Resolves the best compatible Java executable for the given Minecraft version.
 * - Matches exact required version (8, 17, 21)
 * - Excludes incompatible/experimental JDKs (e.g. Java 25)
 * - Auto-downloads portable runtime if missing
 */
async function resolveJavaRuntime(mcVersion, customPath, rootDir, onProgress, versionData = null) {
  const reqMajor = getRequiredJavaVersion(mcVersion, versionData)

  // 1. User custom path override
  if (customPath && customPath.trim()) {
    const cp = customPath.trim()
    if (fs.existsSync(cp)) {
      const customMajor = probeJavaVersion(cp)
      console.log(`[Java] Using user-specified Java: ${cp} (major: ${customMajor})`)
      return cp
    }
  }

  // 2. Check previously downloaded portable runtimes in <rootDir>/runtimes/java-<reqMajor>
  const localPortableDir = path.join(rootDir, 'runtimes', `java-${reqMajor}`)
  const localJava = findJavaInDirectory(localPortableDir)
  if (localJava && fs.existsSync(localJava)) {
    const v = probeJavaVersion(localJava)
    if (v === reqMajor || v === null) {
      console.log(`[Java] Found cached portable Java ${reqMajor}: ${localJava}`)
      return localJava
    }
  }

  // 3. Search PC for matching installed Java (excluding Java 25+)
  const localList = discoverLocalJavaInstallations()
  console.log('[Java] Discovered local Java runtimes:', localList)

  // Find exact match
  const exactMatch = localList.find((item) => item.major === reqMajor)
  if (exactMatch) {
    console.log(`[Java] Found matching system Java ${reqMajor}: ${exactMatch.path}`)
    return exactMatch.path
  }

  // 4. If required is 21 or 8 or 17 and not found on system: automatically download portable Temurin JDK
  if (reqMajor === 21 || reqMajor === 8 || reqMajor === 17) {
    try {
      console.log(`[Java] Downloading required Java ${reqMajor} for Minecraft ${mcVersion}...`)
      const downloadedJava = await autoDownloadJava(reqMajor, rootDir, onProgress)
      return downloadedJava
    } catch (downloadErr) {
      console.warn(`[Java] Auto-download of Java ${reqMajor} failed:`, downloadErr.message)
    }
  }

  // 5. Safe Fallbacks: NEVER use Java 17 for Java 21, and NEVER use Java 17+ for Java 8
  if (reqMajor === 21) {
    // If Java 21 is strictly required (1.20.5+ / 1.21+), try any runtime >= 21 and <= 24
    const java21Plus = localList.find((item) => item.major >= 21 && item.major <= 24)
    if (java21Plus) return java21Plus.path
  } else if (reqMajor === 8) {
    // If Java 8 is required (1.16.5 and older), find any Java 8 installation
    const java8 = localList.find((item) => item.major === 8)
    if (java8) return java8.path
  } else {
    // For 1.17 - 1.20.4, Java 17 or 21 are both compatible
    const safeFallback = localList.find((item) => item.major <= 21 && item.major >= 17)
    if (safeFallback) return safeFallback.path
  }

  return 'java'
}

module.exports = {
  getRequiredJavaVersion,
  probeJavaVersion,
  probeJavaInfo,
  discoverLocalJavaInstallations,
  resolveJavaRuntime,
  autoDownloadJava,
}
