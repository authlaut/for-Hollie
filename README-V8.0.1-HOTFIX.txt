FOR HOLLIE V8.0.1 STARTUP HOTFIX

What was fixed:
1. Corrected a JSX/JavaScript syntax defect in src/pages/Deals.jsx in the Not Accurate feedback handler.
2. Added an app-level ErrorBoundary so a future runtime exception shows a readable error instead of a blank white screen.
3. Added compatibility with either VITE_SUPABASE_PUBLISHABLE_KEY or the older VITE_SUPABASE_ANON_KEY environment variable.
4. Added SPA fallback routing in vercel.json while preserving the retailer-scan API and cron.
5. Bumped package version to 8.0.1.

INSTALL
- Copy the contents of this ZIP over the current For Hollie repository, replacing matching files.
- Do NOT rerun FOR_HOLLIE_V8_MIGRATION.sql if you already ran it successfully.
- Commit and push to GitHub.
- Wait for Vercel deployment to show Ready.
- Open the site in Safari and reload it.

If another runtime issue exists, V8.0.1 should now display the actual startup error on-screen instead of a blank white page.
