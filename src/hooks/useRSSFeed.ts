import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CDItem } from '@/types/cd-item';
import { toast } from '@/hooks/use-toast';

export function useRSSFeed() {
  const [items, setItems] = useState<CDItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalFeeds: number; duplicatesRemoved: number } | null>(null);

  const fetchFeed = async (urls: string[], fetchAll: boolean = false) => {
    if (urls.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one RSS feed URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setStats(null);

    try {
      const allItems: CDItem[] = [];
      const seenLinks = new Set<string>();
      let totalRawItems = 0;

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        toast({
          title: 'Loading...',
          description: `Fetching feed ${i + 1} of ${urls.length}`,
        });

        const { data, error: fnError } = await supabase.functions.invoke('fetch-rss', {
          body: { url, fetchAll },
        });

        if (fnError) {
          console.error(`Error fetching feed ${i + 1}:`, fnError);
          continue;
        }

        if (data.error) {
          console.error(`Feed ${i + 1} error:`, data.error);
          continue;
        }

        totalRawItems += data.items.length;

        // Deduplicate across all feeds
        for (const item of data.items) {
          const uniqueKey = item.link || `${item.title}-${item.author}`;
          if (!seenLinks.has(uniqueKey)) {
            seenLinks.add(uniqueKey);
            allItems.push(item);
          }
        }
      }

      const duplicatesRemoved = totalRawItems - allItems.length;
      
      setItems(allItems);
      setStats({ totalFeeds: urls.length, duplicatesRemoved });
      
      toast({
        title: 'Success',
        description: `Loaded ${allItems.length} unique items from ${urls.length} feed${urls.length !== 1 ? 's' : ''}${duplicatesRemoved > 0 ? ` (${duplicatesRemoved} duplicates removed)` : ''}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feeds';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { items, isLoading, error, stats, fetchFeed };
}
