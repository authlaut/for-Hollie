FOR HOLLIE v8.4.0
See V8.4.0-README-FIRST.txt before deploying.

FOR HOLLIE — START HERE (NO TERMINAL)

1) In GitHub Desktop:
   File > New Repository
   Name: for-hollie
   Choose the folder location you want.

2) Open the new repository folder:
   Repository > Show in Explorer / Finder.

3) Copy EVERYTHING from this starter package into that GitHub folder.

4) Back in GitHub Desktop:
   Summary: Initial For Hollie app
   Commit to main
   Publish repository
   Keep this code private: ON

5) In Supabase:
   Open the existing Supabase project you want to share with your other Hollie app.
   Open SQL Editor > New query.
   Paste the entire contents of FOR_HOLLIE_SCHEMA.sql and click Run.

6) In the local for-hollie folder:
   Make a copy of .env.example and rename it .env.local.
   Replace the two placeholder values with:
     - your Supabase Project URL
     - your Supabase Publishable Key
   DO NOT commit .env.local. It is already ignored by Git.

7) In Vercel:
   Add New > Project > import the private GitHub repo "for-hollie".
   Framework should detect as Vite.
   Add Environment Variables:
     VITE_SUPABASE_URL
     VITE_SUPABASE_PUBLISHABLE_KEY
   Deploy.

8) Create your login:
   In Supabase Authentication > Users, create one email/password user for yourself.
   Then use that account on the For Hollie login screen.

9) After deployment:
   Open the Vercel URL in Safari on iPhone.
   Share > Add to Home Screen.
   The PWA icon and standalone app shell are already included.

This starter intentionally contains a polished shell plus demo data so the design works before live retailer monitoring is connected.