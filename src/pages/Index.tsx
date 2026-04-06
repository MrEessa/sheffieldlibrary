import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RSSInput } from '@/components/RSSInput';
import { CDTable } from '@/components/CDTable';
import { useRSSFeed } from '@/hooks/useRSSFeed';
import { Disc3 } from 'lucide-react';

const Index = () => {
  const { items, isLoading, stats, progress, fetchFeed } = useRSSFeed();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Disc3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Library CD Browser</h1>
            <p className="text-muted-foreground">Search and browse audio CDs from your library's RSS feeds</p>
          </div>
        </div>

        {/* RSS Input Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Load RSS Feeds</CardTitle>
            <CardDescription>
              Add one or more RSS feed URLs. Results will be combined and deduplicated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RSSInput onFetch={fetchFeed} isLoading={isLoading} progress={progress} />
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              Catalog Results
              {items.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({items.length} unique items
                  {stats && stats.totalFeeds > 1 && ` from ${stats.totalFeeds} feeds`}
                  {stats && stats.duplicatesRemoved > 0 && `, ${stats.duplicatesRemoved} duplicates removed`})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CDTable items={items} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
