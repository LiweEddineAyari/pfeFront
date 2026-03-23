import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ProcessResult {
  status:        string;        // "COMPLETED" or "ERROR"
  file:          string;        // original filename
  rowCount:      number;        // rows inserted
  format:        string;        // "JSON" | "EXCEL" | "SQL"
  mappingUsed:   string;        // "auto" | "explicit+auto"
  mappedColumns: Record<string, string>;  // fileCol → dbCol
  message?:      string;        // present on error
}

export interface ProcessFileParams {
  file:      File;
  type:      string;           // TIERS | CONTRAT | COMPTA | SQL
  mappings:  Record<string, string> | null;  // { dbCol: fileCol }
  dateBal?:  string;           // dd/MM/yyyy, only for COMPTA
}

export interface QualityResult {
  status:              string;
  nullCheckDeleted?:   number;
  duplicateDeleted?:   number;
  typeCheckDeleted?:   number;
  totalDeleted?:       number;
  nullCheckCount?:     number;
  duplicateCount?:     number;
  typeCheckCount?:     number;
  balanceSum?:         number;
  contratRelationCheck?: number;
  tiersRelationCheck?:   number;
  totalIssues?:        number;
}

export interface TransformResult {
  status:          string;
  rowsTransformed: number;
}

export interface DatamartResult {
  status:              string;
  dimClientRows?:      number;
  dimContratRows?:     number;
  factBalanceRows?:    number;
  subDimAgenceRows?:   number;
  subDimDeviseRows?:   number;
  subDimChapitreRows?: number;
  subDimCompteRows?:   number;
  subDimDateRows?:     number;
  [key: string]:       any;
}

@Injectable({ providedIn: 'root' })
export class EtlApiService {

  private readonly BASE = '/api/etl';
  private readonly TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes

  constructor(private http: HttpClient) {}

  /**
   * Build FormData for the ETL process endpoint.
   * Critical logic — follow exactly:
   * 1. Always append: file, type
   * 2. date_bal only if provided AND type === 'COMPTA'
   * 3. mapping only if mappings has at least 1 key
   */
  private buildFormData(params: ProcessFileParams): FormData {
    const { file, type, mappings, dateBal } = params;
    const fd = new FormData();

    fd.append('file', file);
    fd.append('type', type);

    if (dateBal && type === 'COMPTA') {
      fd.append('date_bal', dateBal);
    }

    // Mapping logic: only append if mappings is not null and has keys
    if (mappings && Object.keys(mappings).length > 0) {
      // Convert { dbCol: fileCol } → [{ fileCol: dbCol }, ...]
      const arr = Object.entries(mappings)
        .map(([dbCol, fileCol]) => ({ [fileCol]: dbCol }));
      fd.append('mapping', JSON.stringify(arr));
    }
    // If mappings is null or empty, do NOT append 'mapping' — backend auto-matches

    return fd;
  }

  /**
   * Upload file with optional mapping.
   * Uses native fetch + AbortController for long-running uploads.
   */
  async processFile(params: ProcessFileParams): Promise<ProcessResult> {
    const fd = this.buildFormData(params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(`${this.BASE}/process`, {
        method: 'POST',
        body: fd,
        signal: controller.signal
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      return data as ProcessResult;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(
          'Upload timed out after 10 minutes. ' +
          'The file may be too large — try splitting it into smaller chunks.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Quality endpoints ──────────────────────────

  async qualityTiers(): Promise<QualityResult> {
    return firstValueFrom(
      this.http.post<QualityResult>(
        `${this.BASE}/quality/tiers`, {}));
  }

  async qualityContrat(): Promise<QualityResult> {
    return firstValueFrom(
      this.http.post<QualityResult>(
        `${this.BASE}/quality/contrat`, {}));
  }

  async qualityCompta(): Promise<QualityResult> {
    return firstValueFrom(
      this.http.post<QualityResult>(
        `${this.BASE}/quality/compta`, {}));
  }

  // ── Transform endpoints ────────────────────────

  async transformTiers(): Promise<TransformResult> {
    return firstValueFrom(
      this.http.post<TransformResult>(
        `${this.BASE}/transform/tiers`, {}));
  }

  async transformContrat(): Promise<TransformResult> {
    return firstValueFrom(
      this.http.post<TransformResult>(
        `${this.BASE}/transform/contrat`, {}));
  }

  // ── Datamart endpoints ─────────────────────────

  async datamartTiers(): Promise<DatamartResult> {
    return firstValueFrom(
      this.http.post<DatamartResult>(
        `${this.BASE}/datamart/tiers`, {}));
  }

  async datamartContrat(): Promise<DatamartResult> {
    return firstValueFrom(
      this.http.post<DatamartResult>(
        `${this.BASE}/datamart/contrat`, {}));
  }

  async datamartCompta(): Promise<DatamartResult> {
    return firstValueFrom(
      this.http.post<DatamartResult>(
        `${this.BASE}/datamart/compta`, {}));
  }

  // ── Health ─────────────────────────────────────

  async health(): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.get<{ status: string }>(
        `${this.BASE}/health`));
  }
} 
