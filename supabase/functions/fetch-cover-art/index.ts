import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoverRequest {
  titles: { title: string; author: string }[];
  mediaType: string;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTMDBCover(title: string, apiKey: string): Promise<string | null> {
  try {
    // Clean title: remove year in parentheses, trailing articles, etc.
    const cleanTitle = title
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/\s*\[.*?\]\s*/g, '')
      .replace(/,\s*(the|a|an)\s*$/i, '')
      .trim();

    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&page=1`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      await response.text();
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0 && data.results[0].poster_path) {
      return `https://image.tmdb.org/t/p/w92${data.results[0].poster_path}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchMusicBrainzCover(title: string, artist: string): Promise<string | null> {
  try {
    const query = artist
      ? `release:${encodeURIComponent(title)} AND artist:${encodeURIComponent(artist)}`
      : `release:${encodeURIComponent(title)}`;
    
    const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${query}&limit=1&fmt=json`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'LibraryCDBrowser/1.0 (sheffield-library-browser@lovable.app)',
      },
    });

    if (!response.ok) {
      await response.text();
      return null;
    }

    const data = await response.json();
    if (data.releases && data.releases.length > 0) {
      const mbid = data.releases[0].id;
      // Try Cover Art Archive
      const coverResponse = await fetch(`https://coverartarchive.org/release/${mbid}`, {
        headers: {
          'User-Agent': 'LibraryCDBrowser/1.0 (sheffield-library-browser@lovable.app)',
        },
      });

      if (coverResponse.ok) {
        const coverData = await coverResponse.json();
        if (coverData.images && coverData.images.length > 0) {
          return coverData.images[0].thumbnails?.small || coverData.images[0].image;
        }
      } else {
        await coverResponse.text();
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchOpenLibraryCover(title: string, author: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ limit: '1', fields: 'cover_i' });
    if (title) params.set('title', title);
    if (author) params.set('author', author);

    const searchUrl = `https://openlibrary.org/search.json?${params.toString()}`;
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'LibraryCDBrowser/1.0 (sheffield-library-browser@lovable.app)' },
    });

    if (!response.ok) {
      await response.text();
      return null;
    }

    const data = await response.json();
    if (data.docs && data.docs.length > 0 && data.docs[0].cover_i) {
      return `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-M.jpg`;
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { titles, mediaType } = await req.json() as CoverRequest;

    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'titles array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const covers: Record<string, string> = {};
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');

    if (mediaType === 'dvd' && TMDB_API_KEY) {
      for (let i = 0; i < titles.length; i++) {
        const { title } = titles[i];
        const coverUrl = await fetchTMDBCover(title, TMDB_API_KEY);
        if (coverUrl) {
          covers[title] = coverUrl;
        }
        if ((i + 1) % 5 === 0 && i < titles.length - 1) {
          await delay(150);
        }
      }
    } else if (mediaType === 'cd') {
      for (let i = 0; i < titles.length; i++) {
        const { title, author } = titles[i];
        const coverUrl = await fetchMusicBrainzCover(title, author);
        if (coverUrl) {
          covers[title] = coverUrl;
        }
        if (i < titles.length - 1) {
          await delay(1100);
        }
      }
    } else if (mediaType === 'book') {
      for (let i = 0; i < titles.length; i++) {
        const { title, author } = titles[i];
        const coverUrl = await fetchOpenLibraryCover(title, author);
        if (coverUrl) {
          covers[title] = coverUrl;
        }
        if (i < titles.length - 1) {
          await delay(500);
        }
      }
    }

    console.log(`Fetched ${Object.keys(covers).length} covers for ${titles.length} titles (${mediaType})`);

    return new Response(
      JSON.stringify({ covers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
