

# Scrape HTML Search Results Instead of RSS

## Why the Current Approach Cannot Work
The RSS feed endpoint (`/client/rss/hitlist/...`) ignores all pagination parameters (`rw`, `ps`, sort). It always returns the same 300 items. No amount of delays or retries will change this -- the server simply does not support RSS pagination.

## The Solution
The **HTML search results page** (`/client/en_GB/default/search/results?...`) fully supports the `rw` (start row) parameter. I confirmed this by fetching page 1 (`rw=1`) and page 2 (`rw=21`) -- they return different items. It also supports `ps=100` (100 items per page).

This means we can paginate through the entire catalog: ~3,471 DVDs across ~35 pages of 100 items each.

## What Changes

### 1. Update the Edge Function (`fetch-rss/index.ts`)
- Add a new HTML scraping mode alongside the existing RSS parser
- Convert RSS feed URLs to HTML search URLs automatically (swap `/rss/hitlist/` for `/search/results`)
- Parse items from HTML using the structured CSS classes already present: `displayDetailLink` (title), `INITIAL_AUTHOR_SRCH` (author), `PUBDATE` (year), `SD_ILS` IDs (link)
- Extract total result count from the "X Results Found" text on page 1
- Paginate with `ps=100`, incrementing `rw` by 100 each page
- Add a configurable delay between requests (default 2 seconds) to be respectful to the library server
- Keep the existing RSS mode as a fallback

### 2. Update the Frontend Hook (`useRSSFeed.ts`)
- Pass progress updates back to the UI (e.g., "Loading page 3 of 35...")
- Show a progress indicator with estimated items loaded vs total

### 3. Update the UI (`RSSInput.tsx`)
- Show a progress bar during multi-page loads
- Display "Loaded 500 of 3,471 items..." style feedback

### 4. Keep Existing Features
- Multi-URL support and deduplication remain unchanged
- CSV export, search, filter, sort all continue to work
- The user still pastes the same RSS URL -- the backend auto-converts it

## Technical Details
- Page size: `ps=100` (confirmed working)
- Delay between pages: 2 seconds (respectful, ~70 seconds for full DVD catalog)
- Total count parsed from HTML: `"3471 Results Found"` text
- Item data extracted from HTML classes: `displayDetailLink` for title/link, `INITIAL_AUTHOR_SRCH` for author, `PUBDATE` for year, `PUBLISHER` for publisher
- Edge function timeout: Supabase allows up to 150 seconds per invocation, so we may need to chunk into batches if the catalog is very large

