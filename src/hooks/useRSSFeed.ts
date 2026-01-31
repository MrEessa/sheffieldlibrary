import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CDItem } from '@/types/cd-item';
import { toast } from '@/hooks/use-toast';

export function useRSSFeed() {
  const [items, setItems] = useState<CDItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async (url: string) => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid RSS feed URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-rss', {
        body: { url },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setItems(data.items);
      toast({
        title: 'Success',
        description: `Loaded ${data.items.length} items from the feed`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feed';
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

  return { items, isLoading, error, fetchFeed };
}
