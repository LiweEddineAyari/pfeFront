import { Injectable } from '@angular/core';

export interface ExtractionResult {
  status: 'success' | 'empty' | 'no-columns' | 
          'parse-error' | 'unsupported' | 'too-large';
  columns: string[];
  rowCount?: number;
  fileType: 'excel' | 'json' | 'sql' | 'unknown';
  errorMessage?: string;
  rawPreview?: string;
}

@Injectable({ providedIn: 'root' })
export class ColumnExtractorService {


  async extract(file: File): Promise<ExtractionResult> {

    // Guard: empty file
    if (file.size === 0) {
      return { status:'empty', columns:[], fileType:'unknown',
        errorMessage: 'The file is empty' };
    }

    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls'))
      return this.extractExcel(file);
    if (name.endsWith('.json'))
      return this.extractJson(file);
    if (name.endsWith('.sql'))
      return this.extractSql(file);

    return { status:'unsupported', columns:[], fileType:'unknown',
      errorMessage: 'Unsupported file format. Use .xlsx, .xls, .json or .sql' };
  }

  /* ── EXCEL ─────────────────────────────── */
  private async extractExcel(file: File): Promise<ExtractionResult> {
    try {
      const XLSX = await import('xlsx');
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type:'array' });

      const sheetName = wb.SheetNames[0];
      if (!sheetName)
        return { status:'empty', columns:[], fileType:'excel',
          errorMessage: 'Excel file has no sheets' };

      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, 
        { header:1, defval:null });

      // Find first non-empty row as header
      const headerRow = rows.find(r => 
        r.some(c => c !== null && c !== undefined && String(c).trim() !== ''));

      if (!headerRow || headerRow.length === 0)
        return { status:'no-columns', columns:[], fileType:'excel',
          errorMessage: 'No header row found. First row must contain column names.' };

      const columns = headerRow
        .map(c => String(c ?? '').trim())
        .filter(c => c !== '');

      if (columns.length === 0)
        return { status:'no-columns', columns:[], fileType:'excel',
          errorMessage: 'Header row found but all cells are empty' };

      return { 
        status:'success', columns, fileType:'excel',
        rowCount: rows.length - 1
      };
    } catch (e: any) {
      return { status:'parse-error', columns:[], fileType:'excel',
        errorMessage: `Could not parse Excel file: ${e.message}`,
        rawPreview: e.message };
    }
  }

  /* ── JSON ──────────────────────────────── */
  private async extractJson(file: File): Promise<ExtractionResult> {
    try {
      const text = await file.text();
      if (!text.trim())
        return { status:'empty', columns:[], fileType:'json',
          errorMessage: 'JSON file is empty' };

      let parsed: any;
      try { parsed = JSON.parse(text); }
      catch (e: any) {
        return { status:'parse-error', columns:[], fileType:'json',
          errorMessage: `Invalid JSON syntax: ${e.message}`,
          rawPreview: text.slice(0, 200) };
      }

      // SHAPE 1: Array of objects — most common export format
      // [{ col: val }, { col: val }, ...]
      if (Array.isArray(parsed)) {
        const firstObj = parsed.find(i =>
          typeof i === 'object' && i !== null && !Array.isArray(i));
        if (!firstObj)
          return { status:'no-columns', columns:[], fileType:'json',
            errorMessage: 'JSON array contains no objects. ' +
              'Expected: [{"col1": val, "col2": val}, ...]' };
        return {
          status: 'success',
          columns: Object.keys(firstObj),
          fileType: 'json',
          rowCount: parsed.length
        };
      }

      if (typeof parsed === 'object' && parsed !== null) {

        // SHAPE 2: Known wrapper key { data: [...], rows: [...], etc }
        const KNOWN_KEYS = ['data','rows','records','items','results',
                            'list','entries','content','payload',
                            'body','dataset','table','values'];
        const knownKey = KNOWN_KEYS.find(k =>
          Array.isArray(parsed[k]) && parsed[k].length > 0);
        if (knownKey) {
          const firstObj = parsed[knownKey].find((i: any) =>
            typeof i === 'object' && i !== null && !Array.isArray(i));
          if (firstObj)
            return {
              status: 'success',
              columns: Object.keys(firstObj),
              fileType: 'json',
              rowCount: parsed[knownKey].length
            };
        }

        // SHAPE 3: Arbitrary wrapper key { "stg_tiers_raw": [...] }
        // Scan ALL top-level keys for any non-empty array of objects
        const arbitraryKey = Object.keys(parsed).find(k => {
          const v = parsed[k];
          return Array.isArray(v) && v.length > 0 &&
                 typeof v[0] === 'object' && v[0] !== null &&
                 !Array.isArray(v[0]);
        });
        if (arbitraryKey) {
          const firstObj = parsed[arbitraryKey][0];
          const columns = Object.keys(firstObj);
          if (columns.length > 0)
            return {
              status: 'success',
              columns,
              fileType: 'json',
              rowCount: parsed[arbitraryKey].length
            };
        }

        // SHAPE 4: Nested one level deeper
        // { "export": { "rows": [{...}] } }
        for (const topKey of Object.keys(parsed)) {
          const nested = parsed[topKey];
          if (typeof nested !== 'object' || nested === null) continue;
          const nestedArrayKey = Object.keys(nested).find(k => {
            const v = nested[k];
            return Array.isArray(v) && v.length > 0 &&
                   typeof v[0] === 'object' && v[0] !== null;
          });
          if (nestedArrayKey) {
            const firstObj = nested[nestedArrayKey][0];
            const columns = Object.keys(firstObj);
            if (columns.length > 0)
              return {
                status: 'success',
                columns,
                fileType: 'json',
                rowCount: nested[nestedArrayKey].length
              };
          }
        }

        // SHAPE 5: Single flat object — keys ARE the columns
        // Only use this if object has >1 key (not a wrapper)
        const topKeys = Object.keys(parsed);
        if (topKeys.length > 1) {
          const allPrimitive = topKeys.every(k => {
            const v = parsed[k];
            return typeof v !== 'object' || v === null;
          });
          if (allPrimitive)
            return {
              status: 'success',
              columns: topKeys,
              fileType: 'json',
              rowCount: 1
            };
        }
      }

      return { status:'no-columns', columns:[], fileType:'json',
        errorMessage: 'Could not detect column structure. ' +
          'Supported shapes: array of objects, ' +
          'wrapper object with array value, flat object.',
        rawPreview: text.slice(0, 200) };

    } catch (e: any) {
      return { status:'parse-error', columns:[], fileType:'json',
        errorMessage: `Failed to read JSON file: ${e.message}` };
    }
  }

  /* ── SQL ───────────────────────────────── */
  private async extractSql(file: File): Promise<ExtractionResult> {
    try {
      const raw = await file.text();
      if (!raw.trim())
        return { status:'empty', columns:[], fileType:'sql',
          errorMessage: 'SQL file is empty' };

      // Pre-process: strip comments
      const text = raw
        .replace(/--[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim();

      if (!text)
        return { status:'empty', columns:[], fileType:'sql',
          errorMessage: 'SQL file contains only comments' };

      // Table name pattern — matches: table, schema.table,
      // `schema`.`table`, [schema].[table], "schema"."table"
      const TABLE = String.raw`[\w\`"\[\].]+`;

      // Strategy 1: INSERT INTO [schema.]table (col1, col2) VALUES
      const insertColRegex = new RegExp(
        String.raw`INSERT\s+INTO\s+${TABLE}\s*\(([^)]+)\)\s*VALUES`, 'is');
      const insertColMatch = text.match(insertColRegex);
      if (insertColMatch) {
        const columns = insertColMatch[1]
          .split(',')
          .map(c => c.trim().replace(/[`"[\]\s]/g, ''))
          .filter(Boolean);
        if (columns.length > 0) {
          const rowCount = (text.match(
            new RegExp(String.raw`INSERT\s+INTO\s+${TABLE}`, 'gi')) || []).length;
          return { status:'success', columns, fileType:'sql', rowCount };
        }
      }

      // Strategy 2: CREATE TABLE [IF NOT EXISTS] [schema.]table (...)
      const createRegex = new RegExp(
        String.raw`CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${TABLE}\s*\(([^;]+)\)`, 'is');
      const createMatch = text.match(createRegex);
      if (createMatch) {
        const columns = createMatch[1]
          .split(',')
          .map(l => l.trim())
          .filter(l => l && 
            !/^(PRIMARY|UNIQUE|INDEX|KEY|CONSTRAINT|FOREIGN|CHECK)/i.test(l))
          .map(l => l.split(/\s+/)[0].replace(/[`"[\]]/g, ''))
          .filter(Boolean);
        if (columns.length > 0)
          return { status:'success', columns, fileType:'sql' };
      }

      // Strategy 3: SELECT col1, col2 FROM [schema.]table
      const selectRegex = /SELECT\s+([\w\s,.*`"[\]]+?)\s+FROM/is;
      const selectMatch = text.match(selectRegex);
      if (selectMatch && selectMatch[1].trim() !== '*') {
        const columns = selectMatch[1]
          .split(',')
          .map(c => c.trim()
            .replace(/[`"[\]]/g, '')
            .split(/\s+as\s+/i).pop()!)
          .filter(c => c && c !== '*');
        if (columns.length > 0)
          return { status:'success', columns, fileType:'sql' };
      }

      // Strategy 4: INSERT without column list
      const insertNoColRegex = new RegExp(
        String.raw`INSERT\s+INTO\s+${TABLE}\s+VALUES\s*\(`, 'i');
      if (insertNoColRegex.test(text))
        return { status:'no-columns', columns:[], fileType:'sql',
          errorMessage: 'SQL INSERT statements have no column list. ' +
            'Change to: INSERT INTO table (col1, col2) VALUES ...' };

      return { status:'no-columns', columns:[], fileType:'sql',
        errorMessage: 'No recognizable column structure found. ' +
          'Supported: INSERT with columns, CREATE TABLE, SELECT.',
        rawPreview: raw.slice(0, 300) };

    } catch (e: any) {
      return { status:'parse-error', columns:[], fileType:'sql',
        errorMessage: `Failed to read SQL file: ${e.message}` };
    }
  }
}
