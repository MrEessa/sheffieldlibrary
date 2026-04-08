export interface CDItem {
  title: string;
  author?: string;
  year?: string;
  isbn?: string;
  link: string;
  coverUrl?: string;
  mediaType?: 'dvd' | 'cd' | 'unknown';
}

export type SortField = 'title' | 'author' | 'year' | 'isbn';
export type SortDirection = 'asc' | 'desc';
