import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { RatioFormulaNode, RatioFormulaNodeType } from '../../../core/models/ratio.model';
import { FieldPickerComponent } from '../../parameters/components/field-picker.component';

@Component({
  selector: 'app-ratio-formula-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FieldPickerComponent],
  templateUrl: './ratio-formula-builder.component.html',
  styleUrl: './ratio-formula-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatioFormulaBuilderComponent implements OnChanges {
  @Input() model: RatioFormulaNode = this.createDefaultFormula();
  @Input() parameterCodes: string[] = [];
  @Input() groupedParameterCodes: Record<string, string[]> = {};
  @Input() readonly = false;

  @Output() modelChange = new EventEmitter<RatioFormulaNode>();

  readonly nodeTypes: RatioFormulaNodeType[] = [
    'PARAM',
    'CONSTANT',
    'ADD',
    'SUBTRACT',
    'MULTIPLY',
    'DIVIDE',
  ];

  workingModel: RatioFormulaNode = this.createDefaultFormula();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['model']) {
      this.workingModel = this.cloneFormula(this.model ?? this.createDefaultFormula());
      this.ensureBinaryChildren(this.workingModel);
    }
  }

  onNodeTypeChange(node: RatioFormulaNode, nextType: RatioFormulaNodeType): void {
    if (this.readonly) {
      return;
    }

    this.overwriteNode(node, this.createNode(nextType));
    this.ensureBinaryChildren(node);
    this.emitChange();
  }

  onParamCodeChange(node: RatioFormulaNode, code: string): void {
    if (this.readonly || node.type !== 'PARAM') {
      return;
    }

    node.code = code.trim();
    this.emitChange();
  }

  onConstantChange(node: RatioFormulaNode, rawValue: string): void {
    if (this.readonly || node.type !== 'CONSTANT') {
      return;
    }

    const parsed = Number(rawValue);
    node.value = Number.isFinite(parsed) ? parsed : 0;
    this.emitChange();
  }

  readConstant(node: RatioFormulaNode): number {
    if (node.type !== 'CONSTANT') {
      return 0;
    }

    return Number.isFinite(node.value) ? Number(node.value) : 0;
  }

  ensureBinaryChildren(node: RatioFormulaNode): boolean {
    if (!this.isBinaryNode(node.type)) {
      return true;
    }

    if (!node.left) {
      node.left = this.createNode('PARAM');
    }

    if (!node.right) {
      node.right = this.createNode('PARAM');
    }

    return true;
  }

  groupedOptions(): Record<string, string[]> {
    if (Object.keys(this.groupedParameterCodes).length > 0) {
      return this.groupedParameterCodes;
    }

    const grouped: Record<string, string[]> = {};
    const codes = this.getParameterCodes();

    codes.forEach((code) => {
      const parts = code.split('_').filter((part) => part.length > 0);
      const key = parts.length > 1 ? parts[0].toLowerCase() : 'parametres';

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(code);
    });

    return grouped;
  }

  expressionPreview(): string {
    return this.formatNode(this.workingModel);
  }

  private formatNode(node: RatioFormulaNode | undefined): string {
    if (!node) {
      return '0';
    }

    if (node.type === 'PARAM') {
      return node.code?.trim() || 'PARAM';
    }

    if (node.type === 'CONSTANT') {
      return String(Number.isFinite(node.value) ? Number(node.value) : 0);
    }

    const left = this.formatNode(node.left);
    const right = this.formatNode(node.right);

    return `(${left} ${this.operator(node.type)} ${right})`;
  }

  private operator(type: RatioFormulaNode['type']): string {
    if (type === 'ADD') {
      return '+';
    }

    if (type === 'SUBTRACT') {
      return '-';
    }

    if (type === 'MULTIPLY') {
      return '*';
    }

    return '/';
  }

  private createNode(type: RatioFormulaNodeType): RatioFormulaNode {
    const codes = this.getParameterCodes();

    if (type === 'PARAM') {
      return {
        type,
        code: codes[0] ?? '',
      };
    }

    if (type === 'CONSTANT') {
      return {
        type,
        value: 0,
      };
    }

    return {
      type,
      left: this.createNode('PARAM'),
      right: this.createNode('PARAM'),
    };
  }

  private createDefaultFormula(): RatioFormulaNode {
    const codes = this.getParameterCodes();

    return {
      type: 'DIVIDE',
      left: {
        type: 'PARAM',
        code: codes[0] ?? '',
      },
      right: {
        type: 'PARAM',
        code: codes[1] ?? codes[0] ?? '',
      },
    };
  }

  private getParameterCodes(): string[] {
    if (!Array.isArray(this.parameterCodes)) {
      return [];
    }

    return this.parameterCodes;
  }

  private isBinaryNode(type: RatioFormulaNodeType): boolean {
    return type === 'ADD' || type === 'SUBTRACT' || type === 'MULTIPLY' || type === 'DIVIDE';
  }

  private overwriteNode(target: RatioFormulaNode, source: RatioFormulaNode): void {
    const keys = Object.keys(target) as Array<keyof RatioFormulaNode>;
    keys.forEach((key) => delete target[key]);
    Object.assign(target, source);
  }

  private emitChange(): void {
    this.modelChange.emit(this.cloneFormula(this.workingModel));
  }

  private cloneFormula(formula: RatioFormulaNode): RatioFormulaNode {
    return JSON.parse(JSON.stringify(formula)) as RatioFormulaNode;
  }
}
