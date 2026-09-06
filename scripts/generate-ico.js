const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const pngToIcoModule = require('png-to-ico')
const pngToIco = pngToIcoModule.default || pngToIcoModule

async function makeMultiLayerIco() {
  const srcPng = path.resolve(__dirname, '../assets/icon.png')
  const outDir = path.resolve(__dirname, '../dist_ico_tmp')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const tempFiles = []

  for (const size of sizes) {
    const tmpPath = path.join(outDir, `icon_${size}.png`)
    await sharp(srcPng)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(tmpPath)
    tempFiles.push(tmpPath)
  }

  const icoBuf = await pngToIco(tempFiles)
  
  // Write to assets/icon.ico, public/icon.ico, public/favicon.ico, dist/icon.ico
  const destinations = [
    path.resolve(__dirname, '../assets/icon.ico'),
    path.resolve(__dirname, '../public/icon.ico'),
    path.resolve(__dirname, '../public/favicon.ico'),
    path.resolve(__dirname, '../dist/icon.ico'),
  ]

  for (const dest of destinations) {
    const dir = path.dirname(dest)
    if (fs.existsSync(dir)) {
      fs.writeFileSync(dest, icoBuf)
      console.log(`Wrote multi-layer ICO (${icoBuf.length} bytes) to: ${dest}`)
    }
  }

  // Clean up temp
  fs.rmSync(outDir, { recursive: true, force: true })
  console.log('Successfully generated full Windows-compatible multi-resolution ICO!')
}

makeMultiLayerIco().catch(err => {
  console.error('Error generating ico:', err)
  process.exit(1)
})
