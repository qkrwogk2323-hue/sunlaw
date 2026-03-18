function normalizeCell(value: unknown) {
  return `${value ?? ''}`.trim();
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      cells.push(normalizeCell(current));
      current = '';
      continue;
    }

    current += ch;
  }

  cells.push(normalizeCell(current));
  return cells;
}

export async function parseCsvFile(file: File) {
  const text = await file.text();
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [] as Array<Record<string, string>>;

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/\s+/g, ''));
  const rows: Array<Record<string, string>> = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = normalizeCell(cells[idx] ?? '');
    });
    rows.push(row);
  }

  return rows;
}

export function pickCsvValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalized = key.toLowerCase().replace(/\s+/g, '');
    const value = row[normalized];
    if (value && value.trim()) return value.trim();
  }
  return '';
}
