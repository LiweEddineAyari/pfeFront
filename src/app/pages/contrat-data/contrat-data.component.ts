import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  ContratDeviseRow,
  ContratObjetFinanceRow,
  ContratRow,
  ContratTypeContratRow,
  EtlApiService,
} from '../../core/services/etl-api.service';

@Component({
  selector: 'app-contrat-data',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './contrat-data.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratDataComponent implements OnInit {
  private etlApi = inject(EtlApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  // Devise table
  deviseItems = signal<ContratDeviseRow[]>([]);
  devisePage = signal(0);
  deviseTotal = signal(0);
  deviseTotalPages = signal(0);
  deviseLoading = signal(false);
  deviseError = signal<string | null>(null);
  readonly devisePageSize = 5;

  // Objet finance table
  objetItems = signal<ContratObjetFinanceRow[]>([]);
  objetPage = signal(0);
  objetTotal = signal(0);
  objetTotalPages = signal(0);
  objetLoading = signal(false);
  objetError = signal<string | null>(null);
  readonly objetPageSize = 5;

  // Type contrat table
  typeItems = signal<ContratTypeContratRow[]>([]);
  typePage = signal(0);
  typeTotal = signal(0);
  typeTotalPages = signal(0);
  typeLoading = signal(false);
  typeError = signal<string | null>(null);
  readonly typePageSize = 5;

  // Contrat table
  contratItems = signal<ContratRow[]>([]);
  contratPage = signal(0);
  contratTotal = signal(0);
  contratTotalPages = signal(0);
  contratLoading = signal(false);
  contratError = signal<string | null>(null);
  readonly contratPageSize = 20;

  readonly smallSkeletonRows = Array.from({ length: 5 }, (_, i) => i);
  readonly contratSkeletonRows = Array.from({ length: 20 }, (_, i) => i);

  ngOnInit(): void {
    void Promise.all([
      this.loadDevise(0),
      this.loadObjetFinance(0),
      this.loadTypeContrat(0),
      this.loadContrat(0),
    ]);
  }

  async loadDevise(page: number): Promise<void> {
    this.deviseLoading.set(true);
    this.deviseError.set(null);

    try {
      const res = await this.etlApi.getContratDeviseList(page, this.devisePageSize);
      this.deviseItems.set(res.items);
      this.devisePage.set(res.page);
      this.deviseTotal.set(res.totalElements);
      this.deviseTotalPages.set(res.totalPages);
    } catch (err: any) {
      this.deviseError.set(err?.message ?? 'Erreur de chargement des devises');
    } finally {
      this.deviseLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async loadObjetFinance(page: number): Promise<void> {
    this.objetLoading.set(true);
    this.objetError.set(null);

    try {
      const res = await this.etlApi.getContratObjetFinanceList(page, this.objetPageSize);
      this.objetItems.set(res.items);
      this.objetPage.set(res.page);
      this.objetTotal.set(res.totalElements);
      this.objetTotalPages.set(res.totalPages);
    } catch (err: any) {
      this.objetError.set(err?.message ?? 'Erreur de chargement des objets finance');
    } finally {
      this.objetLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async loadTypeContrat(page: number): Promise<void> {
    this.typeLoading.set(true);
    this.typeError.set(null);

    try {
      const res = await this.etlApi.getContratTypeContratList(page, this.typePageSize);
      this.typeItems.set(res.items);
      this.typePage.set(res.page);
      this.typeTotal.set(res.totalElements);
      this.typeTotalPages.set(res.totalPages);
    } catch (err: any) {
      this.typeError.set(err?.message ?? 'Erreur de chargement des types de contrat');
    } finally {
      this.typeLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async loadContrat(page: number): Promise<void> {
    this.contratLoading.set(true);
    this.contratError.set(null);

    try {
      const res = await this.etlApi.getContratList(page, this.contratPageSize);
      this.contratItems.set(res.items);
      this.contratPage.set(res.page);
      this.contratTotal.set(res.totalElements);
      this.contratTotalPages.set(res.totalPages);
    } catch (err: any) {
      this.contratError.set(err?.message ?? 'Erreur de chargement des contrats');
    } finally {
      this.contratLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  goDevisePage(p: number): void {
    if (p >= 0 && p < this.deviseTotalPages()) {
      void this.loadDevise(p);
    }
  }

  goObjetPage(p: number): void {
    if (p >= 0 && p < this.objetTotalPages()) {
      void this.loadObjetFinance(p);
    }
  }

  goTypePage(p: number): void {
    if (p >= 0 && p < this.typeTotalPages()) {
      void this.loadTypeContrat(p);
    }
  }

  goContratPage(p: number): void {
    if (p >= 0 && p < this.contratTotalPages()) {
      void this.loadContrat(p);
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

  getContratDisplayName(row: ContratRow): string {
    return row.nomprenom ?? '—';
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  getContratSkeletonWidth(index: number): string {
    const widths = ['w-16', 'w-20', 'w-28', 'w-16', 'w-12', 'w-14', 'w-24', 'w-12', 'w-10', 'w-16'];
    return widths[index % widths.length];
  }

  async retryDevise(): Promise<void> {
    await this.loadDevise(this.devisePage());
  }

  async retryObjet(): Promise<void> {
    await this.loadObjetFinance(this.objetPage());
  }

  async retryType(): Promise<void> {
    await this.loadTypeContrat(this.typePage());
  }

  async retryContrat(): Promise<void> {
    await this.loadContrat(this.contratPage());
  }

  goBack(): void {
    void this.router.navigate(['/datamart']);
  }
}
