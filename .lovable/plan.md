

# Add Cover Art Column

## Overview
Add a cover art thumbnail column to the catalog table. DVDs use TMDB, CDs use MusicBrainz/Cover Art Archive. Covers load lazily per visible page to avoid rate limits.

## Steps

### 1. Store TMDB API key as a backend secret
Use the `add_secret` tool to request your TMDB API key (stored securely, accessed only by the backend function).

### 2. Update data model (`src/types/cd-item.ts`)
- Add `coverUrl?: string` to `CDItem`
- Add `mediaType?: 'dvd' | 'cd' | 'unknown'`

### 3. Create new Edge Function `fetch-cover-art`
- Accepts `{ titles: { title: string, author: string }[], mediaType: string }`
- **DVDs**: Search TMDB `/search/movie?query={title}` using the stored API key, return `w92` poster URL
- **CDs**: Search MusicBrainz release API by title+artist, then fetch Cover Art Archive URL (no key needed)
- Returns `{ covers: Record<string, string> }` mapping title to image URL
- Rate limiting: TMDB allows 40 req/s; MusicBrainz requires 1 req/s with custom User-Agent

### 4. Auto-detect media type in `fetch-rss/index.ts`
- Parse the URL for `lm=DVD`, `lm=MUSICCD`, etc.
- Return `mediaType` field in the response alongside items

### 5. Add cover-fetching hook (`src/hooks/useCoverArt.ts`)
- Takes the current page of items + mediaType
- Calls `fetch-cover-art` edge function with batched titles
- Caches results in a `Map<string, string>` so revisiting pages doesn't re-fetch
- Returns `coverMap: Map<string, string>` and `isLoadingCovers: boolean`

### 6. Update table UI (`CDTable.tsx`)
- Add narrow "Cover" column (48px) to the left of Title
- Show skeleton placeholder while loading
- Display thumbnail (DVD: 48x71 poster ratio; CD: 48x48 square)
- Fallback icon (Film or Disc) when no cover found
- Trigger cover fetch whenever the visible page changes

### 7. Update `useRSSFeed.ts`
- Pass `mediaType` through from edge function response to the UI

## Technical Notes
- TMDB poster URL format: `https://image.tmdb.org/t/p/w92/{poster_path}`
- MusicBrainz requires `User-Agent: LibraryCDBrowser/1.0 (contact@email.com)`
- Covers fetched only for visible page (25-100 items), not all thousands
- Cover cache persists in component state across page changes

