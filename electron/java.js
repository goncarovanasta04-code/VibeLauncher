const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')
const http = require('http')
const { spawnSync, spawn } = require('child_process')

// Direct verified Eclipse Temurin (Adoptium) & Azul Zulu OpenJDK portable JDK download mirrors for Windows x64
const JAVA_MIRRORS = {
  8: [
    'https://api.adoptium.net/v3/binary/latest/8/ga/windows/x64/jdk/hotspot/normal/eclipse',
    'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u442-b06/OpenJDK8U-jdk_x64_windows_hotspot_8u442b06.zip',
    'https://cdn.azul.com/zulu/bin/zulu8.84.0.15-ca-jdk8.0.442-win_x64.zip',
  ],
  17: [
    'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse',
    'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.14_7.zip',
    'https://cdn.azul.com/zulu/bin/zulu17.56.15-ca-jdk17.0.14-win_x64.zip',
  ],
  21: [
    'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse',
    'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.6%2B7/OpenJDK21U-jdk_x64_windows_hotspot_21.0.6_7.zip',
    'https://cdn.azul.com/zulu/bin/zulu21.40.17-ca-jdk21.0.6-win_x64.zip',
  ],
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
 * Checks a java.exe / javaw.exe executable safely without shell invocation.
 * Returns { major, is64Bit, raw: verStr, valid: true }, or null if failed.
 */
function probeJavaInfo(javaExePath) {
  if (!javaExePath || typeof javaExePath !== 'string' || !fs.existsSync(javaExePath)) return null
  try {
    const res = spawnSync(javaExePath, ['-version'], {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    })
    const out = (res.stderr || '') + '\n' + (res.stdout || '')
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
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Eclipse Adoptium'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Java'),
    // Official Mojang Launcher runtime on Windows
    path.join(
      os.homedir(),
      'AppData',
      'Local',
      'Packages',
      'Microsoft.4297127D64EC6_8wekyb3d8bbwe',
      'LocalCache',
      'Local',
      'runtime'
    ),
  ]

  if (process.env.JAVA_HOME) {
    searchRoots.unshift(process.env.JAVA_HOME)
  }

  // 1. Check direct searchRoots and immediate subfolders
  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue

    addIfValid(path.join(root, 'bin', 'java.exe'))
    addIfValid(path.join(root, 'bin', 'javaw.exe'))

    try {
      const subdirs = fs.readdirSync(root)
      for (const sub of subdirs) {
        const subPath = path.join(root, sub)
        try {
          if (fs.statSync(subPath).isDirectory()) {
            addIfValid(path.join(subPath, 'bin', 'java.exe'))
            addIfValid(path.join(subPath, 'bin', 'javaw.exe'))

            // Second level check for e.g. java-runtime-gamma/windows-x64/java-runtime-gamma/bin/java.exe
            const innerSubs = fs.readdirSync(subPath)
            for (const inSub of innerSubs) {
              const inPath = path.join(subPath, inSub)
              if (fs.existsSync(inPath) && fs.statSync(inPath).isDirectory()) {
                addIfValid(path.join(inPath, 'bin', 'java.exe'))
                addIfValid(path.join(inPath, 'bin', 'javaw.exe'))
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  // 2. Query where.exe java (system PATH) safely
  try {
    const whereRes = spawnSync('where.exe', ['java'], {
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
    })
    if (whereRes.stdout) {
      const lines = whereRes.stdout.split(/\r?\n/)
      for (const l of lines) {
        const trimmed = l.trim()
        if (trimmed && fs.existsSync(trimmed)) {
          addIfValid(trimmed)
        }
      }
    }
  } catch (e) {}

  return discovered
}

/**
 * Downloads a file with redirect following and progress reporting.
 */
function downloadFile(url, destPath, onProgress, maxRedirects = 8) {
  return new Promise((resolve, reject) => {
    let activeTimer = null
    let redirectCount = 0

    const resetTimer = (req) => {
      if (activeTimer) clearTimeout(activeTimer)
      activeTimer = setTimeout(() => {
        req.destroy()
        try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch (e) {}
        reject(new Error('Таймаут скачивания: соединение неактивно 60 сек'))
      }, 60000)
    }

    const cleanup = () => {
      if (activeTimer) clearTimeout(activeTimer)
    }

    let appVer = '1.4.1'
    try { appVer = require('../package.json').version || '1.4.1' } catch (e) {}

    const makeRequest = (curUrl) => {
      if (redirectCount++ > maxRedirects) {
        cleanup()
        return reject(new Error('Слишком много перенаправлений (redirect loop)'))
      }

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
          res.resume() // Drain stream to release socket
          try {
            const resolvedLoc = new URL(res.headers.location, curUrl).href
            return makeRequest(resolvedLoc)
          } catch (urlErr) {
            return reject(new Error(`Некорректный URL перенаправления: ${res.headers.location}`))
          }
        }

        if (res.statusCode !== 200) {
          cleanup()
          res.resume()
          try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch (e) {}
          return reject(new Error(`Сервер вернул HTTP ${res.statusCode}`))
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
 * Automatically downloads and installs a portable OpenJDK runtime with fallback mirror support.
 */
async function autoDownloadJava(majorVersion, rootDir, onProgress) {
  const mirrors = JAVA_MIRRORS[majorVersion]
  if (!mirrors || mirrors.length === 0) {
    throw new Error(`Нет доступных ссылок для загрузки среды Java ${majorVersion}`)
  }

  const runtimesDir = path.join(rootDir, 'runtimes')
  const targetDir = path.join(runtimesDir, `java-${majorVersion}`)
  const zipPath = path.join(runtimesDir, `temurin-jdk-${majorVersion}.zip`)

  fs.mkdirSync(runtimesDir, { recursive: true })

  let lastError = null
  let downloadedSuccessfully = false

  for (let i = 0; i < mirrors.length; i++) {
    const url = mirrors[i]
    try {
      if (onProgress) {
        onProgress({
          type: 'status',
          text: `Загрузка Java ${majorVersion} (зеркало ${i + 1}/${mirrors.length})...`,
        })
      }

      console.log(`[Java] Attempting download of Java ${majorVersion} from mirror ${i + 1}: ${url}`)
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

      // Check downloaded zip size
      if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 20000000) {
        downloadedSuccessfully = true
        break
      } else {
        throw new Error('Скачанный архив Java неполный или поврежден')
      }
    } catch (err) {
      console.warn(`[Java] Mirror ${i + 1} failed:`, err.message)
      lastError = err
      try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath) } catch (e) {}
    }
  }

  if (!downloadedSuccessfully) {
    throw new Error(`Не удалось скачать Java ${majorVersion} ни с одного зеркала: ${lastError?.message || 'Сбой сети'}`)
  }

  // 2. Extract
  if (onProgress) {
    onProgress({
      type: 'status',
      text: `Распаковка среды Java ${majorVersion}...`,
    })
  }

  // Clean existing targetDir to prevent mixed / broken versions
  try {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }
  } catch (e) {}

  await extractZip(zipPath, targetDir)

  // Clean up zip
  try {
    fs.unlinkSync(zipPath)
  } catch (e) {}

  const extracted = findJavaInDirectory(targetDir)
  if (extracted) {
    return extracted
  }

  throw new Error(`Не удалось найти java.exe в распакованной папке ${targetDir}`)
}

function findJavaInDirectory(dir) {
  if (!fs.existsSync(dir)) return null
  const java = path.join(dir, 'bin', 'java.exe')
  const javaw = path.join(dir, 'bin', 'javaw.exe')
  if (fs.existsSync(java)) return java
  if (fs.existsSync(javaw)) return javaw

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

  // 4. Automatically download portable Temurin/Zulu OpenJDK with mirrors
  if (reqMajor === 21 || reqMajor === 8 || reqMajor === 17) {
    try {
      console.log(`[Java] Downloading required Java ${reqMajor} for Minecraft ${mcVersion}...`)
      const downloadedJava = await autoDownloadJava(reqMajor, rootDir, onProgress)
      return downloadedJava
    } catch (downloadErr) {
      console.warn(`[Java] Auto-download of Java ${reqMajor} failed:`, downloadErr.message)
    }
  }

  // 5. Safe Fallbacks:
  // NEVER use Java 17 for Java 21 (1.20.5+ strictly fails)
  // NEVER use Java 17+ for Java 8 (<= 1.16.5 strictly fails)
  if (reqMajor === 21) {
    const java21Plus = localList.find((item) => item.major >= 21 && item.major <= 24)
    if (java21Plus) return java21Plus.path
  } else if (reqMajor === 8) {
    const java8 = localList.find((item) => item.major === 8)
    if (java8) return java8.path
  } else {
    const safeFallback = localList.find((item) => item.major <= 21 && item.major >= 17)
    if (safeFallback) return safeFallback.path
  }

  // If no compatible Java could be found or downloaded, throw an informative error
  // instead of blindly running 'java' which might be the wrong version and crash.
  const sysJava = probeJavaInfo('java')
  if (sysJava && sysJava.major === reqMajor) {
    return 'java'
  }

  throw new Error(
    `Для запуска Minecraft ${mcVersion} требуется Java ${reqMajor} (x64), но совместимая версия не найдена. Попробуйте установить Java ${reqMajor} или перезапустить лаунчер для повторной автозагрузки.`
  )
}

module.exports = {
  getRequiredJavaVersion,
  probeJavaVersion,
  probeJavaInfo,
  discoverLocalJavaInstallations,
  resolveJavaRuntime,
  autoDownloadJava,
}
