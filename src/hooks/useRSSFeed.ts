import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CDItem } from '@/types/cd-item';
import { toast } from '@/hooks/use-toast';

interface FeedStats {
  totalFeeds: number;
  duplicatesRemoved: number;
}

interface ProgressInfo {
  currentFeed: number;
  totalFeeds: number;
  status: string;
}

export function useRSSFeed() {
  const [items, setItems] = useState<CDItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [mediaType, setMediaType] = useState<string>('unknown');

  const fetchFeed = async (urls: string[], fetchAll: boolean = false) => {
    if (urls.length === 0) {
      toast({ title: 'Error', description: 'Please enter at least one RSS feed URL', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setStats(null);

    try {
      const allItems: CDItem[] = [];
      const seenLinks = new Set<string>();
      let totalRawItems = 0;
      let detectedMediaType = 'unknown';

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        setProgress({
          currentFeed: i + 1,
          totalFeeds: urls.length,
          status: fetchAll
            ? `Loading all records from feed ${i + 1} of ${urls.length}... This may take a minute.`
            : `Fetching feed ${i + 1} of ${urls.length}`,
        });

        const { data, error: fnError } = await supabase.functions.invoke('fetch-rss', {
          body: { url, fetchAll },
        });

        if (fnError) {
          continue;
        }

        if (data.error) {
          continue;
        }

        // Capture media type from the response
        if (data.mediaType && data.mediaType !== 'unknown') {
          detectedMediaType = data.mediaType;
        }

        totalRawItems += data.items.length;

        for (const item of data.items) {
          const uniqueKey = item.link || `${item.title}-${item.author}`;
          if (!seenLinks.has(uniqueKey)) {
            seenLinks.add(uniqueKey);
            allItems.push(item);
          }
        }

        if (data.expectedTotal) {
          setProgress({
            currentFeed: i + 1,
            totalFeeds: urls.length,
            status: `Loaded ${data.items.length} of ${data.expectedTotal} records from feed ${i + 1}`,
          });
        }
      }

      const duplicatesRemoved = totalRawItems - allItems.length;
      setItems(allItems);
      setMediaType(detectedMediaType);
      setStats({ totalFeeds: urls.length, duplicatesRemoved });
      setProgress(null);

      toast({
        title: 'Success',
        description: `Loaded ${allItems.length} unique items from ${urls.length} feed${urls.length !== 1 ? 's' : ''}${duplicatesRemoved > 0 ? ` (${duplicatesRemoved} duplicates removed)` : ''}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feeds';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  return { items, isLoading, error, stats, progress, mediaType, fetchFeed };
}
