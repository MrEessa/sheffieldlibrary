import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface RSSInputProps {
  onFetch: (url: string, fetchAll: boolean) => void;
  isLoading: boolean;
}

export function RSSInput({ onFetch, isLoading }: RSSInputProps) {
  const [url, setUrl] = useState('');
  const [fetchAll, setFetchAll] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFetch(url, fetchAll);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <Input
          type="url"
          placeholder="Paste your RSS feed URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !url.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Load Feed'
          )}
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="fetchAll"
          checked={fetchAll}
          onCheckedChange={(checked) => setFetchAll(checked === true)}
          disabled={isLoading}
        />
        <Label htmlFor="fetchAll" className="text-sm text-muted-foreground cursor-pointer">
          Load all records (may take longer for large catalogs)
        </Label>
      </div>
    </form>
  );
}
