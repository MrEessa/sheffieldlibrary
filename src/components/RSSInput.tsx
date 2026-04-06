import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, X } from 'lucide-react';

interface ProgressInfo {
  currentFeed: number;
  totalFeeds: number;
  status: string;
}

interface RSSInputProps {
  onFetch: (urls: string[], fetchAll: boolean) => void;
  isLoading: boolean;
  progress?: ProgressInfo | null;
}

export function RSSInput({ onFetch, isLoading, progress }: RSSInputProps) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [fetchAll, setFetchAll] = useState(true);

  const handleAddUrl = () => {
    if (currentUrl.trim() && !urls.includes(currentUrl.trim())) {
      setUrls([...urls, currentUrl.trim()]);
      setCurrentUrl('');
    }
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    setUrls(urls.filter(url => url !== urlToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allUrls = currentUrl.trim() 
      ? [...urls, currentUrl.trim()]
      : urls;
    
    if (allUrls.length > 0) {
      onFetch(allUrls, fetchAll);
    }
  };

  const getUrlLabel = (url: string) => {
    try {
      const urlObj = new URL(url);
      const params = urlObj.pathname + urlObj.search;
      // Extract a meaningful label from the URL
      const lmMatch = params.match(/lm=([^&]+)/);
      if (lmMatch) {
        return lmMatch[1].replace(/\+?\|\|/g, ', ').substring(0, 30) + (lmMatch[1].length > 30 ? '...' : '');
      }
      return url.substring(0, 50) + '...';
    } catch {
      return url.substring(0, 50) + '...';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <Input
          type="url"
          placeholder="Paste an RSS feed URL and press Enter or click + to add..."
          value={currentUrl}
          onChange={(e) => setCurrentUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={isLoading}
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleAddUrl}
          disabled={isLoading || !currentUrl.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button type="submit" disabled={isLoading || (urls.length === 0 && !currentUrl.trim())}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Load Feeds'
          )}
        </Button>
      </div>

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="flex items-center gap-1 max-w-xs"
            >
              <span className="truncate text-xs">{getUrlLabel(url)}</span>
              <button
                type="button"
                onClick={() => handleRemoveUrl(url)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="fetchAll"
          checked={fetchAll}
          onCheckedChange={(checked) => setFetchAll(checked === true)}
          disabled={isLoading}
        />
        <Label htmlFor="fetchAll" className="text-sm text-muted-foreground cursor-pointer">
          Load all records from each feed (may take longer for large catalogs)
        </Label>
      </div>

      {urls.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {urls.length} feed{urls.length !== 1 ? 's' : ''} queued. Results will be combined and deduplicated.
        </p>
      )}
    </form>
  );
}
