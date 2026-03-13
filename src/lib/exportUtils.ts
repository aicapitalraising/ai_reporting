import { toast } from 'sonner';

const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const normalizeCellValue = (value: unknown): string | number | boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'object') return JSON.stringify(item);
        return String(item);
      })
      .join('; ');
  }

  return JSON.stringify(value);
};

const flattenRowForCsv = (row: Record<string, unknown>): Record<string, string | number | boolean | null> => {
  const flattened: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(row)) {
    if (key === 'questions' && Array.isArray(value)) {
      for (const [index, questionEntry] of value.entries()) {
        if (!questionEntry || typeof questionEntry !== 'object') continue;

        const questionText = String((questionEntry as Record<string, unknown>).question || '').trim();
        const answerValue = (questionEntry as Record<string, unknown>).answer;
        const columnName = questionText || `Question ${index + 1}`;

        flattened[columnName] = normalizeCellValue(answerValue);
      }
      continue;
    }

    flattened[key] = normalizeCellValue(value);
  }

  return flattened;
};

export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  dateRange?: { startDate?: string; endDate?: string }
) {
  if (data.length === 0) {
    toast.error('No data to export');
    return;
  }

  const flattenedRows = data.map((row) => flattenRowForCsv(row as Record<string, unknown>));
  const headers = Array.from(
    flattenedRows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const metaRows: string[] = [];
  if (dateRange) {
    if (dateRange.startDate) metaRows.push(`${escapeCsvCell('Date Range Start')},${escapeCsvCell(dateRange.startDate)}`);
    if (dateRange.endDate) metaRows.push(`${escapeCsvCell('Date Range End')},${escapeCsvCell(dateRange.endDate)}`);
    if (metaRows.length > 0) metaRows.push('');
  }

  const csvRows = [
    ...metaRows,
    headers.map(escapeCsvCell).join(','),
    ...flattenedRows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Exported ${data.length} records to ${filename}.csv`);
}

export function exportToGoogleSheets<T extends object>(data: T[], title: string) {
  if (data.length === 0) {
    toast.error('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const tsvRows = [
    headers.join('\t'),
    ...data.map(row =>
      headers.map(header => {
        const value = (row as any)[header];
        if (value === null || value === undefined) return '';
        return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join('\t')
    ),
  ];

  const tsvContent = tsvRows.join('\n');

  const encodedTitle = encodeURIComponent(title);

  navigator.clipboard.writeText(tsvContent).then(() => {
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/create?title=${encodedTitle}`;
    window.open(googleSheetsUrl, '_blank');
    toast.success('Data copied to clipboard! Paste it into the new Google Sheet (Ctrl+V or Cmd+V)');
  }).catch(() => {
    toast.error('Failed to copy data to clipboard');
  });
}

export function exportDashboardPDF() {
  // Use the browser's print functionality to generate a PDF snapshot
  toast.info('Preparing PDF export...');

  // Small delay to let toast render then print
  setTimeout(() => {
    window.print();
  }, 300);
}
