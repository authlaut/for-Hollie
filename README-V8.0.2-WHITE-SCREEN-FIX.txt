FOR HOLLIE V8.0.2 — WHITE SCREEN FIX

ROOT CAUSE FOUND:
V8.0.1 added a broad Vercel SPA rewrite. It could intercept Vite's generated /assets/*.js and /assets/*.css requests and return index.html instead of the actual asset. Vercel can still report the deployment as Ready because the build itself succeeds, while the browser receives HTML for JavaScript/CSS and renders a blank white page.

FIX:
- Removed the broad SPA rewrite from vercel.json.
- Restored the known-working Vercel routing structure used by the earlier app.
- Preserved the scheduled /api/scan-retailers cron.
- Preserved all V8/V8.0.1 app, scanner, feedback, health, and database work.
- Package version bumped to 8.0.2.

INSTALL:
1. Copy this package over the current project and replace matching files.
2. Commit and Push in GitHub Desktop.
3. Wait for Vercel deployment to show Ready.
4. Open https://for-hollie.vercel.app directly in Safari and refresh.
5. Do NOT rerun the V8 Supabase migration.

If Safari loads correctly, close/reopen the Home Screen app. Only remove/re-add the Home Screen app if that installed copy alone remains stale.
