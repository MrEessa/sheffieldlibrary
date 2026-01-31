import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface RSSInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
}

export function RSSInput({ onFetch, isLoading }: RSSInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFetch(url);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
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
    </form>
  );
}
