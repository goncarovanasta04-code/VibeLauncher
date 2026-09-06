const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const axios = require('axios')

// Default repository details
const REPO_OWNER = 'goncarovanasta04-code'
const REPO_NAME = 'VibeLauncher'

function getLocalEnvToken() {
  const envPath = path.resolve(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const l of lines) {
      if (l.startsWith('GH_TOKEN=')) return l.replace('GH_TOKEN=', '').trim()
    }
  }
  return ''
}

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || getLocalEnvToken()

async function main() {
  console.log('====================================================')
  console.log('       VibeLauncher GitHub Release Publisher        ')
  console.log('====================================================\n')

  const rootDir = path.resolve(__dirname, '..')
  const pkgPath = path.join(rootDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

  // Check if a new version was passed as argument: e.g. node publish-release.js 1.3.6
  const newVersionArg = process.argv[2]
  if (newVersionArg && newVersionArg !== pkg.version) {
    const cleanVersion = newVersionArg.replace(/^v/, '')
    console.log(`[1/4] Updating package.json version: ${pkg.version} -> ${cleanVersion}`)
    pkg.version = cleanVersion
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8')
  }

  const version = pkg.version
  const tagName = `v${version}`
  const installerName = `VibeLauncher-Setup-v${version}.exe`
  const installerPath = path.join(rootDir, 'release', installerName)
  const latestYmlPath = path.join(rootDir, 'release', 'latest.yml')

  // Check if installer is built
  if (!fs.existsSync(installerPath)) {
    console.log(`\n[2/4] Installer not found at: ${installerPath}`)
    console.log('Building project with: npm run dist ...')
    execSync('npm run dist', { cwd: rootDir, stdio: 'inherit' })
  } else {
    console.log(`\n[2/4] Found existing installer: ${installerName} (${(fs.statSync(installerPath).size / (1024 * 1024)).toFixed(1)} MB)`)
  }

  if (!fs.existsSync(installerPath)) {
    console.error(`\n[ERROR] Installer build failed or file not found: ${installerPath}`)
    process.exit(1)
  }

  console.log(`\n[3/4] Connecting to GitHub API (${REPO_OWNER}/${REPO_NAME})...`)

  const apiHeaders = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'VibeLauncher-Publisher',
  }

  let release = null

  const releaseNotes = `### 🚀 VibeLauncher ${tagName} — Режим «Potato PC», защита от сбоев JVM и запуск любых сборок

#### 🥔 Специальный режим «Potato PC» (Для очень слабых ПК)
- **Максимальный FPS в 1 клик:** кнопка оптимизации в настройках лаунчера.
- **Оптимизация лаунчера:** полное отключение видео-фонов, 3D-анимаций и тяжелых шейдеров.
- **Оптимизация Minecraft (options.txt):** автоматическая настройка дальности прорисовки (4 чанка), отключение тяжелых частиц, теней сущностей, мягкого освещения и облаков.
- **Безопасная память JVM:** выделение безопасного объема ОЗУ (1-2 ГБ) без риска зависания Windows.

#### ☕ Полное устранение ошибки «Could not create the Java Virtual Machine»
- **Строгая фильтрация 32-битной Java:** исключена ошибка нехватки адресного пространства на старых JRE.
- **Очистка JVM-флагов:** удалены конфликтующие параметры (такие как \`-XX:+AlwaysPreTouch\`), вызывавшие сбой выделения непрерывной виртуальной памяти на Windows.
- **Гарантия \`Xms <= Xmx\`:** жесткий расчет диапазонов памяти в мегабайтах без ошибок переполнения.
- **Pre-flight проверка перед стартом:** моментальный сухой запуск JVM — если система вернула ошибку, лаунчер на лету скачивает проверенную портативную 64-битную Java Temurin.

#### 📦 Запуск любых кастомных сборок и модпаков
- Глубокое сканирование структуры JSON (свойства \`inheritsFrom\`, \`jar\`, \`assets\`, \`javaVersion\`).
- Точное сопоставление версий Java: Java 8 для 1.16.5-, Java 17 для 1.17-1.20.4, Java 21 для 1.20.5+ и 1.21+.
- Кэширование Java в \`runtimes/java-X\` — скачивается ровно 1 раз и больше никогда не загружается повторно.

#### 🎮 Умная кнопка «Установить» / «Запустить»
- Зеленая кнопка **«Установить»** для новых версий, синяя кнопка **«Запустить»** для уже скачанных.
- Интеллектуальное окно расшифровки крашей с логами и кнопкой открытия папки игры.`

  // 1. Try to fetch existing release by tag
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tagName}`,
      { headers: apiHeaders }
    )
    release = res.data
    console.log(`Found existing release: ${release.name || tagName}`)

    // Update release notes
    console.log(`Updating release body on GitHub...`)
    const updateRes = await axios.patch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}`,
      {
        name: `VibeLauncher ${tagName}`,
        body: releaseNotes,
      },
      { headers: apiHeaders }
    )
    release = updateRes.data
    console.log(`Release body updated successfully!`)
  } catch (err) {
    if (err.response && err.response.status === 404) {
      // Create new release
      console.log(`Release ${tagName} does not exist yet. Creating release...`)
      try {
        const createRes = await axios.post(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
          {
            tag_name: tagName,
            name: `VibeLauncher ${tagName}`,
            body: releaseNotes,
            draft: false,
            prerelease: false,
          },
          { headers: apiHeaders }
        )
        release = createRes.data
        console.log(`Successfully created release: ${release.html_url}`)
      } catch (createErr) {
        handleApiError(createErr, tagName, installerPath)
        return
      }
    } else {
      handleApiError(err, tagName, installerPath)
      return
    }
  }

  if (!release || !release.id) {
    console.error('\n[ERROR] Could not obtain release ID from GitHub.')
    return
  }

  // 2. Upload asset
  console.log(`\n[4/4] Uploading ${installerName} to release assets...`)

  // Check if asset already exists in release
  const existingAsset = release.assets?.find((a) => a.name === installerName)
  if (existingAsset) {
    console.log(`Asset ${installerName} already exists. Deleting previous asset...`)
    try {
      await axios.delete(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${existingAsset.id}`,
        { headers: apiHeaders }
      )
    } catch (e) {
      console.warn('Could not delete old asset:', e.message)
    }
  }

  try {
    await uploadFileAsset(release.id, installerPath, installerName, apiHeaders)
    console.log(`\nSUCCESS: ${installerName} successfully uploaded to GitHub!`)

    if (fs.existsSync(latestYmlPath)) {
      console.log('Uploading latest.yml...')
      const existingYml = release.assets?.find((a) => a.name === 'latest.yml')
      if (existingYml) {
        try {
          await axios.delete(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${existingYml.id}`,
            { headers: apiHeaders }
          )
        } catch (e) {}
      }
      await uploadFileAsset(release.id, latestYmlPath, 'latest.yml', apiHeaders)
      console.log('SUCCESS: latest.yml uploaded!')
    }

    console.log('\n====================================================')
    console.log('           ОБНОВЛЕНИЕ УСПЕШНО ОПУБЛИКОВАНО!         ')
    console.log('====================================================')
    console.log(`Ссылка на релиз: ${release.html_url}`)
    console.log(`Теперь любой лаунчер при запуске увидит версию ${version} и предложит обновление!`)
  } catch (uploadErr) {
    handleApiError(uploadErr, tagName, installerPath)
  }
}

async function uploadFileAsset(releaseId, filePath, fileName, headers) {
  const stats = fs.statSync(filePath)
  const fileStream = fs.createReadStream(filePath)

  const uploadUrl = `https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${releaseId}/assets?name=${encodeURIComponent(
    fileName
  )}`

  return axios.post(uploadUrl, fileStream, {
    headers: {
      ...headers,
      'Content-Type': fileName.endsWith('.exe') ? 'application/octet-stream' : 'text/yaml',
      'Content-Length': stats.size,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })
}

function handleApiError(err, tagName, installerPath) {
  console.error('\n[GitHub API Error]:', err.response?.data || err.message)

  if (err.response?.status === 403 || err.response?.status === 401) {
    console.log('\n----------------------------------------------------')
    console.log('ВАЖНО ПО ТОКЕНУ GITHUB:')
    console.log('Для автоматической загрузки токен должен иметь права на запись (Contents: Read and write).')
    console.log('Как включить в GitHub:')
    console.log(' 1. Откройте: https://github.com/settings/tokens')
    console.log(' 2. Нажмите на ваш токен (Fine-grained token)')
    console.log(' 3. В разделе "Repository permissions" найдите "Contents"')
    console.log(' 4. Выберите "Read and write" и сохраните.')
    console.log('----------------------------------------------------\n')
    console.log('ИЛИ ВЫ МОЖЕТЕ ОПУБЛИКОВАТЬ В 1 КЛИК ЧЕРЕЗ БРАУЗЕР:')
    console.log(` 1. Откройте: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/new`)
    console.log(` 2. В поле "Choose a tag" введите: ${tagName}`)
    console.log(` 3. Перетащите файл установщика мышкой в релиз:`)
    console.log(`    ${installerPath}`)
    console.log(` 4. Нажмите зеленую кнопку "Publish release"!`)
    console.log('----------------------------------------------------')
  }
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
