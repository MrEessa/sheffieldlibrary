# Sheffield Library Browser

A web app for browsing Sheffield Libraries' CD and DVD catalogue. Paste one or more RSS feed URLs from a Sheffield Libraries catalogue search and the app fetches, deduplicates, and displays all matching items in a searchable, sortable table — complete with cover art from TMDB (DVDs) and MusicBrainz / Cover Art Archive (CDs).

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

1. Go to the [Sheffield Libraries catalogue](https://arena.sheffield.gov.uk)
2. Search for items — for example, filter by format to find all DVDs or all Music CDs
3. On the search results page, look for the **RSS** link (usually in the toolbar or footer) and copy its URL
4. The URL will look something like:
   ```
   https://arena.sheffield.gov.uk/client/rss/hitlist/default/te=ILS&lm=DVD
   ```

You can add multiple RSS URLs (e.g. one for DVDs and one for CDs) — results are combined and deduplicated automatically.

### 2. Load the catalogue

Paste the RSS URL into the input field and click **Load Feeds**. The "Load all records" checkbox (on by default) fetches every page of results. For large collections this can take a minute or two.

### 3. Browse, search, and export

- Use the search box to filter by title, author, year, or ISBN
- Click column headers to sort
- Use the "Per page" selector to control how many rows are shown
- Click the link icon on any row to open the item in the Sheffield Libraries catalogue
- Click **Export CSV** to download the current filtered results

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com)
- **Backend proxy:** [Supabase Edge Functions](https://supabase.com/docs/guides/functions) (Deno)
  - `fetch-rss` — fetches and parses the Sheffield Libraries RSS/HTML catalogue with full pagination
  - `fetch-cover-art` — queries TMDB (DVDs) and MusicBrainz (CDs) for cover images
- **Cover art sources:** [TMDB API](https://developer.themoviedb.org/docs), [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API), [Cover Art Archive](https://coverartarchive.org)

## Local Development

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier is fine)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A [TMDB API key](https://www.themoviedb.org/settings/api) (free) for DVD cover art

### 1. Clone and install

```sh
git clone https://github.com/your-username/sheffieldlibrary.git
cd sheffieldlibrary
npm install
```

### 2. Set up environment variables

```sh
cp .env.example .env
```

Edit `.env` and fill in your Supabase project URL and anon key (both found in the Supabase dashboard under Project Settings → API).

### 3. Deploy the Edge Functions

```sh
supabase login
supabase link --project-ref your-project-id
supabase functions deploy fetch-rss
supabase functions deploy fetch-cover-art
```

Store your TMDB API key as an Edge Function secret:

```sh
supabase secrets set TMDB_API_KEY=your-tmdb-api-key
```

### 4. Run the dev server

```sh
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon (public) key |

The TMDB API key is stored as a Supabase Edge Function secret, not in `.env`.

## Deployment

### Frontend

Build and deploy the `dist/` folder to any static hosting platform (Netlify, Vercel, Cloudflare Pages, etc.):

```sh
npm run build
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables in your hosting platform dashboard.

### Edge Functions

Edge Functions run on Supabase infrastructure and are deployed with the CLI (see step 3 above). No separate hosting needed.

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for significant changes.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Open a pull request

## License

[MIT](LICENSE)
