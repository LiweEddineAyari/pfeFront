import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  StressTestDiagnosticsResponseDTO,
  StressTestRequestDTO,
  StressTestResponseDTO,
} from '../models/stress-test.model';
import { ApiErrorResponse } from '../models/parameter.model';

/**
 * Typed wrapper around backend stress-test errors so that callers can
 * destructure the canonical { error, message, details } payload.
 */
export class StressTestApiError extends Error {
  constructor(
    public status: number,
    public apiError: ApiErrorResponse,
  ) {
    super(apiError.message);
    this.name = 'StressTestApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class StressTestApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/stress-test';

  /**
   * Runs an in-memory stress simulation and returns the deltas / impacts.
   * Mirrors `POST /stress-test/simulate`.
   */
  simulate(request: StressTestRequestDTO): Observable<StressTestResponseDTO> {
    return this.http
      .post<StressTestResponseDTO>(`${this.base}/simulate`, request)
      .pipe(
        map((response) => this.normalizeResponse(response)),
        catchError((error: HttpErrorResponse) => this.toApiError(error, `${this.base}/simulate`)),
      );
  }

  /**
   * Returns the available reference dates and row counts.
   * Mirrors `GET /stress-test/diagnostics?referenceDate=...`.
   */
  diagnostics(referenceDate?: string): Observable<StressTestDiagnosticsResponseDTO> {
    let params = new HttpParams();
    if (referenceDate && referenceDate.trim().length > 0) {
      params = params.set('referenceDate', referenceDate.trim());
    }

    return this.http
      .get<StressTestDiagnosticsResponseDTO>(`${this.base}/diagnostics`, { params })
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.toApiError(error, `${this.base}/diagnostics`),
        ),
      );
  }

  private normalizeResponse(raw: StressTestResponseDTO): StressTestResponseDTO {
    return {
      method: raw.method,
      referenceDate: raw.referenceDate,
      factRowsLoaded: this.toNumber(raw.factRowsLoaded),
      factRowsImpacted: this.toNumber(raw.factRowsImpacted),
      affectedFields: Array.isArray(raw.affectedFields) ? raw.affectedFields : [],
      affectedParameters: Array.isArray(raw.affectedParameters) ? raw.affectedParameters : [],
      affectedRatios: Array.isArray(raw.affectedRatios) ? raw.affectedRatios : [],
      parameters: Array.isArray(raw.parameters)
        ? raw.parameters.map((p) => ({
            code: String(p.code ?? ''),
            label: String(p.label ?? p.code ?? ''),
            original: this.toNumber(p.original),
            simulated: this.toNumber(p.simulated),
            delta: this.toNumber(p.delta),
            impactPercent: this.toNumber(p.impactPercent),
            impacted: !!p.impacted,
            changed: !!p.changed,
          }))
        : [],
      ratios: Array.isArray(raw.ratios)
        ? raw.ratios.map((r) => ({
            code: String(r.code ?? ''),
            label: String(r.label ?? r.code ?? ''),
            original: this.toNumber(r.original),
            simulated: this.toNumber(r.simulated),
            dashboardValue:
              r.dashboardValue === null || r.dashboardValue === undefined
                ? null
                : this.toNumber(r.dashboardValue),
            delta: this.toNumber(r.delta),
            impactPercent: this.toNumber(r.impactPercent),
            impacted: !!r.impacted,
            changed: !!r.changed,
          }))
        : [],
    };
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  private toApiError(error: HttpErrorResponse, path: string): Observable<never> {
    const status = error.status ?? 0;
    const payload = error.error;

    let apiError: ApiErrorResponse;
    if (payload && typeof payload === 'object' && typeof payload.message === 'string') {
      apiError = {
        timestamp: payload.timestamp ?? new Date().toISOString(),
        status: payload.status ?? status,
        error: payload.error ?? `HTTP_${status}`,
        message: payload.message,
        details: Array.isArray(payload.details) ? payload.details : [],
        path: payload.path ?? path,
      };
    } else {
      apiError = {
        timestamp: new Date().toISOString(),
        status,
        error: status === 0 ? 'NETWORK_ERROR' : `HTTP_${status}`,
        message:
          status === 0
            ? 'Erreur reseau lors de l\'appel au moteur de stress test.'
            : (typeof payload === 'string' && payload.length > 0
                ? payload
                : `La requete stress-test a echoue avec le statut ${status}.`),
        details: [],
        path,
      };
    }

    return throwError(() => new StressTestApiError(status, apiError));
  }
}
