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

// ---- RSS PARSING (original, kept as fallback) ----

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
  let author = '';
  const authorMatch = decoded.match(/by\s+([^<\n]+)/i) ||
    decoded.match(/<b>Author:<\/b>\s*([^<]+)/i) ||
    decoded.match(/Author:\s*([^<\n]+)/i);
  if (authorMatch) author = authorMatch[1].trim();

  let year = '';
  const yearMatch = decoded.match(/(\d{4})/);
  if (yearMatch) year = yearMatch[1];

  let isbn = '';
  const isbnMatch = decoded.match(/ISBN[:\s]*([0-9X-]+)/i) ||
    decoded.match(/\b(\d{10}|\d{13})\b/);
  if (isbnMatch) isbn = isbnMatch[1].trim();

  return { author, year, isbn };
}

function parseAtomFeed(xml: string): CDItem[] {
  const items: CDItem[] = [];
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryContent = match[1];
    const titleMatch = entryContent.match(/<title[^>]*>([^<]*)<\/title>/);
    let title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
    title = title.replace(/^First Title value, for Searching\s*/i, '').trim();

    const linkMatch = entryContent.match(/<link[^>]*href="([^"]*)"[^>]*\/>/);
    const link = linkMatch ? linkMatch[1] : '';

    const contentMatch = entryContent.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    const content = contentMatch ? contentMatch[1] : '';
    const { author, year, isbn } = extractFromContent(content);
    const cleanedAuthor = author.trim().replace(/,?\s*author\.?$/i, '').trim();

    if (title) {
      items.push({ title, author: cleanedAuthor, year, isbn, link });
    }
  }
  return items;
}

// ---- HTML SCRAPING (new, for full pagination) ----

const HTML_PAGE_SIZE = 100;
const DELAY_MS = 1000;
const MAX_HTML_PAGES = 100;

function rssUrlToHtmlUrl(rssUrl: string): string {
  // Convert RSS URL to HTML search results URL
  // e.g. /client/rss/hitlist/default/te=ILS&lm=DVD
  // ->   /client/en_GB/default/search/results?te=ILS&lm=DVD
  try {
    const url = new URL(rssUrl);
    const path = url.pathname; // e.g. /client/rss/hitlist/default/te=ILS&lm=DVD
    
    // Extract params from the path portion after /hitlist/default/ or /hitlist/
    const hitlistMatch = path.match(/\/rss\/hitlist(?:\/[^/]+)?\/(.*)/);
    if (hitlistMatch) {
      const paramString = hitlistMatch[1]; // e.g. te=ILS&lm=DVD
      // Also include any query params
      const existingParams = url.search ? url.search.substring(1) : '';
      const allParams = [paramString, existingParams].filter(Boolean).join('&');
      return `${url.origin}/client/en_GB/default/search/results?${allParams}`;
    }
    
    // If it's already an HTML URL or can't parse, return as-is
    return rssUrl;
  } catch {
    return rssUrl;
  }
}

function extractTotalResults(html: string): number {
  // Look for "3471 Results Found" pattern
  const match = html.match(/([\d,]+)\s+Results?\s+Found/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return 0;
}

function parseHtmlResults(html: string): CDItem[] {
  const items: CDItem[] = [];
  
  // Split HTML into per-item blocks using results_bio boundaries
  const blocks = html.split(/id="results_bio\d+"/);
  
  // Skip first block (everything before first result)
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Title from hideIE class anchor inside displayDetailLink
    const titleMatch = block.match(/class="hideIE"[^>]*>([^<]+)/);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
    
    if (!title) continue;
    
    // Author from highlightMe INITIAL_AUTHOR_SRCH
    const authorMatch = block.match(/highlightMe INITIAL_AUTHOR_SRCH">\s*([^<]+)/);
    let author = authorMatch ? decodeHtmlEntities(authorMatch[1].trim()) : '';
    author = author.replace(/,?\s*(director|author|editor|narrator|producer|writer)\.?$/i, '').trim();
    
    // Year from highlightMe PUBDATE
    const yearMatch = block.match(/highlightMe PUBDATE">\s*(\d{4})/);
    const year = yearMatch ? yearMatch[1] : '';
    
    // Catalog ID from SD_ILS:NNNNNN pattern
    const idMatch = block.match(/SD_ILS:(\d+)/);
    const catalogId = idMatch ? idMatch[1] : '';
    const link = catalogId 
      ? `https://library.sheffield.gov.uk/client/en_GB/default/search/detailnonmodal/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:${catalogId}/one`
      : '';
    
    const isbn = '';
    
    items.push({ title, author, year, isbn, link });
  }
  
  return items;
}

async function fetchHtmlPage(baseUrl: string, startRow: number): Promise<{ html: string; success: boolean }> {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('ps', String(HTML_PAGE_SIZE));
    url.searchParams.set('rw', String(startRow));
    
    console.log(`Fetching HTML page: rw=${startRow}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; LibraryCDBrowser/1.0)',
      }
    });
    
    if (!response.ok) {
      console.error(`HTML fetch failed: ${response.status}`);
      return { html: '', success: false };
    }
    
    const html = await response.text();
    return { html, success: true };
  } catch (error) {
    console.error('Error fetching HTML page:', error);
    return { html: '', success: false };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeAllHtmlPages(rssUrl: string): Promise<{ items: CDItem[]; total: number; pages: number }> {
  const htmlBaseUrl = rssUrlToHtmlUrl(rssUrl);
  console.log(`Converted RSS URL to HTML: ${htmlBaseUrl}`);
  
  // Fetch first page to get total count
  const { html: firstHtml, success: firstSuccess } = await fetchHtmlPage(htmlBaseUrl, 1);
  if (!firstSuccess) {
    return { items: [], total: 0, pages: 0 };
  }
  
  const totalResults = extractTotalResults(firstHtml);
  console.log(`Total results found: ${totalResults}`);
  
  const allItems: CDItem[] = [];
  const seenIds = new Set<string>();
  
  // Parse first page
  const firstItems = parseHtmlResults(firstHtml);
  for (const item of firstItems) {
    const key = item.link || `${item.title}-${item.author}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      allItems.push(item);
    }
  }
  console.log(`Page 1: ${firstItems.length} items parsed, ${allItems.length} unique`);
  
  const totalPages = Math.min(Math.ceil(totalResults / HTML_PAGE_SIZE), MAX_HTML_PAGES);
  
  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    await delay(DELAY_MS);
    
    const startRow = (page - 1) * HTML_PAGE_SIZE + 1;
    const { html, success } = await fetchHtmlPage(htmlBaseUrl, startRow);
    
    if (!success) {
      console.error(`Failed on page ${page}, stopping`);
      break;
    }
    
    const pageItems = parseHtmlResults(html);
    let newCount = 0;
    for (const item of pageItems) {
      const key = item.link || `${item.title}-${item.author}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        allItems.push(item);
        newCount++;
      }
    }
    
    console.log(`Page ${page}/${totalPages}: ${pageItems.length} parsed, ${newCount} new (total: ${allItems.length})`);
    
    if (pageItems.length === 0) break;
  }
  
  return { items: allItems, total: totalResults, pages: totalPages };
}

// ---- MEDIA TYPE DETECTION ----

function detectMediaType(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('lm=dvd') || urlLower.includes('lm=bluray') || urlLower.includes('lm=blu-ray')) {
    return 'dvd';
  }
  if (urlLower.includes('lm=musiccd') || urlLower.includes('lm=cd') || urlLower.includes('lm=music')) {
    return 'cd';
  }
  return 'unknown';
}

// ---- MAIN SERVER ----

serve(async (req) => {
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

    const mediaType = detectMediaType(url);
    console.log(`Request: url=${url}, fetchAll=${fetchAll}, mediaType=${mediaType}`);

    // Determine if this is a library RSS URL that we can scrape via HTML
    const isLibraryRss = url.includes('/rss/hitlist') || url.includes('library.sheffield.gov.uk');

    if (fetchAll && isLibraryRss) {
      // Use HTML scraping for full pagination
      console.log('Using HTML scraping mode for full catalog');
      const { items, total, pages } = await scrapeAllHtmlPages(url);
      
      return new Response(
        JSON.stringify({ items, total: items.length, expectedTotal: total, pages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: single RSS page fetch
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/atom+xml, application/rss+xml, application/xml, text/xml',
        'User-Agent': 'LibraryCDBrowser/1.0'
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch RSS feed: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const xml = await response.text();
    const items = parseAtomFeed(xml);
    console.log(`RSS: parsed ${items.length} items`);

    return new Response(
      JSON.stringify({ items, total: items.length, pages: 1, mediaType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
