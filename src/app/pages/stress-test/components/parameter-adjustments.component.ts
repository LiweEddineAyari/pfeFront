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
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, takeUntil } from 'rxjs';
import {
  PARAMETER_OPERATIONS,
  ParameterAdjustmentDTO,
  ParameterOperation,
} from '../../../core/models/stress-test.model';
import { FormulaJson } from '../../../core/models/parameter.model';
import {
  CodeAutocompleteComponent,
  CodeAutocompleteOption,
} from './code-autocomplete.component';

interface ParameterRowFormShape {
  code: FormControl<string>;
  operation: FormControl<ParameterOperation>;
  value: FormControl<number | null>;
  formulaText: FormControl<string>;
}

type ParameterRowGroup = FormGroup<ParameterRowFormShape>;

const FORMULA_PLACEHOLDER = `{
  "expression": {
    "type": "AGGREGATION",
    "function": "SUM",
    "field": "soldeconvertie"
  },
  "where": {
    "logic": "AND",
    "conditions": [
      { "field": "numcompte", "operator": "LIKE", "value": "10%" }
    ]
  }
}`;

@Component({
  selector: 'app-parameter-adjustments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    CodeAutocompleteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './parameter-adjustments.component.html',
  styleUrl: './parameter-adjustments.component.css',
})
export class ParameterAdjustmentsComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  @Input() parameterOptions: CodeAutocompleteOption[] = [];

  @Output() rowsChange = new EventEmitter<ParameterAdjustmentDTO[]>();
  /** Emits true when every row is well-formed (code present + value/formula valid). */
  @Output() validityChange = new EventEmitter<boolean>();

  readonly operations = PARAMETER_OPERATIONS.filter(
    (op) => op.value !== 'MODIFY_FORMULA',
  );
  readonly formulaPlaceholder = FORMULA_PLACEHOLDER;

  rowsArray = new FormArray<ParameterRowGroup>([]);

  ngOnInit(): void {
    if (this.rowsArray.length === 0) {
      this.addRow('MULTIPLY');
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

  addRow(initialOp: ParameterOperation = 'MULTIPLY'): void {
    this.rowsArray.push(this.buildRow(initialOp));
    this.cdr.markForCheck();
  }

  removeRow(index: number): void {
    this.rowsArray.removeAt(index);
    this.cdr.markForCheck();
  }

  setOperation(row: ParameterRowGroup, op: ParameterOperation): void {
    row.controls.operation.setValue(op);
  }

  onCodeChanged(row: ParameterRowGroup, code: string): void {
    row.controls.code.setValue(code);
  }

  isFormulaOp(row: ParameterRowGroup): boolean {
    return row.controls.operation.value === 'MODIFY_FORMULA';
  }

  isFormulaJsonValid(row: ParameterRowGroup): boolean {
    if (!this.isFormulaOp(row)) return true;
    const text = row.controls.formulaText.value.trim();
    if (text.length === 0) return false;
    try {
      const parsed = JSON.parse(text);
      return !!parsed && typeof parsed === 'object';
    } catch {
      return false;
    }
  }

  trackByRow(index: number): number {
    return index;
  }

  toAdjustments(): ParameterAdjustmentDTO[] {
    return this.rowsArray.controls.map((row) => {
      const op = row.controls.operation.value;
      const dto: ParameterAdjustmentDTO = {
        operation: op,
        code: row.controls.code.value.trim(),
      };

      if (op === 'MODIFY_FORMULA') {
        const text = row.controls.formulaText.value.trim();
        if (text.length > 0) {
          try {
            dto.formula = JSON.parse(text) as FormulaJson;
          } catch {
            // leave undefined; host will see invalidity flag
          }
        }
      } else {
        const v = row.controls.value.value;
        dto.value = typeof v === 'number' && Number.isFinite(v) ? v : 0;
      }

      return dto;
    });
  }

  private buildRow(operation: ParameterOperation = 'MULTIPLY'): ParameterRowGroup {
    return this.fb.group<ParameterRowFormShape>({
      code: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(1)],
      }),
      operation: new FormControl<ParameterOperation>(operation, {
        nonNullable: true,
        validators: Validators.required,
      }),
      value: new FormControl<number | null>(null),
      formulaText: new FormControl<string>('', { nonNullable: true }),
    });
  }

  private emitState(): void {
    this.rowsChange.emit(this.toAdjustments());
    this.validityChange.emit(this.computeValidity());
  }

  private computeValidity(): boolean {
    if (this.rowsArray.length === 0) return false;
    return this.rowsArray.controls.every((row) => {
      if (!row.controls.code.value || row.controls.code.value.trim().length === 0) {
        return false;
      }

      if (this.isFormulaOp(row)) {
        return this.isFormulaJsonValid(row);
      }

      const v = row.controls.value.value;
      return typeof v === 'number' && Number.isFinite(v);
    });
  }
}
