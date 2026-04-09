# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
```

To run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

## Architecture

**Sheffield Library Browser** is a React/TypeScript SPA that lets users paste Sheffield Libraries catalogue RSS URLs and browse the full results with cover art.

### Data Flow

```
Browser → Supabase Edge Functions (Deno proxy) → Sheffield Libraries HTML / TMDB API / MusicBrainz API
```

The frontend never calls external APIs directly — all third-party requests go through two Supabase Edge Functions to avoid CORS:

- **`supabase/functions/fetch-rss/`** — Converts the Sheffield Libraries RSS URL to an HTML search URL, then scrapes all pages (100 items/page, 1s delay between pages). Falls back to Atom XML parsing for non-library URLs. Detects media type (`dvd`/`cd`) from URL params (`lm=DVD`, `lm=MusicCD`, etc.).
- **`supabase/functions/fetch-cover-art/`** — Accepts a batch of `{title, author}` objects. For DVDs: queries TMDB (`w92` poster thumbnails), batched with 150ms delay every 5 requests. For CDs: queries MusicBrainz then Cover Art Archive, with a mandatory 1100ms delay between requests to respect rate limits.

### Frontend

- **`src/pages/Index.tsx`** — Single page; composes `RSSInput` + `CDTable`, wired through `useRSSFeed`.
- **`src/hooks/useRSSFeed.ts`** — Manages feed fetching state. Iterates over multiple URLs sequentially, deduplicates by `item.link` (or `title-author` fallback), and tracks per-feed progress.
- **`src/hooks/useCoverArt.ts`** — Fetches covers lazily for only the currently *visible* page of items. Uses a `ref`-based cache (`cacheRef`, `fetchedTitlesRef`) so covers aren't re-requested on re-renders or pagination.
- **`src/components/CDTable.tsx`** — Sortable/searchable table with pagination. Passes visible items to `useCoverArt`.
- **`src/types/cd-item.ts`** — Core `CDItem` interface and `SortField`/`SortDirection` types.
- **`src/utils/csv-export.ts`** — CSV export utility for filtered results.

### Key Design Decisions

- **`@` path alias** maps to `src/` — use `@/components/...`, `@/hooks/...`, etc.
- **shadcn/ui** components live in `src/components/ui/` — treat these as vendored, not custom code.
- Supabase client is in `src/integrations/supabase/client.ts` and reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from env.
- The `fetch-cover-art` Edge Function reads `TMDB_API_KEY` from Deno environment secrets (set via Supabase dashboard).

### Environment

The frontend requires a `.env` (or Lovable-managed env) with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Edge Functions are deployed via Supabase CLI. `TMDB_API_KEY` is a Supabase secret.
