import { Injectable, NgZone } from '@angular/core';

export interface ProcessResult {
  status:        string;        // "COMPLETED" or "ERROR"
  file?:         string;        // original filename
  rowCount:      number;        // rows inserted
  format?:       string;        // "JSON" | "EXCEL" | "SQL"
  mappingUsed:   string;        // "auto" | "explicit+auto"
  mappedColumns: Record<string, string>;  // fileCol → dbCol
  sourceTable?:  string;
  targetTable?:  string;
  message?:      string;        // present on error
}

export type DbType = 'POSTGRES' | 'MYSQL' | 'SQLSERVER' | 'ORACLE';

export interface DbConnectionConfig {
  host: string;
  port: number;
  database: string;
  dbType: DbType;
  username: string;
  password: string;
  table: string;
  schema?: string;
}

export interface DbColumnMetadata {
  columnName: string;
  dataType: string;
  nullable: boolean;
}

export interface LoadFromDbParams {
  connection: DbConnectionConfig;
  type: 'TIERS' | 'CONTRAT' | 'COMPTA';
  mapping: Record<string, string> | null;
  dateBal?: string;
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

export interface PagedResponse<T> {
  page: number
  size: number
  totalElements: number
  totalPages: number
  items: T[]
}

export interface ClientRow {
  idtiers: string
  nomprenom: string | null
  raisonsoc: string | null
  chiffreaffaires: string
  pays: string
  geo: string
  libelle: string
  douteux: number
  nomgroupaffaire: string | null
  sectionactivite: string | null
}

export interface AgentEcoRow {
  id: number
  libelle: string
}

export interface SectionActiviteRow {
  id: number
  libelle: string
}

export interface ContratRow {
  id: string
  id_client: string
  ancienneteimpaye: number
  tauxcontrat: number
  actif: number
  numagence: number
  nomprenom: string | null
  devise: string | null
  objetfinance: string | null
  typcontrat: string | null
  dateouverture: string | null
  dateecheance: string | null
}

export interface ContratDeviseRow {
  id: number
  devise: string
}

export interface ContratObjetFinanceRow {
  id: number
  libelle: string
}

export interface ContratTypeContratRow {
  id: number
  typcontrat: string
}

export interface BalanceRow {
  id: string | number
  numagence?: number | string | null
  devise?: string | null
  devisebanque?: string | null
  devisebbnq?: string | null
  numcompte?: string | null
  compte?: string | null
  chapitre?: string | null
  libellecompte?: string | null
  idtiers?: string | null
  id_client?: string | null
  idcontrat?: string | null
  id_contrat?: string | null
  soldeorigine?: number | string | null
  soldeconvertie?: number | string | null
  cumulmvtdb?: number | string | null
  cumulmvtcr?: number | string | null
  soldeinitdebmois?: number | string | null
  amount?: number | string | null
  actif?: number | boolean | string | null
  datevalue?: string | null
  date_bal?: string | null
  date_value?: string | null
}

export interface MappingConfigRow {
  id: number
  tableSource: string
  tableTarget: string
  columnSource: string
  columnTarget: string
  configGroupNumber: number
}

export interface MappingConfigUpsertRequest {
  tableSource: string
  tableTarget: string
  columnSource: string
  columnTarget: string
  configGroupNumber: number
}

export interface SourceTableColumnMetadata {
  columnName: string
  dataType: string
  nullable: boolean
}

export interface SourceTableMetadata {
  schema: string
  tableName: string
  qualifiedTable: string
  columns: SourceTableColumnMetadata[]
}

export interface SourceTablesColumnsResponse {
  tables: SourceTableMetadata[]
  status: string
  tableCount: number
}

export interface MappingConfigBulkResponse {
  status?: string
  message?: string
  createdCount?: number
}

export interface PipelineLoadTableResult {
  sourceTable: string
  targetTable: string
  rowCount: number
  mappedColumns: Record<string, string>
}

export interface PipelineLoadFromDbResponse {
  status: string
  rowCount: number
  configGroupNumber: number
  sourceTable: string
  targetTable: string
  mappingUsed: string
  mappedColumns: Record<string, string>
  tableResults: Record<string, PipelineLoadTableResult>
}

export interface QualityTransformTableResult {
  quality?: Record<string, number>
  transform?: Record<string, number>
  durationMs: number
}

export interface QualityTransformResponse {
  status: string
  totalDurationMs: number
  sequence: string[]
  tables: Record<string, QualityTransformTableResult>
}

export interface DatamartPipelineTableResult {
  durationMs: number
  [metric: string]: number
}

export interface DatamartPipelineResponse {
  status: string
  totalDurationMs: number
  sequence: string[]
  tables: Record<string, DatamartPipelineTableResult>
}

@Injectable({ providedIn: 'root' })
export class EtlApiService {

  private readonly BASE = '/api/etl';
  private readonly MAPPING_BASE = '/api/mapping-configs';
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

  private async fetchNoContent(
    url: string,
    options: RequestInit = {},
    timeoutMs = 2 * 60 * 1000
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await this.runOutsideZone(async () => {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        if (response.ok) {
          return;
        }

        const errorPayload = await response.text();
        let message = `Server error: ${response.status}`;

        if (errorPayload) {
          try {
            const parsed = JSON.parse(errorPayload) as { message?: string };
            message = parsed.message || message;
          } catch {
            message = errorPayload;
          }
        }

        throw new Error(message);
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

  async fetchColumnsFromDb(connection: DbConnectionConfig): Promise<DbColumnMetadata[]> {
    return this.fetchJson<DbColumnMetadata[]>(
      `${this.BASE}/columns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connection)
      },
      2 * 60 * 1000
    );
  }

  async fetchSourceTablesAndColumns(connection: DbConnectionConfig): Promise<SourceTablesColumnsResponse> {
    return this.fetchJson<SourceTablesColumnsResponse>(
      `${this.BASE}/source/tables-columns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection })
      },
      2 * 60 * 1000
    );
  }

  async loadFromDatabase(params: LoadFromDbParams): Promise<ProcessResult> {
    const payload: {
      connection: DbConnectionConfig;
      type: 'TIERS' | 'CONTRAT' | 'COMPTA';
      mapping: Record<string, string> | null;
      dateBal?: string;
      date_bal?: string;
    } = {
      connection: params.connection,
      type: params.type,
      mapping: params.mapping
    };

    if (params.dateBal && params.type === 'COMPTA') {
      payload.dateBal = params.dateBal;
      payload.date_bal = params.dateBal;
    }

    return this.fetchJson<ProcessResult>(
      `${this.BASE}/load-from-db`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      this.TIMEOUT_MS
    );
  }

  async loadFromDatabaseByConfigGroup(params: {
    connection: {
      host: string;
      port: number;
      database: string;
      dbType: DbType;
      username: string;
      password: string;
    };
    configGroupNumber: number;
    dateBal?: string;
  }): Promise<PipelineLoadFromDbResponse> {
    const payload: {
      connection: {
        host: string;
        port: number;
        database: string;
        dbType: DbType;
        username: string;
        password: string;
      };
      configGroupNumber: number;
      date_bal?: string;
    } = {
      connection: params.connection,
      configGroupNumber: params.configGroupNumber,
    };

    if (params.dateBal) {
      payload.date_bal = params.dateBal;
    }

    return this.fetchJson<PipelineLoadFromDbResponse>(
      `${this.BASE}/load-from-db`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      this.TIMEOUT_MS
    );
  }

  async runQualityTransform(): Promise<QualityTransformResponse> {
    return this.fetchJson<QualityTransformResponse>(
      `${this.BASE}/quality_transform`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      this.TIMEOUT_MS
    );
  }

  async runDatamartPipeline(): Promise<DatamartPipelineResponse> {
    return this.fetchJson<DatamartPipelineResponse>(
      `${this.BASE}/datamart`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      this.TIMEOUT_MS
    );
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

  async fetchTiersNullCheckList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/tiers/null-check/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchTiersDuplicateList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/tiers/duplicate/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchTiersTypeCheckList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/tiers/type-check/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchContratNullCheckList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/contrat/null-check/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchContratDuplicateList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/contrat/duplicate/list`,
      { method: 'GET' },
      2 * 60 * 1000
    );
  }

  async fetchContratTypeCheckList(): Promise<QualityListResponse> {
    return this.fetchJson<QualityListResponse>(
      `${this.BASE}/quality/contrat/type-check/list`,
      { method: 'GET' },
      2 * 60 * 1000
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

  async getClientList(page: number, size: number): Promise<PagedResponse<ClientRow>> {
    return this.fetchJson<PagedResponse<ClientRow>>(
      `${this.BASE}/datamart/tiers/client/list?page=${page}&size=${size}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getAgentEcoList(page: number, size: number): Promise<PagedResponse<AgentEcoRow>> {
    return this.fetchJson<PagedResponse<AgentEcoRow>>(
      `${this.BASE}/datamart/tiers/agenteco/list?page=${page}&size=${size}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getSectionActiviteList(page: number, size: number): Promise<PagedResponse<SectionActiviteRow>> {
    return this.fetchJson<PagedResponse<SectionActiviteRow>>(
      `${this.BASE}/datamart/tiers/sectionactivite/list?page=${page}&size=${size}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getContratList(page: number, size: number): Promise<PagedResponse<ContratRow>> {
    return this.fetchJson<PagedResponse<ContratRow>>(
      `${this.BASE}/datamart/contrat/list?page=${page}&size=${size}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getContratDeviseList(page: number, size: number): Promise<PagedResponse<ContratDeviseRow>> {
    return this.fetchJson<PagedResponse<ContratDeviseRow>>(
      `${this.BASE}/datamart/contrat/devise/list?page=${page}&size=${size}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getContratObjetFinanceList(page: number, size: number): Promise<PagedResponse<ContratObjetFinanceRow>> {
    return this.fetchJson<PagedResponse<ContratObjetFinanceRow>>(
      `${this.BASE}/datamart/contrat/objetfinance/list?page=${page}&size=${size}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getContratTypeContratList(page: number, size: number): Promise<PagedResponse<ContratTypeContratRow>> {
    return this.fetchJson<PagedResponse<ContratTypeContratRow>>(
      `${this.BASE}/datamart/contrat/typecontrat/list?page=${page}&size=${size}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getBalanceList(page: number, size: number): Promise<PagedResponse<BalanceRow>> {
    return this.fetchJson<PagedResponse<BalanceRow>>(
      `${this.BASE}/datamart/compta/balance/list?page=${page}&size=${size}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getAllMappingConfigs(): Promise<MappingConfigRow[]> {
    return this.fetchJson<MappingConfigRow[]>(
      this.MAPPING_BASE,
      { method: 'GET' },
      30 * 1000
    );
  }

  async getMappingConfigsByGroupNumber(configGroupNumber: number): Promise<MappingConfigRow[]> {
    return this.fetchJson<MappingConfigRow[]>(
      `${this.MAPPING_BASE}/groups/${configGroupNumber}`,
      { method: 'GET' },
      30 * 1000
    );
  }

  async updateMappingConfig(id: number, request: MappingConfigUpsertRequest): Promise<MappingConfigRow> {
    return this.fetchJson<MappingConfigRow>(
      `${this.MAPPING_BASE}/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      },
      30 * 1000
    );
  }

  async deleteMappingConfigGroup(configGroupNumber: number): Promise<void> {
    return this.fetchNoContent(
      `${this.MAPPING_BASE}/groups/${configGroupNumber}`,
      { method: 'DELETE' },
      30 * 1000
    );
  }

  async createMappingConfigsBulk(requests: MappingConfigUpsertRequest[]): Promise<MappingConfigBulkResponse> {
    return this.fetchJson<MappingConfigBulkResponse>(
      `${this.MAPPING_BASE}/bulk`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requests)
      },
      60 * 1000
    );
  }

  // ── Health ─────────────────────────────────────

  async health(): Promise<{ status: string }> {
    return this.fetchJson<{ status: string }>(`${this.BASE}/health`);
  }
} 
