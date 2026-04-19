import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sql-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './sql-editor.component.html',
  styleUrl: './sql-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlEditorComponent {
  @Input() sql = '';
  @Input() readonly = false;
  @Input() subtitle = 'Seul un sous-ensemble analytique de SELECT est accepte.';

  @Output() sqlChange = new EventEmitter<string>();

  onSqlInput(value: string): void {
    this.sqlChange.emit(value);
  }

  get lineCount(): number {
    if (!this.sql.trim()) {
      return 0;
    }

    return this.sql.split('\n').length;
  }
}
