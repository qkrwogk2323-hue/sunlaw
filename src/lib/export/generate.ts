import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type ExportFormat = 'xlsx' | 'docx' | 'pdf';

function normalizeRows(rows: Record<string, unknown>[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, value == null ? '' : String(value)])
    )
  );
}

export async function buildXlsxBuffer(sheetName: string, rows: Record<string, unknown>[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  const normalized = normalizeRows(rows);

  if (normalized.length > 0) {
    const headers = Object.keys(normalized[0]);
    worksheet.addRow(headers);
    normalized.forEach((row) => {
      worksheet.addRow(headers.map((h) => row[h] ?? ''));
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildDocxBuffer(title: string, rows: Record<string, unknown>[]) {
  const normalized = normalizeRows(rows);
  const headers = normalized[0] ? Object.keys(normalized[0]) : [];

  const tableRows = [
    new TableRow({
      children: headers.map((header) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })]
        })
      )
    }),
    ...normalized.map((row) =>
      new TableRow({
        children: headers.map((header) =>
          new TableCell({
            children: [new Paragraph(String(row[header] ?? ''))]
          })
        )
      })
    )
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] }),
          new Paragraph(' '),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows.length ? tableRows : [new TableRow({ children: [new TableCell({ children: [new Paragraph('데이터 없음')] })] })]
          })
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}

export async function buildPdfBuffer(title: string, rows: Record<string, unknown>[]) {
  const normalized = normalizeRows(rows);
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  let y = height - 40;

  const drawLine = (text: string, isHeader = false) => {
    if (y < 40) {
      page = pdf.addPage([842, 595]);
      y = height - 40;
    }
    page.drawText(text, {
      x: 32,
      y,
      size: isHeader ? 14 : 10,
      font: isHeader ? bold : font,
      color: rgb(0.1, 0.1, 0.1)
    });
    y -= isHeader ? 22 : 14;
  };

  drawLine(title, true);
  drawLine('');

  if (!normalized.length) {
    drawLine('데이터 없음');
  } else {
    const headers = Object.keys(normalized[0]);
    drawLine(headers.join(' | '), true);
    normalized.forEach((row) => {
      drawLine(headers.map((header) => String(row[header] ?? '')).join(' | '));
    });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
