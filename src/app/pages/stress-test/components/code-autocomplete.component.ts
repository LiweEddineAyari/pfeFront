import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface CodeAutocompleteOption {
  code: string;
  label?: string;
}

/**
 * Small searchable combobox for parameter / ratio codes.
 * Shows a panel of {code, label} pairs filtered by the current search text.
 */
@Component({
  selector: 'app-code-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ac-shell" [class.is-disabled]="disabled">
      <button
        type="button"
        class="ac-trigger"
        [class.has-value]="!!value"
        (click)="togglePanel($event)"
        [attr.aria-expanded]="open"
        [disabled]="disabled"
      >
        <span class="ac-icon">
          <lucide-icon name="hash" [size]="13" [strokeWidth]="2.8"></lucide-icon>
        </span>
        <span class="ac-text" [class.placeholder]="!value">
          <ng-container *ngIf="!value">{{ placeholder }}</ng-container>
          <ng-container *ngIf="value">
            <strong>{{ value }}</strong>
            <em *ngIf="selectedLabel && selectedLabel !== value"> · {{ selectedLabel }}</em>
          </ng-container>
        </span>
        <span class="ac-chevron">
          <lucide-icon name="chevrons-up-down" [size]="13" [strokeWidth]="2.8"></lucide-icon>
        </span>
      </button>

      <div *ngIf="open" class="ac-panel" role="listbox">
        <div class="ac-search">
          <lucide-icon name="search" [size]="13" [strokeWidth]="2.8"></lucide-icon>
          <input
            type="text"
            [(ngModel)]="searchDraft"
            placeholder="Rechercher un code"
            (keydown.enter)="selectFirstMatch()"
            (keydown.escape)="closePanel()"
            autofocus
          />
        </div>

        <div class="ac-options">
          <button
            type="button"
            *ngFor="let opt of filteredOptions; trackBy: trackByCode"
            class="ac-option"
            [class.is-selected]="opt.code === value"
            role="option"
            [attr.aria-selected]="opt.code === value"
            (click)="selectOption(opt)"
          >
            <span class="ac-option-code">{{ opt.code }}</span>
            <span class="ac-option-label" *ngIf="opt.label && opt.label !== opt.code">
              {{ opt.label }}
            </span>
          </button>

          <div *ngIf="filteredOptions.length === 0" class="ac-empty">
            <ng-container *ngIf="canCreate(searchDraft)">
              <button type="button" class="ac-create" (click)="acceptCustom()">
                <lucide-icon name="plus" [size]="13" [strokeWidth]="2.8"></lucide-icon>
                Utiliser "{{ searchDraft.trim() }}"
              </button>
            </ng-container>
            <ng-container *ngIf="!canCreate(searchDraft)">
              <span>Aucun resultat</span>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './code-autocomplete.component.css',
})
export class CodeAutocompleteComponent {
  private elementRef = inject(ElementRef<HTMLElement>);

  @Input() value = '';
  @Input() placeholder = 'Selectionner un code';
  @Input() options: CodeAutocompleteOption[] = [];
  @Input() disabled = false;
  /** Allow free typing of a custom value not in the list. */
  @Input() allowCustom = true;

  @Output() valueChange = new EventEmitter<string>();

  open = false;
  searchDraft = '';

  get selectedLabel(): string | undefined {
    return this.options.find((o) => o.code === this.value)?.label;
  }

  get filteredOptions(): CodeAutocompleteOption[] {
    const search = this.searchDraft.trim().toLowerCase();
    if (!search) {
      return this.options.slice(0, 200);
    }
    return this.options
      .filter((opt) => {
        const code = opt.code.toLowerCase();
        const label = (opt.label ?? '').toLowerCase();
        return code.includes(search) || label.includes(search);
      })
      .slice(0, 200);
  }

  togglePanel(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) {
      this.searchDraft = '';
    }
  }

  closePanel(): void {
    this.open = false;
    this.searchDraft = '';
  }

  selectOption(opt: CodeAutocompleteOption): void {
    this.valueChange.emit(opt.code);
    this.closePanel();
  }

  selectFirstMatch(): void {
    const [first] = this.filteredOptions;
    if (first) {
      this.selectOption(first);
      return;
    }

    if (this.canCreate(this.searchDraft)) {
      this.acceptCustom();
    }
  }

  acceptCustom(): void {
    const trimmed = this.searchDraft.trim();
    if (!trimmed) return;
    this.valueChange.emit(trimmed);
    this.closePanel();
  }

  canCreate(searchDraft: string): boolean {
    return this.allowCustom && searchDraft.trim().length > 0;
  }

  trackByCode(_: number, opt: CodeAutocompleteOption): string {
    return opt.code;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as Node | null;
    if (target && this.elementRef.nativeElement.contains(target)) return;
    this.closePanel();
  }
}
