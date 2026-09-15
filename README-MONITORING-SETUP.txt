FOR HOLLIE — PRODUCT IMAGE IMPORT + RETAILER MONITORING

WHAT THIS BUILD ADDS
1. Wardrobe product image import:
   - Paste a supported retailer product URL.
   - Tap Import from Product URL.
   - The server reads public product metadata/structured data.
   - Up to 6 usable retailer product images are cached into Supabase Storage.
   - Tap any imported image to choose the primary Wardrobe image.
   - You can always use Upload Image from Photos/Files instead.

2. Retailer monitoring:
   - The server checks enabled retailers using public product pages/sitemaps.
   - It stores product names, URLs, images, prices and explicit size/in-stock data when exposed by the retailer.
   - It only creates a visible deal when Hollie's matching size is explicitly verified as in stock.
   - Price history is recorded.
   - Deals page now has Scan Retailers for a manual scan.
   - Vercel cron is configured daily as a safe default for Hobby accounts.
   - An optional GitHub Actions workflow is included for every-4-hour scanning.

IMPORTANT LIMITATION
Retailers can change markup, block automated requests, or hide size inventory behind browser APIs. The scanner deliberately refuses to call a size verified if it cannot see explicit size + availability data. This may mean some stores return fewer deals rather than false deals.

SETUP
A) Supabase
Run FOR_HOLLIE_MONITORING_MIGRATION.sql once in Supabase SQL Editor.

B) Vercel environment variables
Keep your existing:
  VITE_SUPABASE_URL
  VITE_SUPABASE_PUBLISHABLE_KEY

Add server-only variables:
  SUPABASE_URL                 = same Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    = Supabase service_role / secret server key
  CRON_SECRET                  = create a long random string

IMPORTANT: SUPABASE_SERVICE_ROLE_KEY must be added ONLY in Vercel Environment Variables. Never put it in .env files committed to GitHub and never prefix it VITE_.

C) Deploy
Copy this build over the repo, commit, push, let Vercel redeploy.

D) Every 4 hours (optional)
Vercel Hobby currently restricts cron frequency, so this build's vercel.json uses a daily scan that deploys safely on Hobby.
For 4-hour scans, use the included .github/workflows/for-hollie-scan.yml and add these GitHub repository secrets:
  FOR_HOLLIE_CRON_SECRET = exactly the same value as Vercel CRON_SECRET
  FOR_HOLLIE_SCAN_URL     = your production site origin, for example https://for-hollie.vercel.app

Then GitHub Actions triggers the secured endpoint about every 4 hours. You can also tap Scan Retailers manually in Deals.
