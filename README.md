# Sheffield Library Browser

A web app for browsing Sheffield Libraries' books, CD and DVD catalogue. Paste one or more RSS feed URLs from a Sheffield Libraries catalogue search and the app fetches, deduplicates, and displays all matching items in a searchable, sortable table - complete with cover art from TMDB (DVDs) and MusicBrainz / Cover Art Archive (CDs).

## Features

- Paste one or more RSS feed URLs from Sheffield Libraries catalogue searches
- Fetches all pages of results automatically (not just the first 10)
- Deduplicates results across multiple feeds
- Cover art for DVDs via [The Movie Database (TMDB)](https://www.themoviedb.org), for CDs via [MusicBrainz](https://musicbrainz.org) / [Cover Art Archive](https://coverartarchive.org)
- Sortable columns: title, author/artist, year, ISBN
- Full-text search across title, author, year, and ISBN
- Configurable page size (25 / 50 / 100 / all)
- Export filtered results to CSV
- Links back to item pages on the Sheffield Libraries catalogue

## How to Use

### 1. Get an RSS feed URL from Sheffield Libraries

1. Go to the [Sheffield Libraries catalogue](https://library.sheffield.gov.uk/)
2. Search for items - for example, filter by format to find all DVDs or all Music CDs
3. On the search results page, look for the **RSS** link (usually in the toolbar or footer) and copy its URL
4. The URL will look something like:
   ```
   https://library.sheffield.gov.uk/client/rss/hitlist/default/te=ILS&lm=DVD
   ```

You can add multiple RSS URLs (e.g. one for DVDs and one for CDs) - results are combined and deduplicated automatically.

### 2. Load the catalogue

Paste the RSS URL into the input field and click **Load Feeds**. The "Load all records" checkbox (on by default) fetches every page of results. For large collections this can take a minute or two.

### 3. Browse, search, and export

- Use the search box to filter by title, author, year, or ISBN
- Click column headers to sort
- Use the "Per page" selector to control how many rows are shown
- Click the link icon on any row to open the item in the Sheffield Libraries catalogue
- Click **Export CSV** to download the current filtered results


## Screenshots Flow
<img width="1019" height="559" alt="image" src="https://github.com/user-attachments/assets/d0a0a582-bb58-4a2d-871b-78cd8f00355b" />
<img width="1042" height="782" alt="image" src="https://github.com/user-attachments/assets/2e6bbda0-8f5b-413d-86a2-36ab84577350" />
<img width="1033" height="508" alt="image" src="https://github.com/user-attachments/assets/fc7ce726-3e9a-406a-8e73-f2655089982f" />
<img width="1315" height="883" alt="image" src="https://github.com/user-attachments/assets/f465d4e4-5b6b-4856-8f95-44a672b2d5a8" />
<img width="1011" height="923" alt="image" src="https://github.com/user-attachments/assets/048dff0a-c16b-4f62-a169-3ec06e571c00" />




## License & Attribution

This project is for **personal, non-commercial use only**. Cover art is sourced from [The Movie Database (TMDB)](https://www.themoviedb.org) using a personal API key under TMDB's non-commercial terms — this application is not endorsed by or affiliated with TMDB. Cover art for CDs is sourced from [MusicBrainz](https://musicbrainz.org) and [Cover Art Archive](https://coverartarchive.org). This tool is intended purely as a browsing aid for the Sheffield Libraries catalogue and **must not be used for any commercial purpose**.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com)
- **Backend proxy:** [Supabase Edge Functions](https://supabase.com/docs/guides/functions) (Deno)
  - `fetch-rss` — fetches and parses the Sheffield Libraries RSS/HTML catalogue with full pagination
  - `fetch-cover-art` — queries TMDB (DVDs) and MusicBrainz (CDs) for cover images
- **Cover art sources:** [TMDB API](https://developer.themoviedb.org/docs), [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API), [Cover Art Archive](https://coverartarchive.org)
