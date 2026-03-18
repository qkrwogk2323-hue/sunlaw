import * as XLSX from 'xlsx';

export type CsvRow = Record<string, string>;

function normalizeHeader(value: unknown) {
  return `${value ?? ''}`
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()/]+/g, '');
}

function normalizeCell(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? `${value}` : '';
  return `${value}`.trim();
}

export async function parseCsvFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [] as CsvRow[];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, {
    header: 1,
    blankrows: false,
    defval: ''
  });

  const [headerRow, ...bodyRows] = rows;
  if (!headerRow?.length) return [] as CsvRow[];

  const headers = headerRow.map((value) => normalizeHeader(value));

  return bodyRows
    .map((row) => headers.reduce<CsvRow>((acc, header, index) => {
      if (!header) return acc;
      acc[header] = normalizeCell(row[index]);
      return acc;
    }, {}))
    .filter((row) => Object.values(row).some(Boolean));
}

export function pickCsvValue(row: CsvRow, aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
  for (const alias of normalizedAliases) {
    if (row[alias]) return row[alias];
  }
  return '';
}
