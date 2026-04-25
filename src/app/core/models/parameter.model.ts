export type FormulaNodeType =
  | 'FIELD'
  | 'VALUE'
  | 'AGGREGATION'
  | 'ADD'
  | 'SUBTRACT'
  | 'MULTIPLY'
  | 'DIVIDE';

export type AggregationFunction = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';

export type FilterLogic = 'AND' | 'OR';

export type FilterOperator =
  | '='
  | '!='
  | '<>'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'EQ'
  | 'NE'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'NOT_IN'
  | 'IS_NULL'
  | 'IS_NOT_NULL'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'CONTAINS';

export interface FormulaNode {
  type: FormulaNodeType;
  field?: string;
  value?: unknown;
  function?: AggregationFunction;
  expression?: FormulaNode;
  left?: FormulaNode;
  right?: FormulaNode;
  distinct?: boolean;
  filters?: FilterGroup;
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface FilterGroup {
  logic?: FilterLogic;
  conditions?: FilterCondition[];
  groups?: FilterGroup[];
}

export interface FormulaJson {
  expression: FormulaNode;
  where?: FilterGroup;
  filter?: FilterGroup;
  filters?: FilterGroup;
  groupBy?: string[];
  orderBy?: Array<string | { field: string; direction?: 'ASC' | 'DESC' }>;
  limit?: number;
  top?: number;
}

export interface FormulaRequestDTO {
  code: string;
  label: string;
  formula?: FormulaJson;
  nativeSql?: string;
  isActive?: boolean;
}

export interface ParameterConfigResponseDTO {
  id: number;
  code: string;
  label: string;
  formula: FormulaJson;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormulaSqlResponseDTO {
  code: string;
  version: number;
  sql: string;
  parameters: unknown[];
  referencedFields: string[];
  joins: string[];
  groupByFields: string[];
  orderBy: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  limit?: number | null;
  top?: number | null;
}

export interface FormulaExecutionResponseDTO {
  code: string;
  sql: string;
  parameters: unknown[];
  referenceDate?: string | null;
  value: unknown;
}

export interface SupportedFieldsResponseDTO {
  fields: string[];
  fieldsByTable: Record<string, string[]>;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details: string[];
  path: string;
}

export interface ParameterListParams {
  page?: number;
  size?: number;
  search?: string;
}

export interface ParameterListResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  items: ParameterConfigResponseDTO[];
  source: 'api' | 'cache';
}

export type FormMode = 'FORMULA' | 'SQL';

export interface ParameterFormDraft {
  mode: FormMode;
  code: string;
  label: string;
  isActive: boolean;
  formulaDraft?: FormulaJson;
  nativeSqlDraft?: string;
}

export interface ParameterFormState {
  mode: FormMode;
  isEdit: boolean;
  originalCode?: string;
  formulaDraft?: FormulaJson;
  nativeSqlDraft?: string;
  compiledSqlPreview?: FormulaSqlResponseDTO;
}

export const FILTER_OPERATORS: FilterOperator[] = [
  '=',
  '!=',
  '<>',
  '>',
  '>=',
  '<',
  '<=',
  'LIKE',
  'IN',
  'NOT IN',
  'BETWEEN',
  'IS NULL',
  'IS NOT NULL',
  'STARTS_WITH',
  'ENDS_WITH',
  'CONTAINS',
  'EQ',
  'NE',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'NOT_IN',
  'IS_NULL',
  'IS_NOT_NULL',
];

export const FORMULA_NODE_TYPES: FormulaNodeType[] = [
  'FIELD',
  'VALUE',
  'AGGREGATION',
  'ADD',
  'SUBTRACT',
  'MULTIPLY',
  'DIVIDE',
];

export const AGGREGATION_FUNCTIONS: AggregationFunction[] = [
  'SUM',
  'AVG',
  'COUNT',
  'MIN',
  'MAX',
];

export const FILTER_LOGICS: FilterLogic[] = ['AND', 'OR'];
