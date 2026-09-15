FOR HOLLIE V8.0 — SUPER RECONSTRUCTION

IMPORTANT: This ZIP is a complete project build. Back up your current repo first.

INSTALL
1. Extract this ZIP.
2. Copy ALL project files into your existing For Hollie repository root, preserving folders. Replace matching files.
3. In Supabase > SQL Editor, run FOR_HOLLIE_V8_MIGRATION.sql ONCE. This creates V8 feedback/quarantine/system-version support and disables impossible historical prices.
4. In GitHub Desktop, confirm multiple V8 files changed. Commit: "For Hollie V8 super reconstruction" and Push origin.
5. Wait for Vercel to show Ready.
6. Fully close/reopen the installed web app. Settings > About For Hollie must say 8.0.0.
7. Go to Settings > Deal Scanner & Health and tap Run System Check. Database schema, Watchlist access, Feedback access and Scanner records should all pass.
8. Only after that, go to Deals and run Scan Retailers once.

WHAT CHANGED
- Final read-time price sanity guard: impossible legacy deals are hidden even before database cleanup.
- V8 SQL also invalidates impossible historical feed records.
- Broad retailer-specific scanner retained with rotating catalog coverage.
- 25–49% worthwhile deals can qualify; 70%+ is only a filter.
- Exact-size + verified-in-stock remains required.
- Not Accurate now surfaces database errors instead of silently failing and saves suppression feedback.
- Watch remains database-backed.
- Scan debug detail moved off Deals; Settings > Deal Scanner & Health shows retailer status/metrics.
- Home Exceptional and New pills deep-link into Deals with those filters active.
- Settings > About shows V8 app/engine/database identity.
- System Check verifies V8 schema-access pieces.

NOTE
The first V8 scan may show fewer deals while old bad records are removed and products are reverified. Subsequent rotating scans broaden coverage.
