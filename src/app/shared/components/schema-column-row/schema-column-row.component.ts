import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type SchemaColumnType = 'pk' | 'fk' | 'attr';

@Component({
  selector: 'app-schema-column-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-10 items-center justify-between border-b border-slate-900/6 px-4 dark:border-white/6">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex w-4 shrink-0 items-center justify-center">
          <span class="h-2.5 w-2.5 rotate-45 rounded-[2px]" [ngClass]="iconColorClass"></span>
        </span>

        <span class="truncate font-mono text-[17px]  leading-none text-slate-800 dark:text-slate-100" [title]="columnName">
          {{ columnName }}
        </span>
      </div>

      <span class="ml-4 w-16 shrink-0 text-right font-mono text-[14px] leading-none tracking-wide text-slate-500 dark:text-slate-400">
        {{ dataType }}
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchemaColumnRowComponent {
  @Input({ required: true }) columnName!: string;
  // Keep input for future data semantics without changing call sites.
  @Input({ required: true }) columnType!: SchemaColumnType;
  @Input({ required: true }) dataType!: string;

  get iconColorClass(): string {
    if (this.columnType === 'attr') {
      return 'bg-black/80 dark:bg-white/85';
    }

    return 'bg-emerald-400/80 dark:bg-emerald-300/70';
  }
}
