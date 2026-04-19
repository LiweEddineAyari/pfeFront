import { Injectable } from '@angular/core';
import {
  AGGREGATION_FUNCTIONS,
  FILTER_OPERATORS,
  FilterCondition,
  FilterGroup,
  FormulaJson,
  FormulaNode,
  FormulaNodeType,
  FormulaRequestDTO,
} from '../models/parameter.model';

@Injectable({ providedIn: 'root' })
export class ParameterFormValidationService {
  private readonly maxDepth = 5;

  validateRequest(payload: FormulaRequestDTO): string[] {
    const errors: string[] = [];

    if (!payload.code?.trim()) {
      errors.push('Le code est obligatoire.');
    }

    if (!payload.label?.trim()) {
      errors.push('Le libelle est obligatoire.');
    }

    const hasFormula = !!payload.formula;
    const hasNativeSql = !!payload.nativeSql?.trim();

    if (!hasFormula && !hasNativeSql) {
      errors.push('La formule ou le SQL natif est obligatoire.');
    }

    if (hasFormula && payload.formula) {
      this.validateFormula(payload.formula, errors);
    }

    if (hasNativeSql && payload.nativeSql && !/^\s*select\b/i.test(payload.nativeSql)) {
      errors.push('Le SQL natif doit commencer par SELECT.');
    }

    return errors;
  }

  private validateFormula(formula: FormulaJson, errors: string[]): void {
    if (!formula.expression) {
      errors.push('formula.expression est obligatoire.');
      return;
    }

    this.validateNode(formula.expression, 'formula.expression', 1, errors);

    if (formula.where) {
      this.validateFilterGroup(formula.where, 'formula.where', 1, errors);
    }

    if (formula.filter) {
      this.validateFilterGroup(formula.filter, 'formula.filter', 1, errors);
    }

    if (formula.filters) {
      this.validateFilterGroup(formula.filters, 'formula.filters', 1, errors);
    }

    if (formula.groupBy) {
      if (!Array.isArray(formula.groupBy)) {
        errors.push('formula.groupBy doit etre un tableau.');
      } else {
        formula.groupBy.forEach((field, index) => {
          if (!field || !field.trim()) {
            errors.push(`formula.groupBy[${index}] doit contenir un champ non vide.`);
          }
        });
      }
    }

    if (formula.orderBy) {
      if (!Array.isArray(formula.orderBy)) {
        errors.push('formula.orderBy doit etre un tableau.');
      } else {
        formula.orderBy.forEach((entry, index) => {
          if (typeof entry === 'string') {
            if (!entry.trim()) {
              errors.push(`formula.orderBy[${index}] ne doit pas etre vide.`);
            }
            return;
          }

          if (!entry.field?.trim()) {
            errors.push(`formula.orderBy[${index}].field est obligatoire.`);
          }

          if (entry.direction && !['ASC', 'DESC'].includes(entry.direction)) {
            errors.push(`formula.orderBy[${index}].direction doit etre ASC ou DESC.`);
          }
        });
      }
    }

    if (formula.limit !== undefined && formula.limit <= 0) {
      errors.push('formula.limit doit etre superieur a 0.');
    }

    if (formula.top !== undefined && formula.top <= 0) {
      errors.push('formula.top doit etre superieur a 0.');
    }

    if (formula.limit !== undefined && formula.top !== undefined) {
      errors.push('formula.limit et formula.top ne peuvent pas etre utilises ensemble.');
    }

    if ((formula.limit !== undefined || formula.top !== undefined) && !formula.orderBy?.length) {
      errors.push('formula.orderBy est obligatoire lorsque formula.limit ou formula.top est utilise.');
    }
  }

  private validateNode(
    node: FormulaNode,
    path: string,
    depth: number,
    errors: string[]
  ): void {
    if (depth > this.maxDepth) {
      errors.push(`${path} depasse la profondeur maximale (${this.maxDepth}).`);
      return;
    }

    if (!node.type) {
      errors.push(`${path}.type est obligatoire.`);
      return;
    }

    const type = node.type as FormulaNodeType;

    if (!['FIELD', 'VALUE', 'AGGREGATION', 'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'].includes(type)) {
      errors.push(`${path}.type contient une valeur non prise en charge : ${type}.`);
      return;
    }

    if (type === 'FIELD') {
      if (!node.field?.trim()) {
        errors.push(`${path}.field est obligatoire pour les noeuds FIELD.`);
      }
      return;
    }

    if (type === 'VALUE') {
      if (node.value === undefined) {
        errors.push(`${path}.value est obligatoire pour les noeuds VALUE.`);
      }
      return;
    }

    if (type === 'AGGREGATION') {
      if (!node.function || !AGGREGATION_FUNCTIONS.includes(node.function)) {
        errors.push(`${path}.function est obligatoire et doit etre SUM/AVG/COUNT/MIN/MAX.`);
      }

      const hasField = !!node.field?.trim();
      const hasExpression = !!node.expression;

      if (hasField && hasExpression) {
        errors.push(`${path} ne peut pas contenir a la fois field et expression.`);
      }

      if (!hasField && !hasExpression) {
        errors.push(`${path} requiert field ou expression.`);
      }

      if (hasExpression && node.expression) {
        this.validateNode(node.expression, `${path}.expression`, depth + 1, errors);
      }

      if (node.filters) {
        this.validateFilterGroup(node.filters, `${path}.filters`, depth + 1, errors);
      }

      return;
    }

    if (!node.left || !node.right) {
      errors.push(`${path} requiert les noeuds left et right.`);
      return;
    }

    this.validateNode(node.left, `${path}.left`, depth + 1, errors);
    this.validateNode(node.right, `${path}.right`, depth + 1, errors);
  }

  private validateFilterGroup(
    group: FilterGroup,
    path: string,
    depth: number,
    errors: string[]
  ): void {
    if (depth > this.maxDepth) {
      errors.push(`${path} depasse la profondeur maximale (${this.maxDepth}).`);
      return;
    }

    const logic = group.logic ?? 'AND';
    if (!['AND', 'OR'].includes(logic)) {
      errors.push(`${path}.logic doit etre AND ou OR.`);
    }

    const conditions = group.conditions ?? [];
    const groups = group.groups ?? [];

    if (conditions.length === 0 && groups.length === 0) {
      errors.push(`${path} ne peut pas etre vide (ajoutez des conditions ou des groupes imbriques).`);
    }

    conditions.forEach((condition, index) => {
      this.validateCondition(condition, `${path}.conditions[${index}]`, errors);
    });

    groups.forEach((child, index) => {
      this.validateFilterGroup(child, `${path}.groups[${index}]`, depth + 1, errors);
    });
  }

  private validateCondition(condition: FilterCondition, path: string, errors: string[]): void {
    if (!condition.field?.trim()) {
      errors.push(`${path}.field est obligatoire.`);
    }

    if (!condition.operator || !FILTER_OPERATORS.includes(condition.operator)) {
      errors.push(`${path}.operator est invalide.`);
      return;
    }

    if (this.isNullOperator(condition.operator)) {
      return;
    }

    if (this.isInOperator(condition.operator)) {
      if (!Array.isArray(condition.value) || condition.value.length === 0) {
        errors.push(`${path}.value doit etre un tableau non vide pour IN/NOT IN.`);
      }
      return;
    }

    if (condition.operator === 'BETWEEN') {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        errors.push(`${path}.value doit etre un tableau de exactement 2 valeurs pour BETWEEN.`);
      }
      return;
    }

    if (condition.value === undefined) {
      errors.push(`${path}.value est obligatoire.`);
    }
  }

  private isNullOperator(operator: string): boolean {
    return ['IS NULL', 'IS NOT NULL', 'IS_NULL', 'IS_NOT_NULL'].includes(operator);
  }

  private isInOperator(operator: string): boolean {
    return ['IN', 'NOT IN', 'NOT_IN'].includes(operator);
  }
}
