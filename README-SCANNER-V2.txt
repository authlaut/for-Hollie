FOR HOLLIE — RETAILER SCANNER V2

Why this version exists
The first monitoring pass could run successfully but still return zero deals because it sampled too few sitemap products and relied almost entirely on structured variant JSON. Several retailers render sale prices and size availability in ordinary page markup instead.

What changed
- Sale/clearance/category pages are scanned before broad sitemap products.
- More product candidates are checked per retailer.
- Product pages are fetched concurrently to stay within serverless runtime limits.
- Price parsing now recognizes sale/regular pairs such as Torrid's "Comp. Value" markup.
- Exact-size parsing checks JSON data plus product-page controls/options and selected-size markup.
- Out-of-stock exact sizes deactivate an existing deal instead of leaving it stale.
- The Deals screen reports diagnostics after a manual scan: products checked, sale candidates, exact sizes verified, and qualifying deals by retailer.
- The feed remains conservative: an item still needs an exact matching size verified in stock before it can appear.

INSTALL
No new SQL migration is required for Scanner V2 if FOR_HOLLIE_MONITORING_MIGRATION.sql was already run.

Copy these over the current repo:
- api/   (replace the entire api folder)
- src/pages/Deals.jsx

Or copy the entire build over your repo, preserving .env.local.

Commit and push. Vercel will redeploy.

After deployment:
Deals > Scan Retailers
The scan message now tells you where products are being filtered out rather than only returning a zero.
