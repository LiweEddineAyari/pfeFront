import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  AgentEcoRow,
  ClientRow,
  EtlApiService,
  SectionActiviteRow,
} from '../../core/services/etl-api.service';

@Component({
  selector: 'app-client-data',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './client-data.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDataComponent implements OnInit {
  private etlApi = inject(EtlApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  // Agent Eco table
  agentEcoItems = signal<AgentEcoRow[]>([]);
  agentEcoPage = signal(0);
  agentEcoTotal = signal(0);
  agentEcoTotalPages = signal(0);
  agentEcoLoading = signal(false);
  agentEcoError = signal<string | null>(null);
  readonly agentEcoPageSize = 5;

  // Section Activite table
  sectionItems = signal<SectionActiviteRow[]>([]);
  sectionPage = signal(0);
  sectionTotal = signal(0);
  sectionTotalPages = signal(0);
  sectionLoading = signal(false);
  sectionError = signal<string | null>(null);
  readonly sectionPageSize = 5;

  // Client table
  clientItems = signal<ClientRow[]>([]);
  clientPage = signal(0);
  clientTotal = signal(0);
  clientTotalPages = signal(0);
  clientLoading = signal(false);
  clientError = signal<string | null>(null);
  readonly clientPageSize = 20;

  readonly smallSkeletonRows = Array.from({ length: 5 }, (_, i) => i);
  readonly clientSkeletonRows = Array.from({ length: 20 }, (_, i) => i);

  ngOnInit(): void {
    void Promise.all([
      this.loadAgentEco(0),
      this.loadSectionActivite(0),
      this.loadClient(0),
    ]);
  }

  async loadAgentEco(page: number): Promise<void> {
    this.agentEcoLoading.set(true);
    this.agentEcoError.set(null);

    try {
      const res = await this.etlApi.getAgentEcoList(page, this.agentEcoPageSize);
      this.agentEcoItems.set(res.items);
      this.agentEcoPage.set(res.page);
      this.agentEcoTotal.set(res.totalElements);
      this.agentEcoTotalPages.set(res.totalPages);
    } catch (err: any) {
      this.agentEcoError.set(err?.message ?? 'Erreur de chargement Agent economique');
    } finally {
      this.agentEcoLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async loadSectionActivite(page: number): Promise<void> {
    this.sectionLoading.set(true);
    this.sectionError.set(null);

    try {
      const res = await this.etlApi.getSectionActiviteList(page, this.sectionPageSize);
      this.sectionItems.set(res.items);
      this.sectionPage.set(res.page);
      this.sectionTotal.set(res.totalElements);
      this.sectionTotalPages.set(res.totalPages);
    } catch (err: any) {
      this.sectionError.set(err?.message ?? 'Erreur de chargement Section activite');
    } finally {
      this.sectionLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async loadClient(page: number): Promise<void> {
    this.clientLoading.set(true);
    this.clientError.set(null);

    try {
      const res = await this.etlApi.getClientList(page, this.clientPageSize);
      this.clientItems.set(res.items);
      this.clientPage.set(res.page);
      this.clientTotal.set(res.totalElements);
      this.clientTotalPages.set(res.totalPages);
    } catch (err: any) {
      this.clientError.set(err?.message ?? 'Erreur de chargement clients');
    } finally {
      this.clientLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  goAgentEcoPage(p: number): void {
    if (p >= 0 && p < this.agentEcoTotalPages()) {
      void this.loadAgentEco(p);
    }
  }

  goSectionPage(p: number): void {
    if (p >= 0 && p < this.sectionTotalPages()) {
      void this.loadSectionActivite(p);
    }
  }

  goClientPage(p: number): void {
    if (p >= 0 && p < this.clientTotalPages()) {
      void this.loadClient(p);
    }
  }

  getClientDisplayName(row: ClientRow): string {
    return row.nomprenom ?? row.raisonsoc ?? '—';
  }

  formatChiffreAffaires(val: string): string {
    const n = parseInt(val, 10);
    if (isNaN(n) || n === 0) return '—';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)} K`;
    return val;
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

  getClientSkeletonWidth(index: number): string {
    const widths = ['w-16', 'w-28', 'w-12', 'w-16', 'w-24', 'w-20', 'w-10', 'w-24'];
    return widths[index % widths.length];
  }

  async retryAgentEco(): Promise<void> {
    await this.loadAgentEco(this.agentEcoPage());
  }

  async retrySection(): Promise<void> {
    await this.loadSectionActivite(this.sectionPage());
  }

  async retryClient(): Promise<void> {
    await this.loadClient(this.clientPage());
  }

  goBack(): void {
    void this.router.navigate(['/datamart']);
  }
}
