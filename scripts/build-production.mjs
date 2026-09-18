import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { rm, mkdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')
await rm(dist, { recursive: true, force: true })
await mkdir(resolve(dist, 'assets'), { recursive: true })

// Build JS/CSS directly from the React entry. This intentionally bypasses
// Vite's HTML-entry transform because Vercel was emitting an HTML file that
// still referenced /src/main.jsx in production.
await build({
  root,
  configFile: false,
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: dist,
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(root, 'src/main.jsx'),
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'assets/app.css'
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})

let html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f1018" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="For Hollie" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" type="image/png" href="/icon-192.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <title>For Hollie</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`
await writeFile(resolve(dist, 'index.html'), html)

// Copy public assets exactly as Vite normally would.
await cp(resolve(root, 'public'), dist, { recursive: true, force: true })

console.log('Production build complete. Entry: dist/assets/app.js')
