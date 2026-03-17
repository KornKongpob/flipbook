# Deployment Guide

## 1. Deployment targets

- Application hosting: Vercel
- Database, auth, and storage: Supabase
- Optional downstream publishing: Heyzine `client_id` conversion

## 2. Supabase setup

### Create the project

1. Create a new Supabase project.
2. Copy the project URL and anon key.
3. Generate a service role key for server-side operations.

### Apply the schema

Run the SQL in [`supabase/migrations/202603160001_initial_schema.sql`](/C:/Users/Teera/OneDrive/Documents/New%20project/supabase/migrations/202603160001_initial_schema.sql) against the project.

This migration creates:

- enum types
- all required tables
- indexes
- `updated_at` triggers
- RLS policies
- storage buckets
- seeded promo and clean templates

### Auth configuration

Recommended for internal business use:

- enable email/password
- restrict sign-up if the app is internal-only
- configure allowed redirect URLs for local and Vercel environments
- create `profiles` rows as part of your onboarding flow or auth webhook

### Storage buckets

Buckets created by the migration:

- `raw-uploads`
- `asset-cache`
- `generated-pdfs`
- `manual-assets`

Operational note:

- `asset-cache` is meant for service-role-managed writes
- raw uploads, manual assets, and generated PDFs are private buckets
- downloads should go through signed URLs, not public exposure

## 3. Environment variables

Set these in Vercel and your local `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MAKRO_BASE_URL=https://www.makro.pro
MAKRO_SEARCH_URL_TEMPLATE=https://www.makro.pro/en/search?q={query}
HEYZINE_API_BASE_URL=https://heyzine.com/api1
HEYZINE_CLIENT_ID=
HEYZINE_API_KEY=
```

Variable guidance:

- `NEXT_PUBLIC_APP_URL`: the canonical app URL used for redirects and links
- `SUPABASE_SERVICE_ROLE_KEY`: required in production
- `HEYZINE_CLIENT_ID`: optional, only needed for automated conversion
- `HEYZINE_API_KEY`: not used by the current app path, keep empty unless you extend provider features

## 4. Vercel setup

### Create the project

1. Import the Git repository into Vercel.
2. Set the framework preset to Next.js.
3. Add all required environment variables.
4. Deploy.

### Runtime notes

- PDF generation runs in the Node runtime, not the Edge runtime.
- The app already sets `export const runtime = "nodejs"` for routes that need filesystem buffers or `pdfkit`.
- Sarabun fonts are bundled in the repository under `src/assets/fonts`.

### Recommended Vercel settings

- enable production branch protection
- enable preview deployments for review
- use the default build command: `npm run build`
- set the install command to `npm install`

## 5. Local development

1. Install dependencies with `npm install`
2. Create `.env.local`
3. Apply the Supabase migration
4. Run `npm run dev`
5. Sign in with a seeded auth user

Verification commands:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 6. Operational checklist

Before go-live:

- verify `profiles` rows are created for all internal users
- verify storage buckets exist and are private
- verify manual mapping reuse behaves correctly across repeat imports
- verify large PDFs stay below your storage and response size expectations
- verify Makro fetch behavior from the deployed region
- verify the result page downloads generated PDFs via signed URLs
- verify the manual flipbook fallback is documented for operators

## 7. Security checklist

- keep `SUPABASE_SERVICE_ROLE_KEY` server-only
- never expose private storage buckets publicly
- keep RLS enabled on all business tables
- restrict internal access using Supabase Auth and profile roles
- log job failures in `catalog_job_events` and `catalog_jobs.error_message`

## 8. Recommended production extensions

- scheduled cleanup for stale raw uploads and superseded PDFs
- audit trail for template changes and manual mapping edits
- Sentry or similar monitoring for import and generation failures
- rate limiting or queueing for very large batch imports
- controlled internal asset feed to reduce scraping brittleness
