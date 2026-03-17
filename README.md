# Promo Catalog Studio

Promo Catalog Studio is a Next.js + Supabase internal tool for turning Excel product sheets into printable A4 promotional catalogs. The workflow is PDF-first, supports Thai content, caches product assets, and includes a manual review queue for image matching.

## What it does

- Upload `.xlsx` product sheets for a new catalog job
- Detect and validate required columns
- Normalize rows and calculate promo discount values
- Match Makro product images with SKU-first scoring and name fallback
- Queue low-confidence items for manual review
- Let users reorder, rename, hide, and style products before export
- Generate deterministic A4 PDFs in a 3x3 layout with server-side rendering
- Store uploads, assets, and generated files in Supabase Storage
- Support a manual flipbook flow by default, with optional Heyzine `client_id` conversion

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Storage
- `xlsx` for workbook parsing
- `pdfkit` with Sarabun fonts for Thai-safe PDF output
- Vercel deployment target

## Project structure

```text
src/
  app/
    (app)/                  Authenticated screens
    api/                    Route handlers for import, search, PDF, files, flipbook
    login/                  Supabase auth entry
  components/
    catalog/                Review, preview, and timeline UI
    layout/                 App shell
    ui/                     Reusable primitives
  lib/
    catalog/                Import, matching, repository, storage, PDF, flipbooks
    supabase/               Browser/server/admin clients and middleware helpers
    auth.ts                 Session gate helpers
    env.ts                  Environment validation
supabase/
  migrations/               Ready-to-run Supabase SQL schema
docs/
  solution-design.md        Architecture, data flow, schema, UX, and implementation notes
  deployment.md             Supabase, Vercel, env, and production setup guide
```

## Key routes

- `/login`
- `/dashboard`
- `/catalogs/new`
- `/catalogs/[jobId]/mapping`
- `/catalogs/[jobId]/review`
- `/catalogs/[jobId]/settings`
- `/catalogs/[jobId]/preview`
- `/catalogs/[jobId]/generate`
- `/catalogs/[jobId]/result`
- `/library`
- `/settings`

## Environment variables

Copy `.env.example` and fill in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MAKRO_BASE_URL=https://www.makro.pro
MAKRO_SEARCH_URL_TEMPLATE=https://www.makro.pro/en/search?q={query}
HEYZINE_API_BASE_URL=https://heyzine.com/api1
HEYZINE_CLIENT_ID=
HEYZINE_API_KEY=
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side storage access, matching cache writes, and signed downloads.
- `HEYZINE_CLIENT_ID` is optional. The app is still fully usable with manual flipbook upload only.
- `HEYZINE_API_KEY` is reserved for future account-level features and is not required by the current implementation.

## Local development

1. Install dependencies with `npm install`
2. Populate `.env.local`
3. Apply [`supabase/migrations/202603160001_initial_schema.sql`](/C:/Users/Teera/OneDrive/Documents/New%20project/supabase/migrations/202603160001_initial_schema.sql) to your Supabase project
4. Run `npm run dev`

Useful checks:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Documentation

- [Solution design](/C:/Users/Teera/OneDrive/Documents/New%20project/docs/solution-design.md)
- [Deployment guide](/C:/Users/Teera/OneDrive/Documents/New%20project/docs/deployment.md)

## Current implementation status

The repository includes:

- production-oriented Next.js app structure
- Supabase SQL migration with RLS and storage bucket setup
- seeded promo and clean templates
- Excel import and normalization flow
- scoring-based Makro asset matching
- manual review and custom image upload path
- deterministic PDF generation with Thai font support
- signed download flow for generated PDFs
- optional Heyzine `client_id` conversion path with manual fallback

The biggest next production step is replacing the current best-effort Makro scraper with a more resilient product data source or a controlled internal asset feed.
