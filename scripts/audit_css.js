const fs = require('fs')
const path = require('path')

const componentsDir = path.join(__dirname, '..', 'src', 'components')
const pagesDir = path.join(__dirname, '..', 'src', 'pages')

function audit(dir) {
  const files = fs.readdirSync(dir)
  let totalMissing = 0
  for (const f of files) {
    if (f.endsWith('.jsx')) {
      const base = f.slice(0, -4)
      const cssFile = path.join(dir, base + '.module.css')
      if (fs.existsSync(cssFile)) {
        const jsxContent = fs.readFileSync(path.join(dir, f), 'utf8')
        const cssContent = fs.readFileSync(cssFile, 'utf8')
        const usedClasses = new Set()
        const regex = /styles(?:\.([a-zA-Z0-9_-]+)|\[['"]([^'"]+)['"]\])/g
        let m
        while ((m = regex.exec(jsxContent)) !== null) {
          usedClasses.add(m[1] || m[2])
        }

        const missing = []
        for (const cls of usedClasses) {
          const classDef = new RegExp('\\.' + cls + '(?![a-zA-Z0-9_-])')
          if (!classDef.test(cssContent)) {
            missing.push(cls)
          }
        }
        console.log(f + ': ' + missing.length + ' missing' + (missing.length ? ' -> ' + missing.join(', ') : ' (OK)'))
        totalMissing += missing.length
      }
    }
  }
  return totalMissing
}

console.log('=== Checking Components ===')
const m1 = audit(componentsDir)
console.log('=== Checking Pages ===')
const m2 = audit(pagesDir)

if (m1 + m2 === 0) {
  console.log('SUCCESS: All CSS classes match 100%!')
} else {
  console.error('FAILURE: Found missing classes!')
  process.exit(1)
}
