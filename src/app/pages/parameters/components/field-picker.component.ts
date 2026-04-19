import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

interface FieldPickerGroup {
  key: string;
  label: string;
  options: string[];
}

@Component({
  selector: 'app-field-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './field-picker.component.html',
  styleUrl: './field-picker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldPickerComponent implements OnChanges {
  private readonly maxVisibleOptions = 180;

  @Input() value = '';
  @Input() options: string[] = [];
  @Input() groupedOptions: Record<string, string[]> = {};
  @Input() placeholder = 'Selectionner un champ';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();

  open = false;
  searchDraft = '';

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled']?.currentValue && this.open) {
      this.closePanel();
    }
  }

  get hasValue(): boolean {
    return this.value.trim().length > 0;
  }

  get selectedLabel(): string {
    return this.hasValue ? this.value : this.placeholder;
  }

  get groupedFilteredOptions(): FieldPickerGroup[] {
    const search = this.searchDraft.trim().toLowerCase();
    const allOptions = this.buildAllOptions();
    if (allOptions.length === 0) {
      return [];
    }

    const normalizedGroups = this.normalizeGroupedOptions(allOptions);

    let filteredGroups = normalizedGroups
      .map((group) => {
        const filteredOptions = search
          ? group.options.filter((option) => option.toLowerCase().includes(search))
          : group.options;

        if (filteredOptions.length === 0) {
          return null;
        }

        return {
          ...group,
          options: filteredOptions,
        };
      })
      .filter((group): group is FieldPickerGroup => group !== null);

    let remaining = this.maxVisibleOptions;
    filteredGroups = filteredGroups
      .map((group) => {
        if (remaining <= 0) {
          return null;
        }

        const limited = group.options.slice(0, remaining);
        remaining -= limited.length;

        return {
          ...group,
          options: limited,
        };
      })
      .filter((group): group is FieldPickerGroup => group !== null);

    return filteredGroups;
  }

  get filteredOptions(): string[] {
    return this.groupedFilteredOptions.flatMap((group) => group.options);
  }

  get noResults(): boolean {
    return this.filteredOptions.length === 0;
  }

  togglePanel(event: MouseEvent): void {
    event.stopPropagation();

    if (this.disabled) {
      return;
    }

    if (this.open) {
      this.closePanel();
      return;
    }

    this.open = true;
    this.searchDraft = '';
  }

  onSearchChange(value: string): void {
    this.searchDraft = value;
  }

  selectOption(value: string): void {
    if (this.disabled) {
      return;
    }

    this.valueChange.emit(value);
    this.closePanel();
  }

  selectFirstMatch(): void {
    const [first] = this.filteredOptions;
    if (first) {
      this.selectOption(first);
    }
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();

    if (this.disabled || !this.hasValue) {
      return;
    }

    this.valueChange.emit('');
    this.closePanel();
  }

  clearFromKeyboard(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled || !this.hasValue) {
      return;
    }

    this.valueChange.emit('');
    this.closePanel();
  }

  closePanel(): void {
    this.open = false;
    this.searchDraft = '';
  }

  trackByValue(_: number, value: string): string {
    return value;
  }

  trackByGroup(_: number, group: FieldPickerGroup): string {
    return group.key;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) {
      return;
    }

    const target = event.target as Node | null;
    if (target && this.elementRef.nativeElement.contains(target)) {
      return;
    }

    this.closePanel();
  }

  private buildAllOptions(): string[] {
    const selected = this.value.trim();
    const sanitized = this.options
      .map((option) => option.trim())
      .filter((option) => option.length > 0);

    const merged = Array.from(new Set(sanitized));

    if (selected && !merged.includes(selected)) {
      merged.unshift(selected);
    }

    return merged;
  }

  private normalizeGroupedOptions(allOptions: string[]): FieldPickerGroup[] {
    const normalizedByGroup: FieldPickerGroup[] = [];
    const available = new Set(allOptions);
    const assigned = new Set<string>();

    Object.entries(this.groupedOptions ?? {})
      .sort(([a], [b]) => this.formatGroupLabel(a).localeCompare(this.formatGroupLabel(b)))
      .forEach(([groupKey, groupFields]) => {
        if (!Array.isArray(groupFields)) {
          return;
        }

        const uniqueFields = Array.from(
          new Set(
            groupFields
              .map((field) => field.trim())
              .filter((field) => field.length > 0)
          )
        ).filter((field) => available.has(field));

        if (uniqueFields.length === 0) {
          return;
        }

        uniqueFields.forEach((field) => assigned.add(field));

        normalizedByGroup.push({
          key: groupKey,
          label: this.formatGroupLabel(groupKey),
          options: uniqueFields,
        });
      });

    if (normalizedByGroup.length === 0) {
      return [
        {
          key: 'all_fields',
          label: 'Tous les champs',
          options: allOptions,
        },
      ];
    }

    const remainingFields = allOptions.filter((field) => !assigned.has(field));
    if (remainingFields.length > 0) {
      normalizedByGroup.push({
        key: 'other_fields',
        label: 'Autres champs',
        options: remainingFields,
      });
    }

    return normalizedByGroup;
  }

  private formatGroupLabel(value: string): string {
    const normalized = value
      .replace(/^datamart\./i, '')
      .replace(/[._]+/g, ' ')
      .trim();

    if (!normalized) {
      return 'Champs';
    }

    const lowered = normalized.toLowerCase();
    if (lowered === 'all fields') {
      return 'Tous les champs';
    }

    if (lowered === 'other fields') {
      return 'Autres champs';
    }

    return normalized
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
