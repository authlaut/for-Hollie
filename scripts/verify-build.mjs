import fs from 'node:fs'
import path from 'node:path'
const assets='dist/assets'
if (!fs.existsSync('dist/index.html')) throw new Error('BUILD INTEGRITY FAILED: dist/index.html missing')
if (!fs.existsSync(assets)) throw new Error('BUILD INTEGRITY FAILED: dist/assets missing')
const js=fs.readdirSync(assets).filter(f=>f.endsWith('.js'))
if (!js.length) throw new Error('BUILD INTEGRITY FAILED: no compiled JavaScript bundle')
const sizes=js.map(f=>({f,size:fs.statSync(path.join(assets,f)).size}))
const total=sizes.reduce((a,b)=>a+b.size,0)
if (total < 50000) throw new Error(`BUILD INTEGRITY FAILED: compiled JS is only ${total} bytes; full For Hollie app was not bundled`)
const html=fs.readFileSync('dist/index.html','utf8')
if (html.includes('/src/main.jsx')) throw new Error('BUILD INTEGRITY FAILED: production HTML still references raw /src/main.jsx')
console.log(`BUILD INTEGRITY OK: ${js.length} JS bundle(s), ${Math.round(total/1024)} KB total`)
