const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

exports.default = async function (context) {
  if (context.electronPlatformName === 'win32') {
    const exeName = `${context.packager.appInfo.productFilename}.exe`
    const exePath = path.join(context.appOutDir, exeName)
    const iconPath = path.resolve(__dirname, '../assets/icon.ico')
    const rceditExe = path.resolve(__dirname, '../node_modules/rcedit/bin/rcedit-x64.exe')

    if (fs.existsSync(exePath) && fs.existsSync(iconPath) && fs.existsSync(rceditExe)) {
      console.log(`[afterPack] Embedding custom icon into: ${exePath}`)
      let success = false
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Small sleep before rcedit to let file handle release
          await new Promise((r) => setTimeout(r, 800))
          execFileSync(
            rceditExe,
            [
              exePath,
              '--set-icon',
              iconPath,
              '--set-version-string',
              'ProductName',
              'VibeLauncher',
              '--set-version-string',
              'FileDescription',
              'VibeLauncher Minecraft Launcher',
              '--set-version-string',
              'CompanyName',
              'VibeLauncher',
              '--set-version-string',
              'LegalCopyright',
              'Copyright © 2026 VibeLauncher',
              '--set-version-string',
              'OriginalFilename',
              'VibeLauncher.exe',
            ],
            { stdio: 'inherit' }
          )
          console.log(`[afterPack] Successfully embedded custom icon into executable!`)
          success = true
          break
        } catch (err) {
          console.warn(`[afterPack] Attempt ${attempt} failed: ${err.message}. Retrying...`)
        }
      }
      if (!success) {
        console.warn(`[afterPack] Warning: Could not patch exe metadata via rcedit, continuing build.`)
      }
    } else {
      console.warn(`[afterPack] Missing file: exe=${fs.existsSync(exePath)}, icon=${fs.existsSync(iconPath)}, rcedit=${fs.existsSync(rceditExe)}`)
    }
  }
}
