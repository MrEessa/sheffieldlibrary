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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'RSS feed URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching RSS feed from: ${url}`);
    
    // Fetch the RSS feed
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/atom+xml, application/rss+xml, application/xml, text/xml',
        'User-Agent': 'LibraryCDBrowser/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch RSS feed: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const xml = await response.text();
    console.log(`Received ${xml.length} bytes of XML`);
    
    // Parse the Atom feed
    const items = parseAtomFeed(xml);
    console.log(`Parsed ${items.length} items from feed`);

    return new Response(
      JSON.stringify({ items, total: items.length }),
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
