FOR HOLLIE V8.0.3 — VITE/VERCEL DEPLOY FIX

This build fixes the blank white screen caused by Vercel serving /src/main.jsx directly as text/jsx instead of deploying Vite's compiled dist output.

WHAT CHANGED
- vercel.json explicitly sets framework: vite
- installCommand: npm install
- buildCommand: npm run build
- outputDirectory: dist
- SPA rewrite excludes /api, /assets, and files with extensions
- app version bumped to 8.0.3
- added modern mobile-web-app-capable meta tag

INSTALL
1. Copy ALL files/folders from this package over the current GitHub project and replace matching files.
2. Commit and push in GitHub Desktop.
3. In Vercel, the new deployment Build Logs should contain "vite build" and "dist/index.html" / "dist/assets/..." output.
4. Do NOT rerun the Supabase V8 migration.
5. Open the production URL in a private/incognito browser first.

IMPORTANT VERCEL PROJECT SETTING
If the project has an Output Directory override set manually in Vercel, it can override/contradict the repository configuration. In Project Settings > Build and Deployment, Framework Preset should be Vite (or auto-detected) and Output Directory should not be set to the repository root/public. The deployed output must be dist.

SUCCESS CHECK
In browser DevTools > Network, the app should load a hashed /assets/*.js file. It should NOT request /src/main.jsx from production.
