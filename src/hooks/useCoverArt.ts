import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CDItem } from '@/types/cd-item';

export function useCoverArt(visibleItems: CDItem[], mediaType?: string) {
  const [coverMap, setCoverMap] = useState<Map<string, string>>(new Map());
  const [isLoadingCovers, setIsLoadingCovers] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const fetchedTitlesRef = useRef<Set<string>>(new Set());

  const fetchCovers = useCallback(async (items: CDItem[], type: string) => {
    // Filter to only titles we haven't fetched yet
    const newItems = items.filter(item => !fetchedTitlesRef.current.has(item.title));
    if (newItems.length === 0) return;

    setIsLoadingCovers(true);

    try {
      const titles = newItems.map(item => ({ title: item.title, author: item.author }));

      const { data, error } = await supabase.functions.invoke('fetch-cover-art', {
        body: { titles, mediaType: type },
      });

      if (error) {
        console.error('Cover art fetch error:', error);
        // Mark as fetched so we don't retry
        newItems.forEach(item => fetchedTitlesRef.current.add(item.title));
        return;
      }

      if (data?.covers) {
        const newCovers = data.covers as Record<string, string>;
        for (const [title, url] of Object.entries(newCovers)) {
          cacheRef.current.set(title, url);
        }
        // Mark all as fetched (including those with no cover)
        newItems.forEach(item => fetchedTitlesRef.current.add(item.title));

        setCoverMap(new Map(cacheRef.current));
      }
    } catch (err) {
      console.error('Cover art error:', err);
      newItems.forEach(item => fetchedTitlesRef.current.add(item.title));
    } finally {
      setIsLoadingCovers(false);
    }
  }, []);

  useEffect(() => {
    if (visibleItems.length === 0 || !mediaType || mediaType === 'unknown') return;
    fetchCovers(visibleItems, mediaType);
  }, [visibleItems, mediaType, fetchCovers]);

  return { coverMap, isLoadingCovers };
}
