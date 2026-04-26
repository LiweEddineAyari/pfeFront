import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, takeUntil } from 'rxjs';
import {
  BALANCE_EPSILON,
  BALANCE_FIELDS,
  BALANCE_OPERATIONS,
  BalanceAdjustmentDTO,
  BalanceField,
  BalanceOperation,
} from '../../../core/models/stress-test.model';
import { FilterGroup } from '../../../core/models/parameter.model';
import { FilterGroupBuilderComponent } from '../../parameters/components/filter-group-builder.component';
import { BalanceValidatorState } from './balance-validator-bar.component';

interface BalanceRowFormShape {
  operation: FormControl<BalanceOperation>;
  field: FormControl<BalanceField | string>;
  value: FormControl<number | null>;
  filtersExpanded: FormControl<boolean>;
  filters: FormControl<FilterGroup | null>;
}

type BalanceRowGroup = FormGroup<BalanceRowFormShape>;

@Component({
  selector: 'app-balance-adjustments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    FilterGroupBuilderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './balance-adjustments.component.html',
  styleUrl: './balance-adjustments.component.css',
})
export class BalanceAdjustmentsComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  @Input() supportedFields: string[] = [];
  @Input() supportedFieldsByTable: Record<string, string[]> = {};

  @Output() rowsChange = new EventEmitter<BalanceAdjustmentDTO[]>();
  @Output() validatorStateChange = new EventEmitter<BalanceValidatorState>();

  readonly operations = BALANCE_OPERATIONS;
  readonly balanceFields = BALANCE_FIELDS;

  rowsArray = new FormArray<BalanceRowGroup>([], this.balanceArrayValidator());

  ngOnInit(): void {
    if (this.rowsArray.length === 0) {
      this.addRow('ADD');
      this.addRow('SUBTRACT');
    }

    this.rowsArray.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.emitState());

    this.emitState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addRow(initialOp: BalanceOperation = 'ADD'): void {
    this.rowsArray.push(this.buildRow(initialOp));
    this.cdr.markForCheck();
  }

  removeRow(index: number): void {
    this.rowsArray.removeAt(index);
    this.cdr.markForCheck();
  }

  setOperation(row: BalanceRowGroup, op: BalanceOperation): void {
    row.controls.operation.setValue(op);
  }

  toggleFiltersExpanded(row: BalanceRowGroup): void {
    row.controls.filtersExpanded.setValue(!row.controls.filtersExpanded.value);
  }

  onFiltersChanged(row: BalanceRowGroup, group: FilterGroup | undefined): void {
    row.controls.filters.setValue(group ?? null);
  }

  /**
   * Reset everything and load adjustments from outside (e.g. preset).
   */
  setRows(rows: BalanceAdjustmentDTO[]): void {
    this.rowsArray.clear();
    rows.forEach((row) => {
      this.rowsArray.push(
        this.buildRow(row.operation, row.field, row.value, row.filters),
      );
    });
    this.cdr.markForCheck();
  }

  trackByRow(index: number): number {
    return index;
  }

  /**
   * Returns the current rows in DTO shape (drops UI-only filtersExpanded).
   * Used by the host to build the simulate request.
   */
  toAdjustments(): BalanceAdjustmentDTO[] {
    return this.rowsArray.controls.map((row) => {
      const filtersValue = row.controls.filters.value;
      const dto: BalanceAdjustmentDTO = {
        operation: row.controls.operation.value as BalanceOperation,
        field: row.controls.field.value as BalanceField,
        value: Number(row.controls.value.value ?? 0),
      };
      if (filtersValue && this.hasMeaningfulFilter(filtersValue)) {
        dto.filters = filtersValue;
      }
      return dto;
    });
  }

  /**
   * The sticky validator computes positive/negative totals over the rows where:
   *   - ADD contributes +value
   *   - SUBTRACT contributes -value
   *   - SET cannot be balance-checked statically (flagged separately)
   * Balanced when |positive - negative| < epsilon, or when only SET rows exist
   * (deferred to backend) AND no scalar imbalance.
   */
  private computeValidatorState(): BalanceValidatorState {
    let positive = 0;
    let negative = 0;
    let hasSetOperation = false;
    let nonSetRowCount = 0;

    for (const row of this.rowsArray.controls) {
      const op = row.controls.operation.value;
      const rawValue = Number(row.controls.value.value ?? 0);
      const value = Number.isFinite(rawValue) ? rawValue : 0;

      if (op === 'SET') {
        hasSetOperation = true;
        continue;
      }

      nonSetRowCount += 1;

      if (op === 'ADD') {
        if (value >= 0) positive += value;
        else negative += Math.abs(value);
      } else if (op === 'SUBTRACT') {
        if (value >= 0) negative += value;
        else positive += Math.abs(value);
      }
    }

    const difference = positive - negative;
    const balanced =
      this.rowsArray.length > 0 &&
      Math.abs(difference) < BALANCE_EPSILON &&
      // require at least one signed contribution OR all rows are SET
      (nonSetRowCount > 0 || hasSetOperation);

    return {
      positive,
      negative,
      difference,
      balanced,
      hasSetOperation,
      rowCount: this.rowsArray.length,
    };
  }

  private balanceArrayValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      // Use the same logic as computeValidatorState, but operate on raw value.
      const value = (control.value as Array<{ operation: BalanceOperation; value: number | null }>) ?? [];
      let positive = 0;
      let negative = 0;
      for (const row of value) {
        const v = Number(row?.value ?? 0);
        if (!Number.isFinite(v)) continue;
        if (row?.operation === 'ADD') {
          if (v >= 0) positive += v; else negative += Math.abs(v);
        } else if (row?.operation === 'SUBTRACT') {
          if (v >= 0) negative += v; else positive += Math.abs(v);
        }
      }
      const diff = Math.abs(positive - negative);
      return diff < BALANCE_EPSILON ? null : { unbalanced: { difference: positive - negative } };
    };
  }

  private buildRow(
    operation: BalanceOperation = 'ADD',
    field: BalanceField | string = 'soldeconvertie',
    value: number | null = null,
    filters?: FilterGroup,
  ): BalanceRowGroup {
    return this.fb.group<BalanceRowFormShape>({
      operation: new FormControl<BalanceOperation>(operation, {
        nonNullable: true,
        validators: Validators.required,
      }),
      field: new FormControl<BalanceField | string>(field, {
        nonNullable: true,
        validators: Validators.required,
      }),
      value: new FormControl<number | null>(value, {
        validators: [Validators.required],
      }),
      filtersExpanded: new FormControl<boolean>(!!filters, { nonNullable: true }),
      filters: new FormControl<FilterGroup | null>(filters ?? null),
    });
  }

  private hasMeaningfulFilter(group: FilterGroup | undefined): boolean {
    if (!group) return false;
    const conditions = group.conditions ?? [];
    const groups = group.groups ?? [];
    if (conditions.length === 0 && groups.length === 0) return false;
    return true;
  }

  private emitState(): void {
    const state = this.computeValidatorState();
    this.validatorStateChange.emit(state);
    this.rowsChange.emit(this.toAdjustments());
  }
}
