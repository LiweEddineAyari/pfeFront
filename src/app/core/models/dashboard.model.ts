export interface DashboardCreateRequestDTO {
  idRatios: number;
  value: number;
  date: string;
}

export interface DashboardRowResponseDTO {
  id: number;
  idRatios: number;
  code: string;
  label: string;
  description: string;
  familleId: number;
  categorieId: number;
  familleCode: string;
  categorieCode: string;
  seuilTolerance: number | null;
  seuilAlerte: number | null;
  seuilAppetence: number | null;
  value: number;
  date: string;
}

/**
 * Response shape of GET /api/dashboard/grouped-by-ratio.
 * Outer key  = ratio code (e.g. "RCET1").
 * Inner key  = ISO date string (yyyy-mm-dd).
 * Inner val  = ratio numeric value at that date.
 */
export type DashboardGroupedByRatioResponse = Record<string, Record<string, number>>;
