import { Injectable, NgZone } from '@angular/core';

import {
  DashboardGroupedByRatioResponse,
  DashboardRowResponseDTO,
} from '../models/dashboard.model';
import { ApiErrorResponse, RatioLookupItem } from '../models/ratio.model';

export class DashboardApiHttpError extends Error {
  constructor(
    public status: number,
    public apiError: ApiErrorResponse
  ) {
    super(apiError.message);
    this.name = 'DashboardApiHttpError';
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly dashboardBase = '/api/dashboard';
  private readonly familiesPath = '/api/ratios/families';
  private readonly categoriesPath = '/api/ratios/categories';

  constructor(private zone: NgZone) {}

  async listRows(date?: string): Promise<DashboardRowResponseDTO[]> {
    const normalizedDate = (date ?? '').trim();

    if (!normalizedDate) {
      const payload = await this.fetchJson<unknown>(this.dashboardBase, { method: 'GET' });
      return this.normalizeRowsPayload(payload, this.dashboardBase);
    }

    const queryPath = `${this.dashboardBase}?date=${encodeURIComponent(normalizedDate)}`;

    try {
      const payload = await this.fetchJson<unknown>(queryPath, { method: 'GET' });
      return this.normalizeRowsPayload(payload, queryPath);
    } catch (error) {
      if (!(error instanceof DashboardApiHttpError) || ![404, 405, 501].includes(error.status)) {
        throw error;
      }

      const datePath = `${this.dashboardBase}/date/${encodeURIComponent(normalizedDate)}`;
      const payload = await this.fetchJson<unknown>(datePath, { method: 'GET' });
      return this.normalizeRowsPayload(payload, datePath);
    }
  }

  /**
   * Time-series view used by the dashboard line chart cards.
   * Returns a map of `code -> { isoDate -> value }`.
   */
  async groupedByRatio(): Promise<DashboardGroupedByRatioResponse> {
    const path = `${this.dashboardBase}/grouped-by-ratio`;
    const payload = await this.fetchJson<unknown>(path, { method: 'GET' });
    return this.normalizeGroupedByRatioPayload(payload, path);
  }

  private normalizeGroupedByRatioPayload(
    payload: unknown,
    path: string
  ): DashboardGroupedByRatioResponse {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new DashboardApiHttpError(
        502,
        this.buildApiError(
          502,
          payload,
          path,
          'Reponse invalide. Map<code, Map<date, value>> attendue.'
        )
      );
    }

    const result: DashboardGroupedByRatioResponse = {};
    // Unwrap envelope keys like { "ratios": {...} } or { "data": {...} }.
    const top = payload as Record<string, unknown>;
    const envelopeKeys = ['ratios', 'data', 'items', 'content', 'results'];
    let unwrapped: unknown = payload;
    for (const key of envelopeKeys) {
      const candidate = top[key];
      if (
        candidate &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate)
      ) {
        unwrapped = candidate;
        break;
      }
    }

    const source = unwrapped as Record<string, unknown>;

    for (const [code, series] of Object.entries(source)) {
      if (!series || typeof series !== 'object' || Array.isArray(series)) {
        continue;
      }

      const normalizedSeries: Record<string, number> = {};
      for (const [date, raw] of Object.entries(series as Record<string, unknown>)) {
        const value = this.toNullableNumber(raw);
        if (date.trim() && value !== null) {
          normalizedSeries[date.trim()] = value;
        }
      }

      if (Object.keys(normalizedSeries).length > 0) {
        result[code.trim()] = normalizedSeries;
      }
    }

    return result;
  }

  async listFamilies(): Promise<RatioLookupItem[]> {
    const payload = await this.fetchJson<unknown>(this.familiesPath, { method: 'GET' });
    return this.normalizeLookupPayload(payload, 'Famille');
  }

  async listCategories(): Promise<RatioLookupItem[]> {
    const payload = await this.fetchJson<unknown>(this.categoriesPath, { method: 'GET' });
    return this.normalizeLookupPayload(payload, 'Categorie');
  }

  private normalizeRowsPayload(payload: unknown, path: string): DashboardRowResponseDTO[] {
    const entries = this.extractArrayPayload(payload);
    const rows = entries
      .map((entry) => this.normalizeRow(entry))
      .filter((entry): entry is DashboardRowResponseDTO => entry !== null);

    if (rows.length > 0) {
      return rows;
    }

    if (entries.length === 0) {
      return [];
    }

    throw new DashboardApiHttpError(
      502,
      this.buildApiError(502, payload, path, 'Reponse dashboard invalide. Tableau de lignes attendu.')
    );
  }

  private normalizeRow(entry: unknown): DashboardRowResponseDTO | null {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const source = entry as Record<string, unknown>;
    const idRatios = this.toNumber(
      source['idRatios']
      ?? source['idRatio']
      ?? source['ratioId']
      ?? source['ratiosId']
    );
    const code = this.safeString(source['code']).trim();
    const date = this.safeString(source['date'] ?? source['referenceDate']).trim();

    if (!idRatios || !code || !date) {
      return null;
    }

    return {
      id: this.toNumber(source['id']),
      idRatios,
      code,
      label: this.normalizeHumanText(source['label'] ?? source['libelle']) || code,
      description: this.normalizeHumanText(source['description']),
      familleId: this.toNumber(source['familleId'] ?? source['familyId']),
      categorieId: this.toNumber(source['categorieId'] ?? source['categoryId']),
      familleCode: this.normalizeHumanText(source['familleCode'] ?? source['familyCode']),
      categorieCode: this.normalizeHumanText(source['categorieCode'] ?? source['categoryCode']),
      seuilTolerance: this.toNullableNumber(source['seuilTolerance'] ?? source['thresholdTolerance']),
      seuilAlerte: this.toNullableNumber(source['seuilAlerte'] ?? source['thresholdAlert']),
      seuilAppetence: this.toNullableNumber(source['seuilAppetence'] ?? source['thresholdAppetite']),
      value: this.toNumber(source['value']),
      date,
    };
  }

  private normalizeLookupPayload(payload: unknown, fallbackLabel: string): RatioLookupItem[] {
    const entries = this.extractArrayPayload(payload);
    const map = new Map<number, RatioLookupItem>();

    entries.forEach((entry) => {
      const normalized = this.normalizeLookupItem(entry, fallbackLabel);
      if (!normalized) {
        return;
      }

      map.set(normalized.id, normalized);
    });

    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }

  private normalizeLookupItem(entry: unknown, fallbackLabel: string): RatioLookupItem | null {
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
    );

    if (!id) {
      return null;
    }

    const name = this.normalizeHumanText(
      source['name']
      ?? source['label']
      ?? source['libelle']
      ?? source['nom']
      ?? source['nomFamille']
      ?? source['nomCategorie']
      ?? source['libelleFamille']
      ?? source['libelleCategorie']
    ) || `${fallbackLabel} ${id}`;

    return {
      id,
      name,
    };
  }

  private extractArrayPayload(payload: unknown): unknown[] {
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

  private async fetchJson<T>(url: string, options: RequestInit = {}, timeoutMs = 120000): Promise<T> {
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
          throw new DashboardApiHttpError(response.status, this.buildApiError(response.status, payload, url));
        }

        if (typeof payload === 'string' && payload.trim().length > 0) {
          throw new DashboardApiHttpError(
            502,
            this.buildApiError(502, payload, url, 'Reponse invalide. Objet JSON attendu.')
          );
        }

        return payload as T;
      });
    } catch (error: unknown) {
      if (error instanceof DashboardApiHttpError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DashboardApiHttpError(
          408,
          this.buildApiError(408, null, url, 'Delai d\'attente de la requete depasse')
        );
      }

      throw new DashboardApiHttpError(
        0,
        this.buildApiError(0, null, url, 'Erreur reseau lors de l\'appel API')
      );
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
      message: fallbackMessage
        ?? (typeof payload === 'string' && payload.trim().length > 0
          ? payload
          : `La requete a echoue avec le statut ${status}`),
      details: [],
      path,
    };
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

      if (!decoded || this.looksMojibake(decoded)) {
        return '';
      }

      return decoded;
    } catch {
      return '';
    }
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
