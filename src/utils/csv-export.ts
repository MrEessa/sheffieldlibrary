import { CDItem } from '@/types/cd-item';

export function exportToCSV(items: CDItem[], filename: string = 'library-cds.csv') {
  const headers = ['Title', 'Author/Artist', 'Year', 'ISBN', 'Link'];
  
  const csvContent = [
    headers.join(','),
    ...items.map(item => [
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.author.replace(/"/g, '""')}"`,
      `"${item.year}"`,
      `"${item.isbn}"`,
      `"${item.link}"`,
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
