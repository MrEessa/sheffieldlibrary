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

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Use window.open as fallback if programmatic click fails (e.g. in sandboxed iframes)
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  
  try {
    link.click();
  } catch {
    window.open(url, '_blank');
  }
  
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
