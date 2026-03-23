import { Injectable, NgZone } from '@angular/core';

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

export interface QualityTiersResult {
  status: string
  nullCheckDeleted: number
  duplicateDeleted: number
  typeCheckDeleted: number
  totalDeleted: number
}

export interface QualityContratResult {
  status: string
  nullCheckDeleted: number
  duplicateDeleted: number
  typeCheckDeleted: number
  totalDeleted: number
}

export interface QualityComptaResult {
  status: string
  nullCheckCount: number
  duplicateCount: number
  typeCheckCount: number
  balanceSum: number
  contratRelationCheck: number
  tiersRelationCheck: number
  totalIssues: number
}

export interface QualityListResponse {
  status: string
  rule: string
  count: number
  rows: Record<string, any>[]
}

export interface TransformResult {
  status:          string;
  rowsTransformed: number;
  message?:        string;
}

export interface DatamartContratResult {
  status: string
  subDimAgenceRows: number
  subDimDeviseRows: number
  subDimObjetfinanceRows: number
  subDimTypcontratRows: number
  subDimDateRows: number
  dimContratRows: number
  message?: string
}

export interface DatamartComptaResult {
  status: string
  subDimAgenceRows: number
  subDimDeviseRows: number
  subDimChapitreRows: number
  subDimCompteRows: number
  subDimDateRows: number
  factBalanceRows: number
  message?: string
}

export interface DatamartTiersResult {
  status: string
  dimClientRows: number
  subDimAgentecoRows?: number
  subDimDouteuxRows?: number
  subDimResidenceRows?: number
  subDimGrpaffaireRows?: number
  subDimSectionactiviteRows?: number
  message?: string
}

@Injectable({ providedIn: 'root' })
export class EtlApiService {

  private readonly BASE = '/api/etl';
  private readonly TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes

  constructor(private zone: NgZone) {}

  private runOutsideZone<T>(work: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.zone.runOutsideAngular(() => {
        work()
          .then(value => this.zone.run(() => resolve(value)))
          .catch(err => this.zone.run(() => reject(err)));
      });
    });
  }

  private fetchOutsideZone(url: string, options: RequestInit): Promise<Response> {
    return this.runOutsideZone(() => fetch(url, options));
  }

  private async fetchJson<T>(
    url: string,
    options: RequestInit = {},
    timeoutMs = 10 * 60 * 1000
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await this.runOutsideZone(async () => {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data as T;
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${Math.round(timeoutMs / 60000)} minutes.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

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
      return await this.runOutsideZone(async () => {
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
      });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(
          'Upload timed out after 10 minutes. ' +
          'Try splitting the file into smaller chunks.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Quality endpoints ──────────────────────────

  async qualityTiers(): Promise<QualityTiersResult> {
    return this.fetchJson<QualityTiersResult>(
      `${this.BASE}/quality/tiers`,
      { method: 'POST' },
      5 * 60 * 1000
    );
  }

  async qualityContrat(): Promise<QualityContratResult> {
    return this.fetchJson<QualityContratResult>(
      `${this.BASE}/quality/contrat`,
      { method: 'POST' },
      5 * 60 * 1000
    );
  }

  async qualityCompta(): Promise<QualityComptaResult> {
    return this.fetchJson<QualityComptaResult>(
      `${this.BASE}/quality/compta`,
      { method: 'POST' },
      5 * 60 * 1000
    );
  }

  async fetchComptaNullCheckList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/compta/null-check/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchComptaDuplicateList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/compta/duplicate/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchComptaTypeCheckList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/compta/type-check/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchComptaContratRelationList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/compta/contrat-relation-check/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchComptaTiersRelationList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/compta/tiers-relation-check/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  // ── Transform endpoints ────────────────────────

  async transformTiers(): Promise<TransformResult> {
    return this.fetchJson<TransformResult>(
      `${this.BASE}/transform/tiers`,
      { method: 'POST' },
      5 * 60 * 1000
    );
  }

  async transformContrat(): Promise<TransformResult> {
    return this.fetchJson<TransformResult>(
      `${this.BASE}/transform/contrat`,
      { method: 'POST' },
      5 * 60 * 1000
    );
  }

  // ── Datamart endpoints ─────────────────────────

  async datamartTiers(): Promise<DatamartTiersResult> {
    return this.fetchJson<DatamartTiersResult>(
      `${this.BASE}/datamart/tiers`,
      { method: 'POST' },
      10 * 60 * 1000
    );
  }

  async datamartContrat(): Promise<DatamartContratResult> {
    return this.fetchJson<DatamartContratResult>(
      `${this.BASE}/datamart/contrat`,
      { method: 'POST' },
      10 * 60 * 1000
    );
  }

  async datamartCompta(): Promise<DatamartComptaResult> {
    return this.fetchJson<DatamartComptaResult>(
      `${this.BASE}/datamart/compta`,
      { method: 'POST' },
      10 * 60 * 1000
    );
  }

  // ── Health ─────────────────────────────────────

  async health(): Promise<{ status: string }> {
    return this.fetchJson<{ status: string }>(`${this.BASE}/health`);
  }
} 
