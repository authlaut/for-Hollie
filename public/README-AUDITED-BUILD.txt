FOR HOLLIE — FULL INTERACTION AUDIT BUILD

This build was made from the exact repository ZIP you uploaded.

FIXED / WIRED:
- Home uses real Supabase counts and latest successful retailer scan; no fake times/counts.
- Deals uses real fh_deals + fh_products + fh_product_variants; no demo products.
- Deal images use retailer primary_image_url; broken/missing images fall back cleanly.
- View Deal opens only the real canonical retailer URL.
- Deal heart adds/removes watchlist entries.
- Search, categories, subcategories, quick filters, sorting, filter sheet, reset, refresh all work.
- Wardrobe uses real Supabase rows only.
- Wardrobe search/category/status/sort filters work.
- Add Item works.
- Edit Item, Remove Item, Mark Received, retailer link work.
- Outfit Owned/Mixed toggles, occasion buttons, Generate and Save work with real data.
- Watchlist is real data; retailer link and remove work.
- Header bell opens Notification Settings.
- Every Settings row opens a working section.
- Fit Profile sizes are editable and save to Supabase.
- Retailer toggles persist per For Hollie profile.
- Rewards can be added and marked redeemed.
- Notification and Style preferences persist.
- Privacy Sign Out works.
- Bottom navigation works.
- Brand/logo returns Home.
- PWA app icon replaced with the improved rose/pink For Hollie icon.

IMPORTANT:
The app will intentionally show NO deal products until the retailer-monitoring pipeline actually inserts real, exact-size-verified deals into Supabase. That is safer than showing fake products or fake links.

INSTALL:
1. Run FOR_HOLLIE_AUDIT_MIGRATION.sql once in the Hollie-and-Me Supabase SQL Editor.
2. Copy the contents of this folder over your local for-hollie repo (do NOT delete your local .env.local).
3. GitHub Desktop: commit all changes, then Push origin.
4. Vercel redeploys automatically.
5. On iPhone, remove the old Home Screen PWA icon and add it again after deployment if iOS keeps the cached old icon.
