export type RatioFormulaNodeType =
  | 'PARAM'
  | 'CONSTANT'
  | 'ADD'
  | 'SUBTRACT'
  | 'MULTIPLY'
  | 'DIVIDE';

export interface RatioFormulaNode {
  type: RatioFormulaNodeType;
  code?: string;
  value?: number;
  left?: RatioFormulaNode;
  right?: RatioFormulaNode;
}

export interface RatioRequestDTO {
  code: string;
  label: string;
  familleId: number;
  categorieId: number;
  formula: RatioFormulaNode;
  seuilTolerance?: number | null;
  seuilAlerte?: number | null;
  seuilAppetence?: number | null;
  description?: string;
  isActive?: boolean;
}

export interface RatioConfigResponseDTO {
  id: number;
  code: string;
  label: string;
  familleId: number;
  categorieId: number;
  formula: RatioFormulaNode;
  seuilTolerance?: number | null;
  seuilAlerte?: number | null;
  seuilAppetence?: number | null;
  description?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatioLookupItem {
  id: number;
  name: string;
}

export interface RatioSimulationResponseDTO {
  value: unknown;
  sqlExpression: string;
  referencedParameters: string[];
  resolvedParameters: Record<string, unknown>;
}

export interface RatioExecutionResponseDTO extends RatioSimulationResponseDTO {
  code: string;
  referenceDate: string | null;
}

export interface RatioListParams {
  page?: number;
  size?: number;
  search?: string;
}

export interface RatioListResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  items: RatioConfigResponseDTO[];
  source: 'api' | 'cache';
}

export interface RatioFormDraft {
  code: string;
  label: string;
  familleId: number | null;
  categorieId: number | null;
  formula: RatioFormulaNode;
  seuilTolerance: number | null;
  seuilAlerte: number | null;
  seuilAppetence: number | null;
  description: string;
  isActive: boolean;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details: string[];
  path: string;
}
