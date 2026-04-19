import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { FILTER_OPERATORS, FilterCondition, FilterGroup, FilterOperator } from '../../../core/models/parameter.model';
import { FieldPickerComponent } from './field-picker.component';

@Component({
  selector: 'app-filter-group-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FieldPickerComponent],
  templateUrl: './filter-group-builder.component.html',
  styleUrl: './filter-group-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterGroupBuilderComponent {
  @Input() group: FilterGroup | undefined;
  @Input() supportedFields: string[] = [];
  @Input() supportedFieldsByTable: Record<string, string[]> = {};
  @Input() title = 'Groupe de filtres';
  @Input() readonly = false;

  @Output() groupChange = new EventEmitter<FilterGroup | undefined>();

  readonly operators = FILTER_OPERATORS;

  enableGroup(): void {
    if (this.readonly) {
      return;
    }

    this.group = {
      logic: 'AND',
      conditions: [this.createEmptyCondition()],
      groups: [],
    };
    this.emitGroupChanged();
  }

  clearGroup(): void {
    if (this.readonly) {
      return;
    }

    this.group = undefined;
    this.emitGroupChanged();
  }

  addCondition(target: FilterGroup): void {
    if (this.readonly) {
      return;
    }

    if (!target.conditions) {
      target.conditions = [];
    }

    target.conditions.push(this.createEmptyCondition());
    this.emitGroupChanged();
  }

  removeCondition(target: FilterGroup, index: number): void {
    if (this.readonly || !target.conditions) {
      return;
    }

    target.conditions.splice(index, 1);
    this.emitGroupChanged();
  }

  addNestedGroup(target: FilterGroup): void {
    if (this.readonly) {
      return;
    }

    if (!target.groups) {
      target.groups = [];
    }

    target.groups.push({
      logic: 'AND',
      conditions: [this.createEmptyCondition()],
      groups: [],
    });

    this.emitGroupChanged();
  }

  removeNestedGroup(target: FilterGroup, index: number): void {
    if (this.readonly || !target.groups) {
      return;
    }

    target.groups.splice(index, 1);
    this.emitGroupChanged();
  }

  onOperatorChange(condition: FilterCondition): void {
    if (this.readonly) {
      return;
    }

    if (this.isNullOperator(condition.operator)) {
      delete condition.value;
      this.emitGroupChanged();
      return;
    }

    if (this.isInOperator(condition.operator)) {
      condition.value = [];
      this.emitGroupChanged();
      return;
    }

    if (condition.operator === 'BETWEEN') {
      condition.value = ['', ''];
      this.emitGroupChanged();
      return;
    }

    condition.value = '';
    this.emitGroupChanged();
  }

  onScalarValueChange(condition: FilterCondition, rawValue: string): void {
    if (this.readonly) {
      return;
    }

    condition.value = this.parseScalar(rawValue);
    this.emitGroupChanged();
  }

  onInValueChange(condition: FilterCondition, rawValue: string): void {
    if (this.readonly) {
      return;
    }

    const values = rawValue
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => this.parseScalar(entry));

    condition.value = values;
    this.emitGroupChanged();
  }

  onBetweenValueChange(condition: FilterCondition, index: 0 | 1, rawValue: string): void {
    if (this.readonly) {
      return;
    }

    const between = this.readBetweenArray(condition);
    between[index] = this.parseScalar(rawValue);
    condition.value = between;
    this.emitGroupChanged();
  }

  getScalarValue(condition: FilterCondition): string {
    if (condition.value === undefined || condition.value === null) {
      return '';
    }

    if (Array.isArray(condition.value)) {
      return '';
    }

    return String(condition.value);
  }

  getInValue(condition: FilterCondition): string {
    if (!Array.isArray(condition.value)) {
      return '';
    }

    return condition.value.map((entry) => String(entry)).join(', ');
  }

  getBetweenValue(condition: FilterCondition, index: 0 | 1): string {
    const values = this.readBetweenArray(condition);
    const value = values[index];

    if (value === undefined || value === null) {
      return '';
    }

    return String(value);
  }

  isNullOperator(operator: FilterOperator): boolean {
    return ['IS NULL', 'IS NOT NULL', 'IS_NULL', 'IS_NOT_NULL'].includes(operator);
  }

  isInOperator(operator: FilterOperator): boolean {
    return ['IN', 'NOT IN', 'NOT_IN'].includes(operator);
  }

  isBetweenOperator(operator: FilterOperator): boolean {
    return operator === 'BETWEEN';
  }

  emitGroupChanged(): void {
    this.groupChange.emit(this.group ? this.cloneGroup(this.group) : undefined);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private createEmptyCondition(): FilterCondition {
    return {
      field: '',
      operator: '=',
      value: '',
    };
  }

  private readBetweenArray(condition: FilterCondition): [unknown, unknown] {
    if (!Array.isArray(condition.value) || condition.value.length < 2) {
      return ['', ''];
    }

    return [condition.value[0], condition.value[1]];
  }

  private parseScalar(rawValue: string): unknown {
    const value = rawValue.trim();

    if (value.length === 0) {
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

  private cloneGroup(group: FilterGroup): FilterGroup {
    return JSON.parse(JSON.stringify(group)) as FilterGroup;
  }
}
