import { FilterGroup, FormulaJson } from './parameter.model';

export type StressTestMethod = 'BALANCE' | 'PARAMETER';

export type BalanceOperation = 'SET' | 'ADD' | 'SUBTRACT';

export type ParameterOperation = 'MULTIPLY' | 'ADD' | 'REPLACE' | 'MODIFY_FORMULA';

export type BalanceField =
  | 'soldeorigine'
  | 'soldeconvertie'
  | 'cumulmvtdb'
  | 'cumulmvtcr'
  | 'soldeinitdebmois'
  | 'amount';

export const BALANCE_FIELDS: ReadonlyArray<{ value: BalanceField; label: string; hint: string }> = [
  { value: 'soldeconvertie', label: 'Solde converti', hint: 'Montant exprime en devise consolidee.' },
  { value: 'soldeorigine', label: 'Solde origine', hint: 'Montant en devise d\'origine du compte.' },
  { value: 'cumulmvtdb', label: 'Cumul mouvements debit', hint: 'Cumul des mouvements debiteurs.' },
  { value: 'cumulmvtcr', label: 'Cumul mouvements credit', hint: 'Cumul des mouvements crediteurs.' },
  { value: 'soldeinitdebmois', label: 'Solde initial debut mois', hint: 'Solde de reference debut de periode.' },
  { value: 'amount', label: 'Montant', hint: 'Montant generique de transaction.' },
];

export const BALANCE_OPERATIONS: ReadonlyArray<{ value: BalanceOperation; label: string; description: string; icon: string }> = [
  { value: 'SET',      label: 'SET',      description: 'Remplace la valeur du champ.',                     icon: 'equal' },
  { value: 'ADD',      label: 'ADD',      description: 'Ajoute la valeur (impact positif net).',           icon: 'plus' },
  { value: 'SUBTRACT', label: 'SUBTRACT', description: 'Retranche la valeur (impact negatif net).',        icon: 'minus' },
];

export const PARAMETER_OPERATIONS: ReadonlyArray<{ value: ParameterOperation; label: string; description: string; icon: string }> = [
  { value: 'MULTIPLY',       label: 'MULTIPLY',       description: 'simule = baseline * value',          icon: 'x' },
  { value: 'ADD',            label: 'ADD',            description: 'simule = baseline + value',          icon: 'plus' },
  { value: 'REPLACE',        label: 'REPLACE',        description: 'simule = value',                     icon: 'equal' },
  { value: 'MODIFY_FORMULA', label: 'MODIFY_FORMULA', description: 'evalue une formule de remplacement', icon: 'braces' },
];

/**
 * Request DTOs (mirror StressTestRequestDTO)
 */
export interface BalanceAdjustmentDTO {
  operation: BalanceOperation;
  field: BalanceField | string;
  value: number;
  filters?: FilterGroup;
}

export interface ParameterAdjustmentDTO {
  operation: ParameterOperation;
  code: string;
  value?: number;
  formula?: FormulaJson;
}

export interface StressTestRequestDTO {
  method: StressTestMethod;
  referenceDate: string;
  balanceAdjustments?: BalanceAdjustmentDTO[];
  parameterAdjustments?: ParameterAdjustmentDTO[];
  parameterCodes?: string[];
  ratioCodes?: string[];
}

/**
 * Response DTOs (mirror StressTestResponseDTO)
 */
export interface ParameterImpactDTO {
  code: string;
  label: string;
  original: number;
  simulated: number;
  delta: number;
  impactPercent: number;
  impacted: boolean;
  changed: boolean;
}

export interface RatioImpactDTO extends ParameterImpactDTO {
  /** Stored dashboard ratio value for the reference date (informational only). */
  dashboardValue: number | null;
}

export interface StressTestResponseDTO {
  method: StressTestMethod;
  referenceDate: string;
  factRowsLoaded: number;
  factRowsImpacted: number;
  affectedFields: string[];
  affectedParameters: string[];
  affectedRatios: string[];
  parameters: ParameterImpactDTO[];
  ratios: RatioImpactDTO[];
}

export interface StressTestDiagnosticsResponseDTO {
  referenceDate: string | null;
  rowCountForReferenceDate: number;
  availableReferenceDates: string[];
  totalFactRows: number;
}

/** Known stress-test error codes returned by the backend. */
export const STRESS_TEST_ERROR_CODES = [
  'INVALID_REQUEST',
  'INVALID_OPERATION',
  'UNBALANCED_SIMULATION',
  'UNKNOWN_FIELD',
  'UNKNOWN_PARAMETER',
  'UNKNOWN_RATIO',
  'NO_DATA_FOR_DATE',
] as const;

export type StressTestErrorCode = typeof STRESS_TEST_ERROR_CODES[number];

/**
 * Sentinel epsilon for the "balanced" constraint:
 *   sum(positive deltas) == sum(negative deltas) within 1e-6
 */
export const BALANCE_EPSILON = 1e-6;
