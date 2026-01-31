import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CDItem, SortField, SortDirection } from '@/types/cd-item';
import { exportToCSV } from '@/utils/csv-export';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Search, ExternalLink } from 'lucide-react';

interface CDTableProps {
  items: CDItem[];
}

const PAGE_SIZES = [25, 50, 100, 'all'] as const;

export function CDTable({ items }: CDTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    
    const searchLower = search.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.author.toLowerCase().includes(searchLower) ||
        item.year.includes(searchLower) ||
        item.isbn.includes(searchLower)
    );
  }, [items, search]);

  // Sort filtered items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aValue = a[sortField].toLowerCase();
      const bValue = b[sortField].toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
  }, [filteredItems, sortField, sortDirection]);

  // Paginate sorted items
  const paginatedItems = useMemo(() => {
    if (pageSize === 'all') return sortedItems;
    
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, pageSize, currentPage]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(sortedItems.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handlePageSizeChange = (value: string) => {
    if (value === 'all') {
      setPageSize('all');
    } else {
      setPageSize(parseInt(value));
    }
    setCurrentPage(1);
  };

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [search]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No items loaded yet. Paste an RSS feed URL above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Per page:</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size === 'all' ? 'All' : size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            onClick={() => exportToCSV(filteredItems)}
            className="whitespace-nowrap"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {paginatedItems.length > 0 ? (currentPage - 1) * (pageSize === 'all' ? sortedItems.length : pageSize) + 1 : 0}
        -{Math.min(currentPage * (pageSize === 'all' ? sortedItems.length : pageSize), sortedItems.length)} of {sortedItems.length} items
        {search && ` (filtered from ${items.length} total)`}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('title')}
                  className="-ml-4 font-semibold"
                >
                  Title
                  {getSortIcon('title')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('author')}
                  className="-ml-4 font-semibold"
                >
                  Author/Artist
                  {getSortIcon('author')}
                </Button>
              </TableHead>
              <TableHead className="w-24">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('year')}
                  className="-ml-4 font-semibold"
                >
                  Year
                  {getSortIcon('year')}
                </Button>
              </TableHead>
              <TableHead className="w-36">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('isbn')}
                  className="-ml-4 font-semibold"
                >
                  ISBN
                  {getSortIcon('isbn')}
                </Button>
              </TableHead>
              <TableHead className="w-20 text-center">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item, index) => (
              <TableRow key={`${item.isbn || item.title}-${index}`}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.author || '—'}</TableCell>
                <TableCell>{item.year || '—'}</TableCell>
                <TableCell className="font-mono text-sm">{item.isbn || '—'}</TableCell>
                <TableCell className="text-center">
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
