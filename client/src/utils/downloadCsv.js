import { apiFetch } from './apiFetch';

// Fetches a CSV from the API and triggers a browser download, using the
// filename the server suggests when present.
export const downloadCsv = async (url, fallbackName = 'export.csv') => {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Export failed');

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);

  return filename;
};
