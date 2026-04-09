import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CDItem } from '@/types/cd-item';

function coverKey(item: CDItem): string {
  return item.isbn || item.title;
}

export function useCoverArt(visibleItems: CDItem[], mediaType?: string) {
  const [coverMap, setCoverMap] = useState<Map<string, string>>(new Map());
  const [isLoadingCovers, setIsLoadingCovers] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const fetchedKeysRef = useRef<Set<string>>(new Set());

  const fetchCovers = useCallback(async (items: CDItem[], type: string) => {
    const newItems = items.filter(item => !fetchedKeysRef.current.has(coverKey(item)));
    if (newItems.length === 0) return;

    setIsLoadingCovers(true);

    try {
      const titles = newItems.map(item => ({ title: item.title, author: item.author || '', isbn: item.isbn || '' }));

      const { data, error } = await supabase.functions.invoke('fetch-cover-art', {
        body: { titles, mediaType: type },
      });

      if (error) {
        newItems.forEach(item => fetchedKeysRef.current.add(coverKey(item)));
        return;
      }

      if (data?.covers) {
        const newCovers = data.covers as Record<string, string>;
        for (const [key, url] of Object.entries(newCovers)) {
          cacheRef.current.set(key, url);
        }
        newItems.forEach(item => fetchedKeysRef.current.add(coverKey(item)));
        setCoverMap(new Map(cacheRef.current));
      }
    } catch (err) {
      newItems.forEach(item => fetchedKeysRef.current.add(coverKey(item)));
    } finally {
      setIsLoadingCovers(false);
    }
  }, []);

  useEffect(() => {
    if (visibleItems.length === 0 || !mediaType || mediaType === 'unknown') return;
    fetchCovers(visibleItems, mediaType);
  }, [visibleItems, mediaType, fetchCovers]);

  return { coverMap, isLoadingCovers, coverKey };
}
