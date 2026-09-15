FOR HOLLIE — RETAILER SIZE ADAPTERS V3

WHAT CHANGED
- Adds retailer-aware variant extraction.
- Glamorise, Universal Standard, and BloomChic try Shopify /products/...js data first.
- All retailers also inspect embedded application/json / Next-style product state.
- ELOQUII benefits from embedded variation/orderable parsing.
- Keeps exact-size requirement; no unverified size is promoted into the Deals feed.
- Scan diagnostics now show variants read, size matches, verified sizes, and deals.
- Manual scan checks more products per retailer.

INSTALL
Copy only:
  api/
  src/pages/Deals.jsx

No new Supabase SQL is required.
No Vercel environment-variable changes are required.

Commit suggestion:
  Add retailer-specific size verification adapters

After Vercel redeploys:
Deals > Scan Retailers
Then send the complete diagnostic result if any retailer still shows 0 verified sizes.