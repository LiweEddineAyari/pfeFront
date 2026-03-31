import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BalanceRow, EtlApiService } from '../../core/services/etl-api.service';

@Component({
  selector: 'app-balance-data',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './balance-data.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalanceDataComponent implements OnInit {
  private etlApi = inject(EtlApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  balanceItems = signal<BalanceRow[]>([]);
  balancePage = signal(0);
  balanceTotal = signal(0);
  balanceTotalPages = signal(0);
  balanceLoading = signal(false);
  balanceError = signal<string | null>(null);
  readonly balancePageSize = 20;

  readonly balanceSkeletonRows = Array.from({ length: 20 }, (_, i) => i);

  ngOnInit(): void {
    void this.loadBalance(0);
  }

  async loadBalance(page: number): Promise<void> {
    this.balanceLoading.set(true);
    this.balanceError.set(null);

    try {
      const res = await this.etlApi.getBalanceList(page, this.balancePageSize);
      this.balanceItems.set(res.items);
      this.balancePage.set(res.page);
      this.balanceTotal.set(res.totalElements);
      this.balanceTotalPages.set(res.totalPages);
    } catch (err: any) {
      this.balanceError.set(err?.message ?? 'Erreur de chargement des balances');
    } finally {
      this.balanceLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  goBalancePage(p: number): void {
    if (p >= 0 && p < this.balanceTotalPages()) {
      void this.loadBalance(p);
    }
  }

  getPagesArray(totalPages: number, currentPage: number): number[] {
    if (totalPages <= 0) return [];
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);

    let start = Math.max(0, currentPage - 2);
    let end = Math.min(totalPages - 1, start + 4);

    if (end - start < 4) {
      start = Math.max(0, end - 4);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  getStartIndex(page: number, size: number, total: number): number {
    if (total === 0) return 0;
    return page * size + 1;
  }

  getEndIndex(page: number, size: number, total: number): number {
    return Math.min((page + 1) * size, total);
  }

  getBalanceSkeletonWidth(index: number): string {
    const widths = [
      'w-16',
      'w-14',
      'w-14',
      'w-14',
      'w-20',
      'w-20',
      'w-24',
      'w-16',
      'w-20',
      'w-20',
      'w-20',
      'w-20',
      'w-20',
      'w-20',
      'w-20',
      'w-10',
      'w-24',
    ];
    return widths[index % widths.length];
  }

  formatAmount(val: number | string | null | undefined): string {
    if (val === null || val === undefined || val === '') return '—';
    const n = Number(val);
    if (Number.isNaN(n)) return String(val);
    return n.toLocaleString();
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const raw = String(value).trim();

    if (raw.includes('-')) {
      const datePart = raw.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    return raw;
  }

  getClientId(row: BalanceRow): string {
    return String(row.id_client ?? row.idtiers ?? '—');
  }

  getContratId(row: BalanceRow): string {
    return String(row.id_contrat ?? row.idcontrat ?? '—');
  }

  getActifLabel(row: BalanceRow): string {
    const actif = row.actif;
    if (actif === true || actif === 1 || actif === '1') return 'ACTIF';
    if (actif === false || actif === 0 || actif === '0') return 'INACTIF';
    return '—';
  }

  async retryBalance(): Promise<void> {
    await this.loadBalance(this.balancePage());
  }

  goBack(): void {
    void this.router.navigate(['/datamart']);
  }
}
