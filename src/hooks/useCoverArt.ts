import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CDItem } from '@/types/cd-item';

function coverKey(item: CDItem): string {
  return item.isbn || item.title;
}

const BATCH_SIZES: Record<string, number> = {
  cd: 5,      // 1100ms per item → ~5.5s per batch
  book: 8,    // 500ms per item → ~4s per batch
  dvd: 15,    // 150ms per 5 → fast
};

export interface CoverProgress {
  fetched: number;
  total: number;
}

export function useCoverArt(visibleItems: CDItem[], mediaType?: string) {
  const [coverMap, setCoverMap] = useState<Map<string, string>>(new Map());
  const [isLoadingCovers, setIsLoadingCovers] = useState(false);
  const [coverProgress, setCoverProgress] = useState<CoverProgress | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const fetchedKeysRef = useRef<Set<string>>(new Set());
  const abortRef = useRef(false);

  const fetchCovers = useCallback(async (items: CDItem[], type: string) => {
    const newItems = items.filter(item => !fetchedKeysRef.current.has(coverKey(item)));
    if (newItems.length === 0) return;

    abortRef.current = false;
    setIsLoadingCovers(true);

    const batchSize = BATCH_SIZES[type] || 10;
    const totalItems = newItems.length;
    let fetchedCount = 0;

    setCoverProgress({ fetched: 0, total: totalItems });

    try {
      for (let i = 0; i < totalItems; i += batchSize) {
        if (abortRef.current) break;

        const batch = newItems.slice(i, i + batchSize);
        const titles = batch.map(item => ({
          title: item.title,
          author: item.author || '',
          isbn: item.isbn || '',
        }));

        try {
          const { data, error } = await supabase.functions.invoke('fetch-cover-art', {
            body: { titles, mediaType: type },
          });

          batch.forEach(item => fetchedKeysRef.current.add(coverKey(item)));

          if (!error && data?.covers) {
            const newCovers = data.covers as Record<string, string>;
            for (const [key, url] of Object.entries(newCovers)) {
              cacheRef.current.set(key, url);
            }
            setCoverMap(new Map(cacheRef.current));
          }
        } catch {
          batch.forEach(item => fetchedKeysRef.current.add(coverKey(item)));
        }

        fetchedCount += batch.length;
        setCoverProgress({ fetched: fetchedCount, total: totalItems });
      }
    } finally {
      setIsLoadingCovers(false);
      setCoverProgress(null);
    }
  }, []);

  useEffect(() => {
    if (visibleItems.length === 0 || !mediaType || mediaType === 'unknown') return;
    fetchCovers(visibleItems, mediaType);

    return () => {
      abortRef.current = true;
    };
  }, [visibleItems, mediaType, fetchCovers]);

  return { coverMap, isLoadingCovers, coverKey, coverProgress };
}
