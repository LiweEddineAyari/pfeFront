import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ApiErrorResponse,
  FormulaJson,
  FormulaExecutionResponseDTO,
  FormulaRequestDTO,
  FormulaSqlResponseDTO,
  ParameterConfigResponseDTO,
  ParameterListParams,
  ParameterListResponse,
  SupportedFieldsResponseDTO,
} from '../models/parameter.model';

export class ApiHttpError extends Error {
  constructor(
    public status: number,
    public apiError: ApiErrorResponse
  ) {
    super(apiError.message);
    this.name = 'ApiHttpError';
  }
}

@Injectable({ providedIn: 'root' })
export class ParametersApiService {
  private readonly BASE = '/api/parameters';
  private readonly CACHE_KEY = 'frontapp.parameters.cache.v1';

  constructor(
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  async list(params: ParameterListParams = {}): Promise<ParameterListResponse> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const search = params.search?.trim() ?? '';

    try {
      const payload = await this.fetchJson<unknown>(this.BASE, {
        method: 'GET',
      });

      if (typeof payload === 'string') {
        throw new ApiHttpError(
          502,
          this.buildApiError(
            502,
            payload,
            this.BASE,
            'Reponse invalide pour la liste des parametres. JSON attendu, texte/HTML recu.'
          )
        );
      }

      const normalized = this.normalizeListPayload(payload, page, size, search);
      this.mergeCache(normalized.items);
      console.debug('Liste des parametres chargee depuis l\'API', { page, size, search, totalElements: normalized.totalElements });
      return {
        ...normalized,
        source: 'api',
      };
    } catch (error) {
      if (!this.shouldFallbackToCache(error)) {
        throw error;
      }

      return this.listFromCache({ page, size, search });
    }
  }

  async getByCode(code: string): Promise<ParameterConfigResponseDTO> {
    const encodedCode = encodeURIComponent(code);
    let response: ParameterConfigResponseDTO;

    try {
      response = await this.fetchJson<ParameterConfigResponseDTO>(
        `${this.BASE}/${encodedCode}`,
        { method: 'GET' }
      );
    } catch (error) {
      if (!this.shouldTryAlternateCodeRoute(error)) {
        throw error;
      }

      // Compatibilite pour les deploiements exposant explicitement la route /code/{code}.
      response = await this.fetchJson<ParameterConfigResponseDTO>(
        `${this.BASE}/code/${encodedCode}`,
        { method: 'GET' }
      );
    }
    console.debug(`Parametre "${code}" charge depuis l'API`, response);
    this.mergeCache([response]);
    return response;
  }

  async create(payload: FormulaRequestDTO): Promise<ParameterConfigResponseDTO> {
    const response = await this.fetchJson<ParameterConfigResponseDTO>(this.BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    this.mergeCache([response]);
    console.debug('Parametre cree', response);
    return response;
  }

  async update(code: string, payload: FormulaRequestDTO): Promise<ParameterConfigResponseDTO> {
    const response = await this.fetchJson<ParameterConfigResponseDTO>(
      `${this.BASE}/${encodeURIComponent(code)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    this.mergeCache([response]);
    return response;
  }

  async deleteByCode(code: string): Promise<void> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new ApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/code/:code`, 'Le code du parametre est obligatoire.')
      );
    }

    const encodedCode = encodeURIComponent(normalizedCode);

    try {
      await this.fetchJson<unknown>(`${this.BASE}/code/${encodedCode}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (!this.shouldTryAlternateCodeRoute(error)) {
        throw error;
      }

      await this.fetchJson<unknown>(`${this.BASE}/${encodedCode}`, {
        method: 'DELETE',
      });
    }

    this.removeFromCache(normalizedCode);
    console.debug(`Parametre "${normalizedCode}" supprime`);
  }

  async compileSql(code: string): Promise<FormulaSqlResponseDTO> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new ApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/:code/sql`, 'Le code du parametre est obligatoire.')
      );
    }

    const path = `${this.BASE}/${encodeURIComponent(normalizedCode)}/sql`;
    const payload = await this.fetchJson<unknown>(path, {
      method: 'GET',
    });

    const asObject = this.requireObjectPayload(payload, path, 'compileSql');
    const sql = this.safeString(asObject['sql']);

    if (!sql) {
      throw new ApiHttpError(
        502,
        this.buildApiError(
          502,
          payload,
          path,
          'Reponse SQL compile invalide. Le champ sql est manquant.'
        )
      );
    }

    return {
      code: this.safeString(asObject['code']) || normalizedCode,
      version: this.toNumber(asObject['version']),
      sql,
      parameters: Array.isArray(asObject['parameters']) ? asObject['parameters'] : [],
      referencedFields: this.toStringArray(asObject['referencedFields']),
      joins: this.toStringArray(asObject['joins']),
      groupByFields: this.toStringArray(asObject['groupByFields']),
      orderBy: this.toOrderByArray(asObject['orderBy']),
      limit: this.toNullableNumber(asObject['limit']),
      top: this.toNullableNumber(asObject['top']),
    };
  }

  async execute(code: string): Promise<FormulaExecutionResponseDTO> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new ApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/:code/execute`, 'Le code du parametre est obligatoire.')
      );
    }

    const path = `${this.BASE}/${encodeURIComponent(normalizedCode)}/execute`;
    const payload = await this.fetchJson<unknown>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    return this.normalizeExecutionResponse(payload, path, normalizedCode);
  }

  async executeAtDate(code: string, date: string): Promise<FormulaExecutionResponseDTO> {
    const normalizedCode = code.trim();
    const normalizedDate = date.trim();

    if (!normalizedCode) {
      throw new ApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/:code/execute/:date`, 'Le code du parametre est obligatoire.')
      );
    }

    if (!normalizedDate) {
      throw new ApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/${encodeURIComponent(normalizedCode)}/execute/:date`, 'La date d\'execution est obligatoire.')
      );
    }

    const path = `${this.BASE}/${encodeURIComponent(normalizedCode)}/execute/${encodeURIComponent(normalizedDate)}`;
    const payload = await this.fetchJson<unknown>(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );

    return this.normalizeExecutionResponse(payload, path, normalizedCode);
  }

  async supportedFields(): Promise<SupportedFieldsResponseDTO> {
    const payload = await this.fetchJson<unknown>(`${this.BASE}/supported-fields`, {
      method: 'GET',
    });

    if (!payload || typeof payload !== 'object') {
      throw new ApiHttpError(
        502,
        this.buildApiError(
          502,
          payload,
          `${this.BASE}/supported-fields`,
          'Reponse supported-fields invalide. Objet JSON avec tableau fields attendu.'
        )
      );
    }

    const asObject = payload as Record<string, unknown>;
    const fields = asObject['fields'];
    if (!Array.isArray(fields)) {
      throw new ApiHttpError(
        502,
        this.buildApiError(
          502,
          payload,
          `${this.BASE}/supported-fields`,
          'Reponse supported-fields invalide. Tableau fields manquant.'
        )
      );
    }

    const normalizedFields = fields
      .map((field) => this.safeString(field).trim())
      .filter((field) => field.length > 0);

    const fieldsByTable = this.normalizeFieldsByTable(asObject['fieldsByTable']);

    return {
      fields: normalizedFields,
      fieldsByTable,
    };
  }

  private shouldFallbackToCache(error: unknown): boolean {
    if (!(error instanceof ApiHttpError)) {
      return false;
    }

    return [404, 405, 501].includes(error.status);
  }

  private shouldTryAlternateCodeRoute(error: unknown): boolean {
    if (!(error instanceof ApiHttpError)) {
      return false;
    }

    return [404, 405, 501].includes(error.status);
  }

  private listFromCache(args: {
    page: number;
    size: number;
    search: string;
  }): ParameterListResponse {
    const all = this.readCache();
    const normalizedSearch = args.search.toLowerCase();
    const filtered = normalizedSearch
      ? all.filter(
          (item) => {
            const code = this.safeString(item.code).toLowerCase();
            const label = this.safeString(item.label).toLowerCase();
            return code.includes(normalizedSearch) || label.includes(normalizedSearch);
          }
        )
      : all;

    const start = args.page * args.size;
    const end = start + args.size;
    const items = filtered.slice(start, end);

    return {
      page: args.page,
      size: args.size,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / args.size)),
      items,
      source: 'cache',
    };
  }

  private normalizeListPayload(
    payload: unknown,
    defaultPage: number,
    defaultSize: number,
    search: string
  ): Omit<ParameterListResponse, 'source'> {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const asObject = payload as Record<string, unknown>;
      const items = this.extractItems(payload);

      const hasServerPagination =
        asObject['totalElements'] !== undefined
        || asObject['total_pages'] !== undefined
        || asObject['totalPages'] !== undefined;

      if (hasServerPagination) {
        const page = this.toNumber(asObject['page'] ?? asObject['pageNumber'] ?? defaultPage);
        const size = this.toNumber(asObject['size'] ?? asObject['pageSize'] ?? defaultSize);
        const totalElements = this.toNumber(asObject['totalElements'] ?? asObject['total_elements'] ?? items.length);
        const totalPages = this.toNumber(
          asObject['totalPages']
          ?? asObject['total_pages']
          ?? Math.max(1, Math.ceil(totalElements / Math.max(1, size || defaultSize)))
        );

        return {
          page,
          size: size || defaultSize,
          totalElements,
          totalPages: Math.max(1, totalPages),
          items,
        };
      }
    }

    const extractedItems = this.extractItems(payload);
    return this.paginateInMemory(extractedItems, defaultPage, defaultSize, search);
  }

  private extractItems(payload: unknown): ParameterConfigResponseDTO[] {
    if (Array.isArray(payload)) {
      return this.normalizeParameterArray(payload);
    }

    if (payload && typeof payload === 'object') {
      const asObject = payload as Record<string, unknown>;

      const items = asObject['items'];
      if (Array.isArray(items)) {
        return this.normalizeParameterArray(items);
      }

      const content = asObject['content'];
      if (Array.isArray(content)) {
        return this.normalizeParameterArray(content);
      }
    }

    return [];
  }

  private paginateInMemory(
    allItems: ParameterConfigResponseDTO[],
    page: number,
    size: number,
    search: string
  ): Omit<ParameterListResponse, 'source'> {
    const normalizedSearch = search.toLowerCase();
    const filtered = normalizedSearch
      ? allItems.filter(
          (item) => {
            const code = this.safeString(item.code).toLowerCase();
            const label = this.safeString(item.label).toLowerCase();
            return code.includes(normalizedSearch) || label.includes(normalizedSearch);
          }
        )
      : allItems;

    const start = page * size;
    const end = start + size;

    return {
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
      items: filtered.slice(start, end),
    };
  }

  private mergeCache(items: ParameterConfigResponseDTO[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const existing = this.readCache();
    const map = new Map<string, ParameterConfigResponseDTO>();
    const normalizedIncoming = this.normalizeParameterArray(items);

    existing.forEach((item) => {
      const code = this.safeString(item.code);
      if (code) {
        map.set(code, item);
      }
    });

    normalizedIncoming.forEach((item) => {
      const code = this.safeString(item.code);
      if (code) {
        const previous = map.get(code);
        map.set(code, previous ? this.mergeParameter(previous, item) : item);
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => {
      const timeDiff = this.getSortTimestamp(b) - this.getSortTimestamp(a);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      return this.safeString(a.code).localeCompare(this.safeString(b.code));
    });

    localStorage.setItem(this.CACHE_KEY, JSON.stringify(merged));
  }

  private removeFromCache(code: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const normalizedCode = code.trim();
    if (!normalizedCode) {
      return;
    }

    const filtered = this.readCache().filter((item) => this.safeString(item.code) !== normalizedCode);
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(filtered));
  }

  private readCache(): ParameterConfigResponseDTO[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const raw = localStorage.getItem(this.CACHE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const normalized = this.normalizeParameterArray(parsed);

      if (normalized.length !== parsed.length) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(normalized));
      }

      return normalized;
    } catch {
      return [];
    }
  }

  private normalizeParameterArray(items: unknown[]): ParameterConfigResponseDTO[] {
    return items
      .map((item) => this.normalizeParameterRecord(item))
      .filter((item): item is ParameterConfigResponseDTO => item !== null);
  }

  private normalizeParameterRecord(item: unknown): ParameterConfigResponseDTO | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const source = item as Record<string, unknown>;
    const code = this.safeString(source['code'] ?? source['Code'] ?? source['parameterCode']).trim();
    if (!code) {
      return null;
    }

    const label = this.safeString(source['label'] ?? source['libelle'] ?? source['Label']).trim() || code;
    const now = new Date().toISOString();
    const formula = this.normalizeFormula(source['formula']);

    return {
      id: this.toNumber(source['id'] ?? source['Id']),
      code,
      label,
      formula,
      version: Math.max(1, this.toNumber(source['version'] ?? source['Version'] ?? 1)),
      isActive: this.toBoolean(source['isActive'] ?? source['active'] ?? true),
      createdAt: this.safeString(source['createdAt'] ?? source['created_at']).trim() || now,
      updatedAt: this.safeString(source['updatedAt'] ?? source['updated_at']).trim() || now,
    };
  }

  private normalizeFormula(value: unknown): FormulaJson {
    if (value && typeof value === 'object') {
      const candidate = value as Partial<FormulaJson>;
      if (candidate.expression && typeof candidate.expression === 'object') {
        return candidate as FormulaJson;
      }
    }

    return {
      expression: {
        type: 'AGGREGATION',
        function: 'SUM',
        field: '',
      },
    };
  }

  private mergeParameter(base: ParameterConfigResponseDTO, incoming: ParameterConfigResponseDTO): ParameterConfigResponseDTO {
    return {
      id: incoming.id || base.id,
      code: incoming.code || base.code,
      label: incoming.label || base.label,
      formula: this.hasFormulaExpression(incoming.formula) ? incoming.formula : base.formula,
      version: incoming.version || base.version,
      isActive: incoming.isActive,
      createdAt: incoming.createdAt || base.createdAt,
      updatedAt: incoming.updatedAt || base.updatedAt,
    };
  }

  private hasFormulaExpression(formula: FormulaJson | undefined): boolean {
    return !!formula?.expression;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return false;
  }

  private safeString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (value === undefined || value === null) {
      return '';
    }

    return String(value);
  }

  private requireObjectPayload(
    payload: unknown,
    path: string,
    operation: string
  ): Record<string, unknown> {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }

    throw new ApiHttpError(
      502,
      this.buildApiError(
        502,
        payload,
        path,
        `Reponse invalide pour ${operation}. Objet JSON attendu.`
      )
    );
  }

  private normalizeExecutionResponse(
    payload: unknown,
    path: string,
    code: string
  ): FormulaExecutionResponseDTO {
    const asObject = this.requireObjectPayload(payload, path, 'execute');
    const sql = this.safeString(asObject['sql']);

    if (!sql) {
      throw new ApiHttpError(
        502,
        this.buildApiError(
          502,
          payload,
          path,
          'Reponse d\'execution invalide. Le champ sql est manquant.'
        )
      );
    }

    return {
      code: this.safeString(asObject['code']) || code,
      sql,
      parameters: Array.isArray(asObject['parameters']) ? asObject['parameters'] : [],
      referenceDate: this.toNullableString(asObject['referenceDate']),
      value: asObject['value'],
    };
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return 0;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = this.toNumber(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNullableString(value: unknown): string | null {
    const normalized = this.safeString(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => this.safeString(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  private normalizeFieldsByTable(value: unknown): Record<string, string[]> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const result: Record<string, string[]> = {};

    Object.entries(value as Record<string, unknown>).forEach(([tableName, rawFields]) => {
      const normalizedTableName = this.safeString(tableName).trim();
      if (!normalizedTableName || !Array.isArray(rawFields)) {
        return;
      }

      const normalizedFields = rawFields
        .map((field) => this.safeString(field).trim())
        .filter((field) => field.length > 0);

      if (normalizedFields.length > 0) {
        result[normalizedTableName] = Array.from(new Set(normalizedFields));
      }
    });

    return result;
  }

  private toOrderByArray(
    value: unknown
  ): Array<{ field: string; direction: 'ASC' | 'DESC' }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const asObject = entry as Record<string, unknown>;
        const field = this.safeString(asObject['field']).trim();
        if (!field) {
          return null;
        }

        const rawDirection = this.safeString(asObject['direction']).toUpperCase();
        const direction: 'ASC' | 'DESC' = rawDirection === 'DESC' ? 'DESC' : 'ASC';

        return {
          field,
          direction,
        };
      })
      .filter((entry): entry is { field: string; direction: 'ASC' | 'DESC' } => entry !== null);
  }

  private getSortTimestamp(item: Partial<ParameterConfigResponseDTO>): number {
    const updatedAt = this.safeString(item.updatedAt);
    const createdAt = this.safeString(item.createdAt);
    const source = updatedAt || createdAt;

    if (!source) {
      return 0;
    }

    const parsed = Date.parse(source);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private async fetchJson<T>(
    url: string,
    options: RequestInit = {},
    timeoutMs = 120000
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await this.runOutsideZone(async () => {
        const headers = new Headers(options.headers ?? {});
        if (!headers.has('Accept')) {
          headers.set('Accept', 'application/json');
        }

        const response = await fetch(url, {
          ...options,
          headers,
          cache: options.cache ?? 'no-store',
          signal: controller.signal,
        });

        const payloadText = await response.text();
        const payload = this.parsePayload(payloadText);

        if (!response.ok) {
          const apiError = this.buildApiError(response.status, payload, url);
          throw new ApiHttpError(response.status, apiError);
        }

        return payload as T;
      });
    } catch (error: unknown) {
      if (error instanceof ApiHttpError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        const apiError = this.buildApiError(408, null, url, 'Delai d\'attente de la requete depasse');
        throw new ApiHttpError(408, apiError);
      }

      const apiError = this.buildApiError(0, null, url, 'Erreur reseau lors de l\'appel API');
      throw new ApiHttpError(0, apiError);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parsePayload(payloadText: string): unknown {
    if (!payloadText.trim()) {
      return {};
    }

    try {
      return JSON.parse(payloadText);
    } catch {
      return payloadText;
    }
  }

  private buildApiError(
    status: number,
    payload: unknown,
    path: string,
    fallbackMessage?: string
  ): ApiErrorResponse {
    if (payload && typeof payload === 'object') {
      const candidate = payload as Partial<ApiErrorResponse>;

      if (typeof candidate.message === 'string') {
        return {
          timestamp: candidate.timestamp ?? new Date().toISOString(),
          status: candidate.status ?? status,
          error: candidate.error ?? `HTTP_${status}`,
          message: candidate.message,
          details: Array.isArray(candidate.details) ? candidate.details : [],
          path: candidate.path ?? path,
        };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      status,
      error: `HTTP_${status}`,
      message:
        fallbackMessage
        ?? (typeof payload === 'string' && payload.trim().length > 0
          ? payload
          : `La requete a echoue avec le statut ${status}`),
      details: [],
      path,
    };
  }

  private runOutsideZone<T>(work: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.zone.runOutsideAngular(() => {
        work()
          .then((value) => this.zone.run(() => resolve(value)))
          .catch((error) => this.zone.run(() => reject(error)));
      });
    });
  }
}
