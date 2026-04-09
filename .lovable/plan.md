

# Add Book Cover Art via Open Library

## Problem
The book RSS URL (e.g. `qf=FORMAT%09Format%09BOOK%09Books`) returns `mediaType: 'unknown'` because `detectMediaType` only checks for DVD and CD patterns. This means `useCoverArt` skips cover fetching entirely (line 49: `mediaType === 'unknown'` returns early).

## Best Option: Open Library Covers API
**Open Library** (openlibrary.org) is the ideal choice:
- Completely free, no API key needed
- Huge catalog (millions of books)
- Supports lookup by ISBN, title, or OLID
- Direct image URLs: `https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg`
- Search API: `https://openlibrary.org/search.json?title={title}&author={author}&limit=1`
- No strict rate limiting (just be respectful, ~1 req/s recommended)

Other options (Google Books API, LibraryThing) either require API keys or have restrictive terms.

## Changes

### 1. Detect books in `fetch-rss/index.ts`
Add `'book'` to `detectMediaType`:
- Match `format%09book` or `lm=book` (case-insensitive) in the URL
- Update `CDItem.mediaType` type to include `'book'`

### 2. Add Open Library lookup in `fetch-cover-art/index.ts`
New function `fetchOpenLibraryCover(title, author)`:
- First try ISBN if available (direct URL, no API call needed)
- Otherwise search by title+author via `openlibrary.org/search.json?title=...&author=...&limit=1&fields=cover_i`
- If `cover_i` exists, return `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg`
- Add `else if (mediaType === 'book')` branch with 500ms delay between requests

### 3. Update `CDItem` type
Add `'book'` to the `mediaType` union: `'dvd' | 'cd' | 'book' | 'unknown'`

### 4. Update `useCoverArt.ts`
Remove the `mediaType === 'unknown'` early return guard -- it already won't be `'unknown'` for books once detection works, but no change needed here.

### 5. Update `CDTable.tsx`
- Add a `BookOpen` icon import from lucide-react as the fallback for books
- Book covers use portrait aspect ratio (same as DVDs)
- Hover preview uses the `-L.jpg` size variant for books

## Summary
Five small, targeted edits. No new API keys required. Open Library is the standard open-source book cover source used by most library tools.

