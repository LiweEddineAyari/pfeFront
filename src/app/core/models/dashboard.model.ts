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
