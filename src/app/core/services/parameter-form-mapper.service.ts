import { Injectable } from '@angular/core';
import {
  FormMode,
  FormulaJson,
  FormulaRequestDTO,
  ParameterConfigResponseDTO,
  ParameterFormDraft,
} from '../models/parameter.model';

@Injectable({ providedIn: 'root' })
export class ParameterFormMapperService {
  toFormDraft(parameter: ParameterConfigResponseDTO): ParameterFormDraft {
    const safeFormula = this.hasFormulaExpression(parameter.formula)
      ? this.cloneFormula(parameter.formula)
      : this.createFallbackFormula();

    return {
      mode: 'FORMULA',
      code: parameter.code ?? '',
      label: parameter.label ?? '',
      isActive: parameter.isActive,
      formulaDraft: safeFormula,
      nativeSqlDraft: '',
    };
  }

  toRequestPayload(input: {
    mode: FormMode;
    code: string;
    label: string;
    isActive: boolean;
    formulaDraft?: FormulaJson;
    nativeSqlDraft?: string;
  }): FormulaRequestDTO {
    const payload: FormulaRequestDTO = {
      code: input.code.trim(),
      label: input.label.trim(),
      isActive: input.isActive,
    };

    if (input.mode === 'FORMULA') {
      if (input.formulaDraft) {
        payload.formula = this.cloneFormula(input.formulaDraft);
      }
      return payload;
    }

    payload.nativeSql = input.nativeSqlDraft?.trim() ?? '';
    return payload;
  }

  cloneFormula(formula: FormulaJson): FormulaJson {
    return JSON.parse(JSON.stringify(formula)) as FormulaJson;
  }

  private hasFormulaExpression(formula: FormulaJson | undefined): boolean {
    return !!formula?.expression;
  }

  private createFallbackFormula(): FormulaJson {
    return {
      expression: {
        type: 'AGGREGATION',
        function: 'SUM',
        field: '',
      },
    };
  }
}
