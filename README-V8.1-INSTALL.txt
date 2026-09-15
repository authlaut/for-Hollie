FOR HOLLIE V8.1 — CLEAN REBUILD

This build starts from the last known-working full For Hollie application and layers the V8 deal-engine changes onto it.

INSTALL
1. Make a backup/commit of your current GitHub folder.
2. Delete the CURRENT project files from your local For Hollie repo EXCEPT the hidden .git folder. This prevents stale V8.0 files from surviving.
3. Copy the CONTENTS of this ZIP into the repo root. package.json, index.html, src, api, public and vercel.json must sit directly in the repository root — not inside another for-hollie-v8.1 folder.
4. Do NOT rerun FOR_HOLLIE_V8_MIGRATION.sql if you already ran the V8 migration successfully.
5. Commit and Push origin in GitHub Desktop.
6. In Vercel Build Logs, the build MUST end with a line beginning: BUILD INTEGRITY OK.
   If the compiled app is accidentally tiny or index.html points to /src/main.jsx, this build intentionally FAILS instead of deploying a white screen.
7. Once Vercel says Ready, open for-hollie.vercel.app in Safari/private window first.

EXPECTED
- Full For Hollie app shell/auth/navigation preserved.
- V8 deal scanner, pricing guardrails, broader deal qualification and feedback UI included.
- Settings contains V8 scanner/health diagnostics.
- Home deal pills deep-link to Deals filters.
- Production deployment uses compiled dist/assets files.

IMPORTANT
If Vercel does not show BUILD INTEGRITY OK, do not troubleshoot the phone. The deployment did not contain the full app.
