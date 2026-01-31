import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CDItem {
  title: string;
  author: string;
  year: string;
  isbn: string;
  link: string;
}

const PAGE_SIZE = 300;
const MAX_PAGES = 50; // Safety limit to prevent infinite loops

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&#\d+;/g, '');
}

function extractFromContent(content: string): { author: string; year: string; isbn: string } {
  const decoded = decodeHtmlEntities(content);
  
  // Extract author - look for "by" pattern or author field
  let author = '';
  const authorMatch = decoded.match(/by\s+([^<\n]+)/i) || 
                      decoded.match(/<b>Author:<\/b>\s*([^<]+)/i) ||
                      decoded.match(/Author:\s*([^<\n]+)/i);
  if (authorMatch) {
    author = authorMatch[1].trim();
  }
  
  // Extract year from publication info
  let year = '';
  const yearMatch = decoded.match(/(\d{4})/);
  if (yearMatch) {
    year = yearMatch[1];
  }
  
  // Extract ISBN
  let isbn = '';
  const isbnMatch = decoded.match(/ISBN[:\s]*([0-9X-]+)/i) ||
                    decoded.match(/\b(\d{10}|\d{13})\b/);
  if (isbnMatch) {
    isbn = isbnMatch[1].trim();
  }
  
  return { author, year, isbn };
}

function parseAtomFeed(xml: string): CDItem[] {
  const items: CDItem[] = [];
  
  // Match all entry elements
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryContent = match[1];
    
    // Extract title - remove "First Title value, for Searching" prefix if present
    const titleMatch = entryContent.match(/<title[^>]*>([^<]*)<\/title>/);
    let title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
    title = title.replace(/^First Title value, for Searching\s*/i, '').trim();
    
    // Extract link
    const linkMatch = entryContent.match(/<link[^>]*href="([^"]*)"[^>]*\/>/);
    const link = linkMatch ? linkMatch[1] : '';
    
    // Extract content for author, year, ISBN
    const contentMatch = entryContent.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    const content = contentMatch ? contentMatch[1] : '';
    
    const { author, year, isbn } = extractFromContent(content);
    
    // Clean author - remove leading whitespace entities and trailing "author." text
    const cleanedAuthor = author.trim().replace(/,?\s*author\.?$/i, '').trim();
    
    if (title) {
      items.push({
        title,
        author: cleanedAuthor,
        year,
        isbn,
        link
      });
    }
  }
  
  return items;
}

function buildPaginatedUrl(baseUrl: string, startRow: number): string {
  const url = new URL(baseUrl);
  // Set page size to max (300) and starting row
  url.searchParams.set('ps', String(PAGE_SIZE));
  url.searchParams.set('rw', String(startRow));
  return url.toString();
}

async function fetchPage(url: string): Promise<{ items: CDItem[]; success: boolean }> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/atom+xml, application/rss+xml, application/xml, text/xml',
        'User-Agent': 'LibraryCDBrowser/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch: ${response.status}`);
      return { items: [], success: false };
    }

    const xml = await response.text();
    const items = parseAtomFeed(xml);
    return { items, success: true };
  } catch (error) {
    console.error('Error fetching page:', error);
    return { items: [], success: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, fetchAll = false } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'RSS feed URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching RSS feed from: ${url}, fetchAll: ${fetchAll}`);
    
    if (!fetchAll) {
      // Single page fetch (original behavior)
      const { items, success } = await fetchPage(url);
      
      if (!success) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch RSS feed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Parsed ${items.length} items from feed`);
      return new Response(
        JSON.stringify({ items, total: items.length, pages: 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all pages
    const allItems: CDItem[] = [];
    let currentPage = 1;
    let startRow = 1;
    
    while (currentPage <= MAX_PAGES) {
      const paginatedUrl = buildPaginatedUrl(url, startRow);
      console.log(`Fetching page ${currentPage}, starting at row ${startRow}`);
      
      const { items, success } = await fetchPage(paginatedUrl);
      
      if (!success) {
        console.error(`Failed to fetch page ${currentPage}`);
        break;
      }
      
      console.log(`Page ${currentPage}: got ${items.length} items`);
      
      if (items.length === 0) {
        // No more results
        break;
      }
      
      allItems.push(...items);
      
      if (items.length < PAGE_SIZE) {
        // Last page (fewer results than page size)
        break;
      }
      
      startRow += PAGE_SIZE;
      currentPage++;
    }

    console.log(`Total: ${allItems.length} items across ${currentPage} pages`);

    return new Response(
      JSON.stringify({ items: allItems, total: allItems.length, pages: currentPage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing RSS feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
