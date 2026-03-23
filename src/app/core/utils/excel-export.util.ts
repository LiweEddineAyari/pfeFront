import * as XLSX from 'xlsx';

export function exportToExcel(
  rows: Record<string, any>[],
  filename: string
): void {
  if (!rows || rows.length === 0) {
    console.warn('No data to export');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  const cols = Object.keys(rows[0]).map(key => ({
    wch: Math.max(
      key.length,
      ...rows.map(r => String(r[key] ?? '').length)
    ) + 2
  }));
  worksheet['!cols'] = cols;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
