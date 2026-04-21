import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ApiErrorResponse,
  RatioConfigResponseDTO,
  RatioExecutionResponseDTO,
  RatioFormulaNode,
  RatioListParams,
  RatioListResponse,
  RatioLookupItem,
  RatioRequestDTO,
  RatioSimulationResponseDTO,
} from '../models/ratio.model';

export class RatioApiHttpError extends Error {
  constructor(
    public status: number,
    public apiError: ApiErrorResponse
  ) {
    super(apiError.message);
    this.name = 'RatioApiHttpError';
  }
}

@Injectable({ providedIn: 'root' })
export class RatiosApiService {
  private readonly BASE = '/api/ratios';
  private readonly CACHE_KEY = 'frontapp.ratios.cache.v1';
  private readonly familyCrudBase = '/api/ratios/families';
  private readonly categoryCrudBase = '/api/ratios/categories';

  private readonly familyLookupPaths = [
    '/api/ratios/families',
  ];

  private readonly categoryLookupPaths = [
    '/api/ratios/categories',
  ];

  constructor(
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  async list(params: RatioListParams = {}): Promise<RatioListResponse> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const search = params.search?.trim() ?? '';

    try {
      const payload = await this.fetchJson<unknown>(this.BASE, {
        method: 'GET',
      });

      if (typeof payload === 'string') {
        throw new RatioApiHttpError(
          502,
          this.buildApiError(
            502,
            payload,
            this.BASE,
            'Reponse invalide pour la liste des ratios. JSON attendu, texte/HTML recu.'
          )
        );
      }

      const normalized = this.normalizeListPayload(payload, page, size, search);
      this.mergeCache(normalized.items);

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

  async getByCode(code: string): Promise<RatioConfigResponseDTO> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new RatioApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/:code`, 'Le code du ratio est obligatoire.')
      );
    }

    const path = `${this.BASE}/${encodeURIComponent(normalizedCode)}`;
    const payload = await this.fetchJson<unknown>(path, { method: 'GET' });

    const normalized = this.normalizeRatioRecord(payload);
    if (!normalized) {
      throw new RatioApiHttpError(
        502,
        this.buildApiError(502, payload, path, 'Reponse ratio invalide. Objet ratio attendu.')
      );
    }

    this.mergeCache([normalized]);
    return normalized;
  }

  async create(payload: RatioRequestDTO): Promise<RatioConfigResponseDTO> {
    const response = await this.fetchJson<unknown>(this.BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const normalized = this.normalizeRatioRecord(response);
    if (!normalized) {
      throw new RatioApiHttpError(
        502,
        this.buildApiError(502, response, this.BASE, 'Reponse de creation ratio invalide.')
      );
    }

    this.mergeCache([normalized]);
    return normalized;
  }

  async update(code: string, payload: RatioRequestDTO): Promise<RatioConfigResponseDTO> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new RatioApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/:code`, 'Le code du ratio est obligatoire.')
      );
    }

    const path = `${this.BASE}/${encodeURIComponent(normalizedCode)}`;
    const response = await this.fetchJson<unknown>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const normalized = this.normalizeRatioRecord(response);
    if (!normalized) {
      throw new RatioApiHttpError(
        502,
        this.buildApiError(502, response, path, 'Reponse de mise a jour ratio invalide.')
      );
    }

    this.mergeCache([normalized]);
    return normalized;
  }

  async deleteByCode(code: string): Promise<void> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new RatioApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/:code`, 'Le code du ratio est obligatoire.')
      );
    }

    const path = `${this.BASE}/${encodeURIComponent(normalizedCode)}`;
    await this.fetchJson<unknown>(path, {
      method: 'DELETE',
    });

    this.removeFromCache(normalizedCode);
  }

  async deleteMany(codes: string[]): Promise<void> {
    const normalizedCodes = Array.from(
      new Set(
        codes
          .map((code) => code.trim())
          .filter((code) => code.length > 0)
      )
    );

    if (normalizedCodes.length === 0) {
      return;
    }

    await this.fetchJson<unknown>(this.BASE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedCodes),
    });

    normalizedCodes.forEach((code) => this.removeFromCache(code));
  }

  async simulate(formula: RatioFormulaNode): Promise<RatioSimulationResponseDTO> {
    const path = `${this.BASE}/simulate`;
    const payload = await this.fetchJson<unknown>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formula }),
    });

    return this.normalizeSimulationResponse(payload, path);
  }

  async executeAtDate(code: string, date: string): Promise<RatioExecutionResponseDTO> {
    const normalizedCode = code.trim();
    const normalizedDate = date.trim();

    if (!normalizedCode) {
      throw new RatioApiHttpError(
        400,
        this.buildApiError(400, null, `${this.BASE}/:code/execute/:date`, 'Le code du ratio est obligatoire.')
      );
    }

    if (!normalizedDate) {
      throw new RatioApiHttpError(
        400,
        this.buildApiError(
          400,
          null,
          `${this.BASE}/${encodeURIComponent(normalizedCode)}/execute/:date`,
          'La date de reference est obligatoire.'
        )
      );
    }

    const path = `${this.BASE}/${encodeURIComponent(normalizedCode)}/execute/${encodeURIComponent(normalizedDate)}`;
    const payload = await this.fetchJson<unknown>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const simulation = this.normalizeSimulationResponse(payload, path);
    const asObject = this.requireObjectPayload(payload, path, 'executeAtDate');

    return {
      ...simulation,
      code: this.safeString(asObject['code']).trim() || normalizedCode,
      referenceDate: this.toNullableString(asObject['referenceDate'] ?? asObject['date']),
    };
  }

  async listFamilies(): Promise<RatioLookupItem[]> {
    const lookup = await this.resolveLookupList(this.familyLookupPaths, 'Famille');
    if (lookup.length > 0) {
      return lookup;
    }

    return this.buildLookupFromCache('familleId', 'Famille');
  }

  async listCategories(): Promise<RatioLookupItem[]> {
    const lookup = await this.resolveLookupList(this.categoryLookupPaths, 'Categorie');
    if (lookup.length > 0) {
      return lookup;
    }

    return this.buildLookupFromCache('categorieId', 'Categorie');
  }

  async getFamilyById(id: number): Promise<RatioLookupItem> {
    return this.fetchLookupItemById(this.familyCrudBase, id, 'Famille');
  }

  async createFamily(payload: string | Record<string, unknown>): Promise<RatioLookupItem> {
    return this.createLookupItem(this.familyCrudBase, payload, 'Famille');
  }

  async updateFamily(id: number, payload: string | Record<string, unknown>): Promise<RatioLookupItem> {
    return this.updateLookupItem(this.familyCrudBase, id, payload, 'Famille');
  }

  async deleteFamily(id: number): Promise<void> {
    await this.deleteLookupItem(this.familyCrudBase, id, 'Famille');
  }

  async getCategoryById(id: number): Promise<RatioLookupItem> {
    return this.fetchLookupItemById(this.categoryCrudBase, id, 'Categorie');
  }

  async createCategory(payload: string | Record<string, unknown>): Promise<RatioLookupItem> {
    return this.createLookupItem(this.categoryCrudBase, payload, 'Categorie');
  }

  async updateCategory(id: number, payload: string | Record<string, unknown>): Promise<RatioLookupItem> {
    return this.updateLookupItem(this.categoryCrudBase, id, payload, 'Categorie');
  }

  async deleteCategory(id: number): Promise<void> {
    await this.deleteLookupItem(this.categoryCrudBase, id, 'Categorie');
  }

  private async resolveLookupList(paths: string[], fallbackLabel: string): Promise<RatioLookupItem[]> {
    for (const path of paths) {
      try {
        const payload = await this.fetchJson<unknown>(path, { method: 'GET' });
        const normalized = this.normalizeLookupPayload(payload, fallbackLabel);
        if (normalized.length > 0) {
          return normalized;
        }
      } catch (error) {
        if (error instanceof RatioApiHttpError && [404, 405, 501].includes(error.status)) {
          continue;
        }

        // Lookup data is optional for initial rendering: fall back to cache-derived values.
        return [];
      }
    }

    return [];
  }

  private async fetchLookupItemById(
    basePath: string,
    id: number,
    fallbackLabel: string
  ): Promise<RatioLookupItem> {
    const normalizedId = this.ensurePositiveLookupId(id, `${basePath}/:id`);
    const path = `${basePath}/${normalizedId}`;
    const payload = await this.fetchJson<unknown>(path, { method: 'GET' });
    return this.normalizeLookupItemOrThrow(payload, fallbackLabel, path);
  }

  private async createLookupItem(
    basePath: string,
    payload: string | Record<string, unknown>,
    fallbackLabel: string
  ): Promise<RatioLookupItem> {
    const body = this.buildLookupMutationPayload(payload);
    const response = await this.fetchJson<unknown>(basePath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return this.normalizeLookupItemOrThrow(response, fallbackLabel, basePath);
  }

  private async updateLookupItem(
    basePath: string,
    id: number,
    payload: string | Record<string, unknown>,
    fallbackLabel: string
  ): Promise<RatioLookupItem> {
    const normalizedId = this.ensurePositiveLookupId(id, `${basePath}/:id`);
    const path = `${basePath}/${normalizedId}`;
    const body = this.buildLookupMutationPayload(payload);
    const response = await this.fetchJson<unknown>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return this.normalizeLookupItemOrThrow(response, fallbackLabel, path);
  }

  private async deleteLookupItem(
    basePath: string,
    id: number,
    fallbackLabel: string
  ): Promise<void> {
    const normalizedId = this.ensurePositiveLookupId(id, `${basePath}/:id`);
    const path = `${basePath}/${normalizedId}`;

    try {
      await this.fetchJson<unknown>(path, { method: 'DELETE' });
    } catch (error) {
      if (error instanceof RatioApiHttpError && error.status === 404) {
        throw new RatioApiHttpError(
          404,
          this.buildApiError(
            404,
            error.apiError,
            path,
            `${fallbackLabel} ${normalizedId} introuvable.`
          )
        );
      }

      throw error;
    }
  }

  private ensurePositiveLookupId(id: number, path: string): number {
    const normalizedId = this.toNumber(id);
    if (normalizedId <= 0) {
      throw new RatioApiHttpError(
        400,
        this.buildApiError(400, null, path, 'L\'identifiant doit etre strictement positif.')
      );
    }

    return normalizedId;
  }

  private buildLookupMutationPayload(payload: string | Record<string, unknown>): Record<string, unknown> {
    if (typeof payload === 'string') {
      const name = payload.trim();
      return {
        name,
        label: name,
        libelle: name,
      };
    }

    const source = payload && typeof payload === 'object' ? payload : {};
    const merged = { ...source };
    const name = this.safeString(
      merged['name']
      ?? merged['label']
      ?? merged['libelle']
      ?? merged['designation']
      ?? merged['description']
    ).trim();

    if (name) {
      if (!merged['name']) {
        merged['name'] = name;
      }
      if (!merged['label']) {
        merged['label'] = name;
      }
      if (!merged['libelle']) {
        merged['libelle'] = name;
      }
    }

    return merged;
  }

  private normalizeLookupItemOrThrow(
    payload: unknown,
    fallbackLabel: string,
    path: string
  ): RatioLookupItem {
    const normalized = this.normalizeLookupPayload(payload, fallbackLabel);
    const item = normalized[0];

    if (item) {
      return item;
    }

    throw new RatioApiHttpError(
      502,
      this.buildApiError(502, payload, path, `Reponse ${fallbackLabel.toLowerCase()} invalide.`)
    );
  }

  private shouldFallbackToCache(error: unknown): boolean {
    if (!(error instanceof RatioApiHttpError)) {
      return false;
    }

    return [0, 404, 405, 500, 501].includes(error.status);
  }

  private listFromCache(args: {
    page: number;
    size: number;
    search: string;
  }): RatioListResponse {
    const all = this.readCache();
    const normalizedSearch = args.search.toLowerCase();

    const filtered = normalizedSearch
      ? all.filter((item) => {
          const code = this.safeString(item.code).toLowerCase();
          const label = this.safeString(item.label).toLowerCase();
          return code.includes(normalizedSearch) || label.includes(normalizedSearch);
        })
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
  ): Omit<RatioListResponse, 'source'> {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const asObject = payload as Record<string, unknown>;
      const items = this.extractItems(payload);

      const hasServerPagination =
        asObject['totalElements'] !== undefined
        || asObject['total_pages'] !== undefined
        || asObject['totalPages'] !== undefined
        || asObject['total'] !== undefined
        || asObject['count'] !== undefined;

      if (hasServerPagination) {
        const page = this.toNumber(asObject['page'] ?? asObject['pageNumber'] ?? defaultPage);
        const size = this.toNumber(asObject['size'] ?? asObject['pageSize'] ?? defaultSize);
        const totalElements = this.toNumber(
          asObject['totalElements']
          ?? asObject['total_elements']
          ?? asObject['total']
          ?? asObject['count']
          ?? items.length
        );
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

  private extractItems(payload: unknown): RatioConfigResponseDTO[] {
    if (Array.isArray(payload)) {
      return this.normalizeRatioArray(payload);
    }

    if (payload && typeof payload === 'object') {
      const asObject = payload as Record<string, unknown>;

      const candidateKeys = ['items', 'content', 'rows', 'data', 'results', 'ratios'];
      for (const key of candidateKeys) {
        const value = asObject[key];
        if (Array.isArray(value)) {
          return this.normalizeRatioArray(value);
        }
      }
    }

    return [];
  }

  private paginateInMemory(
    allItems: RatioConfigResponseDTO[],
    page: number,
    size: number,
    search: string
  ): Omit<RatioListResponse, 'source'> {
    const normalizedSearch = search.toLowerCase();

    const filtered = normalizedSearch
      ? allItems.filter((item) => {
          const code = this.safeString(item.code).toLowerCase();
          const label = this.safeString(item.label).toLowerCase();
          return code.includes(normalizedSearch) || label.includes(normalizedSearch);
        })
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

  private mergeCache(items: RatioConfigResponseDTO[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const existing = this.readCache();
    const map = new Map<string, RatioConfigResponseDTO>();
    const normalizedIncoming = this.normalizeRatioArray(items);

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
        map.set(code, previous ? this.mergeRatio(previous, item) : item);
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

  private readCache(): RatioConfigResponseDTO[] {
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

      const normalized = this.normalizeRatioArray(parsed);

      if (normalized.length !== parsed.length) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(normalized));
      }

      return normalized;
    } catch {
      return [];
    }
  }

  private normalizeRatioArray(items: unknown[]): RatioConfigResponseDTO[] {
    return items
      .map((item) => this.normalizeRatioRecord(item))
      .filter((item): item is RatioConfigResponseDTO => item !== null);
  }

  private normalizeRatioRecord(item: unknown): RatioConfigResponseDTO | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const source = item as Record<string, unknown>;
    const code = this.safeString(
      source['code']
      ?? source['Code']
      ?? source['ratioCode']
      ?? source['codeRatio']
    ).trim();
    if (!code) {
      return null;
    }

    const label = this.normalizeHumanText(source['label'] ?? source['libelle'] ?? source['Label']) || code;
    const now = new Date().toISOString();
    const formulaSource =
      source['formula']
      ?? source['expression']
      ?? source['formule']
      ?? source['formulaJson']
      ?? source['ratioFormula'];

    return {
      id: this.toNumber(source['id'] ?? source['Id']),
      code,
      label,
      familleId: this.toNumber(
        source['familleId']
        ?? source['famille_id']
        ?? source['familyId']
        ?? source['idFamille']
        ?? source['idFamilleRatio']
        ?? source['familleRatioId']
      ),
      categorieId: this.toNumber(
        source['categorieId']
        ?? source['categorie_id']
        ?? source['categoryId']
        ?? source['idCategorie']
        ?? source['idCategorieRatio']
        ?? source['categorieRatioId']
      ),
      formula: this.normalizeFormulaNode(formulaSource),
      seuilTolerance: this.toNullableNumber(source['seuilTolerance'] ?? source['thresholdTolerance']),
      seuilAlerte: this.toNullableNumber(source['seuilAlerte'] ?? source['thresholdAlert']),
      seuilAppetence: this.toNullableNumber(source['seuilAppetence'] ?? source['thresholdAppetite']),
      description: this.normalizeHumanText(source['description']),
      isActive: this.toBoolean(source['isActive'] ?? source['active'] ?? true),
      version: Math.max(1, this.toNumber(source['version'] ?? source['Version'] ?? 1)),
      createdAt: this.safeString(source['createdAt'] ?? source['created_at']).trim() || now,
      updatedAt: this.safeString(source['updatedAt'] ?? source['updated_at']).trim() || now,
    };
  }

  private normalizeFormulaNode(value: unknown): RatioFormulaNode {
    if (typeof value === 'string') {
      const maybeJson = this.parsePayload(value);
      if (maybeJson && typeof maybeJson === 'object') {
        return this.normalizeFormulaNode(maybeJson);
      }
    }

    if (!value || typeof value !== 'object') {
      return {
        type: 'CONSTANT',
        value: 0,
      };
    }

    const source = value as Record<string, unknown>;

    if (!source['type'] && source['expression'] && typeof source['expression'] === 'object') {
      return this.normalizeFormulaNode(source['expression']);
    }

    const rawType = this.safeString(
      source['type']
      ?? source['nodeType']
      ?? source['operator']
      ?? source['op']
    ).toUpperCase();

    const normalizedType = this.mapOperatorToFormulaType(rawType);

    if (normalizedType === 'PARAM') {
      return {
        type: 'PARAM',
        code: this.safeString(source['code'] ?? source['paramCode'] ?? source['parameterCode']).trim(),
      };
    }

    if (normalizedType === 'CONSTANT') {
      return {
        type: 'CONSTANT',
        value: this.toFiniteNumber(source['value'] ?? source['constantValue']),
      };
    }

    if (['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'].includes(normalizedType)) {
      return {
        type: normalizedType,
        left: this.normalizeFormulaNode(source['left']),
        right: this.normalizeFormulaNode(source['right']),
      };
    }

    return {
      type: 'CONSTANT',
      value: 0,
    };
  }

  private mergeRatio(base: RatioConfigResponseDTO, incoming: RatioConfigResponseDTO): RatioConfigResponseDTO {
    return {
      id: incoming.id || base.id,
      code: incoming.code || base.code,
      label: incoming.label || base.label,
      familleId: incoming.familleId || base.familleId,
      categorieId: incoming.categorieId || base.categorieId,
      formula: this.hasFormulaNode(incoming.formula) ? incoming.formula : base.formula,
      seuilTolerance: incoming.seuilTolerance ?? base.seuilTolerance ?? null,
      seuilAlerte: incoming.seuilAlerte ?? base.seuilAlerte ?? null,
      seuilAppetence: incoming.seuilAppetence ?? base.seuilAppetence ?? null,
      description: incoming.description || base.description,
      isActive: incoming.isActive,
      version: incoming.version || base.version,
      createdAt: incoming.createdAt || base.createdAt,
      updatedAt: incoming.updatedAt || base.updatedAt,
    };
  }

  private hasFormulaNode(formula: RatioFormulaNode | undefined): boolean {
    return !!formula?.type;
  }

  private normalizeSimulationResponse(payload: unknown, path: string): RatioSimulationResponseDTO {
    const asObject = this.requireObjectPayload(payload, path, 'simulate');

    const sqlExpression =
      this.safeString(asObject['sqlExpression']).trim()
      || this.safeString(asObject['sql']).trim()
      || '';

    const referencedParameters = this.toStringArray(
      asObject['referencedParameters'] ?? asObject['referencedParams']
    );

    const resolvedParameters = this.toRecord(asObject['resolvedParameters']);

    return {
      value: asObject['value'],
      sqlExpression,
      referencedParameters,
      resolvedParameters,
    };
  }

  private normalizeLookupPayload(payload: unknown, fallbackLabel: string): RatioLookupItem[] {
    const entries = this.extractLookupEntries(payload);
    const result = entries
      .map((entry) => this.normalizeLookupEntry(entry, fallbackLabel))
      .filter((entry): entry is RatioLookupItem => entry !== null);

    return this.uniqueLookup(result);
  }

  private extractLookupEntries(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const asObject = payload as Record<string, unknown>;
      const candidateKeys = ['items', 'content', 'rows', 'data', 'results'];

      for (const key of candidateKeys) {
        const value = asObject[key];
        if (Array.isArray(value)) {
          return value;
        }
      }

      return [asObject];
    }

    return [];
  }

  private normalizeLookupEntry(entry: unknown, fallbackLabel: string): RatioLookupItem | null {
    if (typeof entry === 'number') {
      if (entry > 0) {
        return {
          id: entry,
          name: `${fallbackLabel} ${entry}`,
        };
      }

      return null;
    }

    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const source = entry as Record<string, unknown>;
    const id = this.toNumber(
      source['id']
      ?? source['value']
      ?? source['familleId']
      ?? source['categorieId']
      ?? source['familyId']
      ?? source['categoryId']
      ?? source['idFamille']
      ?? source['idCategorie']
      ?? source['idFamilleRatio']
      ?? source['idCategorieRatio']
      ?? source['familleRatioId']
      ?? source['categorieRatioId']
    );

    if (!id) {
      return null;
    }

    const name = this.safeString(
      source['name']
      ?? source['label']
      ?? source['libelle']
      ?? source['nom']
      ?? source['titre']
      ?? source['nomFamille']
      ?? source['nomCategorie']
      ?? source['libelleFamille']
      ?? source['libelleCategorie']
      ?? source['designation']
      ?? source['description']
      ?? source['code']
      ?? source['codeFamille']
      ?? source['codeCategorie']
    );

    const normalizedName = this.normalizeHumanText(name) || `${fallbackLabel} ${id}`;

    return {
      id,
      name: normalizedName,
    };
  }

  private buildLookupFromCache(
    key: 'familleId' | 'categorieId',
    label: string
  ): RatioLookupItem[] {
    const ids = new Set<number>();

    this.readCache().forEach((item) => {
      const id = this.toNumber(item[key]);
      if (id > 0) {
        ids.add(id);
      }
    });

    const values = Array.from(ids)
      .sort((a, b) => a - b)
      .map((id) => ({ id, name: `${label} ${id}` }));

    return this.uniqueLookup(values);
  }

  private uniqueLookup(items: RatioLookupItem[]): RatioLookupItem[] {
    const map = new Map<number, RatioLookupItem>();

    items.forEach((item) => {
      if (item.id <= 0) {
        return;
      }

      const name = this.normalizeHumanText(item.name) || `ID ${item.id}`;
      map.set(item.id, {
        id: item.id,
        name,
      });
    });

    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
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

  private normalizeHumanText(value: unknown): string {
    const raw = this.safeString(value);
    if (!raw) {
      return '';
    }

    const compact = raw
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!compact) {
      return '';
    }

    if (!this.looksMojibake(compact)) {
      return compact;
    }

    const decoded = this.tryDecodeUtf8FromLatin1(compact);
    return decoded || compact;
  }

  private looksMojibake(value: string): boolean {
    return /Ã.|Â.|â.|�/.test(value);
  }

  private tryDecodeUtf8FromLatin1(value: string): string {
    try {
      const bytes = new Uint8Array(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8').decode(bytes)
        .replace(/[\t\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!decoded) {
        return '';
      }

      if (this.looksMojibake(decoded)) {
        return '';
      }

      return decoded;
    } catch {
      return '';
    }
  }

  private requireObjectPayload(
    payload: unknown,
    path: string,
    operation: string
  ): Record<string, unknown> {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }

    throw new RatioApiHttpError(
      502,
      this.buildApiError(
        502,
        payload,
        path,
        `Reponse invalide pour ${operation}. Objet JSON attendu.`
      )
    );
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

  private toFiniteNumber(value: unknown): number {
    const parsed = this.toNumber(value);
    return Number.isFinite(parsed) ? parsed : 0;
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

  private getSortTimestamp(item: Partial<RatioConfigResponseDTO>): number {
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
    return this.fetchJsonSingle<T>(url, options, timeoutMs);
  }

  private async fetchJsonSingle<T>(
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
          throw new RatioApiHttpError(response.status, apiError);
        }

        if (typeof payload === 'string' && payload.trim().length > 0) {
          throw new RatioApiHttpError(
            502,
            this.buildApiError(
              502,
              payload,
              url,
              'Reponse invalide. Objet JSON attendu.'
            )
          );
        }

        return payload as T;
      });
    } catch (error: unknown) {
      if (error instanceof RatioApiHttpError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        const apiError = this.buildApiError(408, null, url, 'Delai d\'attente de la requete depasse');
        throw new RatioApiHttpError(408, apiError);
      }

      const apiError = this.buildApiError(0, null, url, 'Erreur reseau lors de l\'appel API');
      throw new RatioApiHttpError(0, apiError);
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

  private mapOperatorToFormulaType(value: string): RatioFormulaNode['type'] {
    if (value === 'PARAM') {
      return 'PARAM';
    }

    if (value === 'CONSTANT') {
      return 'CONSTANT';
    }

    if (value === 'ADD' || value === '+') {
      return 'ADD';
    }

    if (value === 'SUBTRACT' || value === '-') {
      return 'SUBTRACT';
    }

    if (value === 'MULTIPLY' || value === '*') {
      return 'MULTIPLY';
    }

    if (value === 'DIVIDE' || value === '/') {
      return 'DIVIDE';
    }

    return 'CONSTANT';
  }
}
