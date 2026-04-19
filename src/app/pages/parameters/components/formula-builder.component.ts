import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  AggregationFunction,
  AGGREGATION_FUNCTIONS,
  FORMULA_NODE_TYPES,
  FormulaJson,
  FormulaNode,
  FormulaNodeType,
} from '../../../core/models/parameter.model';
import { FilterGroupBuilderComponent } from './filter-group-builder.component';
import { FieldPickerComponent } from './field-picker.component';

interface OrderByRow {
  field: string;
  direction: 'ASC' | 'DESC';
}

@Component({
  selector: 'app-formula-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FilterGroupBuilderComponent, FieldPickerComponent],
  templateUrl: './formula-builder.component.html',
  styleUrl: './formula-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaBuilderComponent implements OnChanges {
  @Input() model: FormulaJson = this.createDefaultFormula();
  @Input() supportedFields: string[] = [];
  @Input() supportedFieldsByTable: Record<string, string[]> = {};
  @Input() readonly = false;

  @Output() modelChange = new EventEmitter<FormulaJson>();

  readonly nodeTypes = FORMULA_NODE_TYPES;
  readonly aggregationFunctions = AGGREGATION_FUNCTIONS;

  workingModel: FormulaJson = this.createDefaultFormula();
  selectedFilterKey: 'where' | 'filter' | 'filters' = 'where';
  groupByFieldDraft = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['model']) {
      this.workingModel = this.cloneFormula(this.model ?? this.createDefaultFormula());
      this.normalizeModel();
      this.selectedFilterKey = this.resolveFilterKey(this.workingModel);
    }
  }

  onNodeTypeChange(node: FormulaNode, nextType: FormulaNodeType): void {
    if (this.readonly) {
      return;
    }

    this.overwriteNode(node, this.createNode(nextType));
    this.ensureArithmeticChildren(node);
    this.emitChange();
  }

  onNodeFieldChange(node: FormulaNode, field: string): void {
    if (this.readonly) {
      return;
    }

    node.field = field;
    this.emitChange();
  }

  onNodeFunctionChange(node: FormulaNode, fn: AggregationFunction): void {
    if (this.readonly || node.type !== 'AGGREGATION') {
      return;
    }

    node.function = fn;
    this.emitChange();
  }

  onDistinctChange(node: FormulaNode, distinct: boolean): void {
    if (this.readonly || node.type !== 'AGGREGATION') {
      return;
    }

    node.distinct = distinct;
    this.emitChange();
  }

  onAggregationFilterChange(node: FormulaNode, group: FormulaNode['filters'] | undefined): void {
    if (this.readonly || node.type !== 'AGGREGATION') {
      return;
    }

    node.filters = group;
    this.emitChange();
  }

  onAggregationOperandChange(node: FormulaNode, mode: 'field' | 'expression'): void {
    if (this.readonly || node.type !== 'AGGREGATION') {
      return;
    }

    if (mode === 'field') {
      node.field = node.field ?? this.supportedFields[0] ?? '';
      delete node.expression;
      this.emitChange();
      return;
    }

    node.expression = node.expression ?? this.createNode('FIELD');
    delete node.field;
    this.emitChange();
  }

  usesAggregationExpression(node: FormulaNode): boolean {
    return !!node.expression;
  }

  onNodeValueChange(node: FormulaNode, rawValue: string): void {
    if (this.readonly) {
      return;
    }

    node.value = this.parseScalar(rawValue);
    this.emitChange();
  }

  readNodeValue(node: FormulaNode): string {
    if (node.value === undefined || node.value === null) {
      return '';
    }

    if (typeof node.value === 'object') {
      return JSON.stringify(node.value);
    }

    return String(node.value);
  }

  ensureArithmeticChildren(node: FormulaNode): boolean {
    if (node.type !== 'ADD' && node.type !== 'SUBTRACT' && node.type !== 'MULTIPLY' && node.type !== 'DIVIDE') {
      return true;
    }

    if (!node.left) {
      node.left = this.createNode('FIELD');
    }

    if (!node.right) {
      node.right = this.createNode('FIELD');
    }

    return true;
  }

  selectFilterKey(nextKey: 'where' | 'filter' | 'filters'): void {
    this.selectedFilterKey = nextKey;
  }

  readSelectedFilterGroup() {
    if (this.selectedFilterKey === 'where') {
      return this.workingModel.where;
    }

    if (this.selectedFilterKey === 'filter') {
      return this.workingModel.filter;
    }

    return this.workingModel.filters;
  }

  onFilterGroupChange(group: any): void {
    if (this.readonly) {
      return;
    }

    this.workingModel.where = undefined;
    this.workingModel.filter = undefined;
    this.workingModel.filters = undefined;

    if (this.selectedFilterKey === 'where') {
      this.workingModel.where = group;
    }

    if (this.selectedFilterKey === 'filter') {
      this.workingModel.filter = group;
    }

    if (this.selectedFilterKey === 'filters') {
      this.workingModel.filters = group;
    }

    this.emitChange();
  }

  addGroupByField(): void {
    if (this.readonly) {
      return;
    }

    const value = this.groupByFieldDraft.trim();
    if (!value) {
      return;
    }

    const groupBy = this.workingModel.groupBy ?? [];
    if (!groupBy.includes(value)) {
      groupBy.push(value);
      this.workingModel.groupBy = groupBy;
      this.emitChange();
    }

    this.groupByFieldDraft = '';
  }

  removeGroupByField(index: number): void {
    if (this.readonly || !this.workingModel.groupBy) {
      return;
    }

    this.workingModel.groupBy.splice(index, 1);
    if (this.workingModel.groupBy.length === 0) {
      delete this.workingModel.groupBy;
    }

    this.emitChange();
  }

  addOrderBy(): void {
    if (this.readonly) {
      return;
    }

    const orderBy = this.readOrderByRows();
    orderBy.push({
      field: '',
      direction: 'ASC',
    });

    this.workingModel.orderBy = orderBy;
    this.emitChange();
  }

  removeOrderBy(index: number): void {
    if (this.readonly) {
      return;
    }

    const orderBy = this.readOrderByRows();
    orderBy.splice(index, 1);

    if (orderBy.length === 0) {
      delete this.workingModel.orderBy;
    } else {
      this.workingModel.orderBy = orderBy;
    }

    this.emitChange();
  }

  onOrderFieldChange(index: number, field: string): void {
    if (this.readonly) {
      return;
    }

    const orderBy = this.readOrderByRows();
    orderBy[index].field = field;
    this.workingModel.orderBy = orderBy;
    this.emitChange();
  }

  onOrderDirectionChange(index: number, direction: 'ASC' | 'DESC'): void {
    if (this.readonly) {
      return;
    }

    const orderBy = this.readOrderByRows();
    orderBy[index].direction = direction;
    this.workingModel.orderBy = orderBy;
    this.emitChange();
  }

  readOrderByRows(): OrderByRow[] {
    const rows = this.workingModel.orderBy ?? [];

    return rows.map((entry) => {
      if (typeof entry === 'string') {
        return {
          field: entry,
          direction: 'ASC',
        };
      }

      return {
        field: entry.field,
        direction: entry.direction ?? 'ASC',
      };
    });
  }

  onLimitChange(rawValue: string): void {
    if (this.readonly) {
      return;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) {
      delete this.workingModel.limit;
      this.emitChange();
      return;
    }

    this.workingModel.limit = Math.floor(value);
    delete this.workingModel.top;
    this.emitChange();
  }

  onTopChange(rawValue: string): void {
    if (this.readonly) {
      return;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) {
      delete this.workingModel.top;
      this.emitChange();
      return;
    }

    this.workingModel.top = Math.floor(value);
    delete this.workingModel.limit;
    this.emitChange();
  }

  trackByIndex(index: number): number {
    return index;
  }

  private createNode(type: FormulaNodeType): FormulaNode {
    if (type === 'FIELD') {
      return {
        type,
        field: this.supportedFields[0] ?? '',
      };
    }

    if (type === 'VALUE') {
      return {
        type,
        value: '',
      };
    }

    if (type === 'AGGREGATION') {
      return {
        type,
        function: 'SUM',
        field: this.supportedFields[0] ?? '',
        distinct: false,
      };
    }

    return {
      type,
      left: this.createNode('FIELD'),
      right: this.createNode('FIELD'),
    };
  }

  private createDefaultFormula(): FormulaJson {
    return {
      expression: {
        type: 'AGGREGATION',
        function: 'SUM',
        field: '',
      },
      where: {
        logic: 'AND',
        conditions: [],
        groups: [],
      },
    };
  }

  private overwriteNode(target: FormulaNode, source: FormulaNode): void {
    const keys = Object.keys(target) as Array<keyof FormulaNode>;
    keys.forEach((key) => delete target[key]);
    Object.assign(target, source);
  }

  private parseScalar(rawValue: string): unknown {
    const value = rawValue.trim();

    if (!value.length) {
      return '';
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    if (/^(true|false)$/i.test(value)) {
      return value.toLowerCase() === 'true';
    }

    if (value.toLowerCase() === 'null') {
      return null;
    }

    return value;
  }

  private emitChange(): void {
    this.modelChange.emit(this.cloneFormula(this.workingModel));
  }

  private cloneFormula(formula: FormulaJson): FormulaJson {
    return JSON.parse(JSON.stringify(formula)) as FormulaJson;
  }

  private normalizeModel(): void {
    if (!this.workingModel.expression) {
      this.workingModel.expression = this.createNode('AGGREGATION');
    }

    this.ensureArithmeticChildren(this.workingModel.expression);

    const normalizedOrderBy = this.readOrderByRows();
    if (normalizedOrderBy.length > 0) {
      this.workingModel.orderBy = normalizedOrderBy;
    }
  }

  private resolveFilterKey(formula: FormulaJson): 'where' | 'filter' | 'filters' {
    if (formula.filter) {
      return 'filter';
    }

    if (formula.filters) {
      return 'filters';
    }

    return 'where';
  }
}
