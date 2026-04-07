import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { EtlApiService, MappingConfigRow } from '../../core/services/etl-api.service';

interface MappingConfigGroupCard {
  configGroupNumber: number;
  totalMappings: number;
  sourceTables: string[];
  targetTables: string[];
}

@Component({
  selector: 'app-mapping-config',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './mapping-config.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingConfigComponent implements OnInit {
  private etlApi = inject(EtlApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  groups = signal<MappingConfigGroupCard[]>([]);
  totalGroups = computed(() => this.groups().length);
  totalMappings = computed(() => this.groups().reduce((sum, group) => sum + group.totalMappings, 0));
  loading = signal(false);
  error = signal<string | null>(null);
  deletingGroup = signal<number | null>(null);
  actionMessage = signal<string | null>(null);

  readonly skeletonRows = Array.from({ length: 4 }, (_, i) => i);

  ngOnInit(): void {
    void this.loadGroups();
  }

  async loadGroups(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.actionMessage.set(null);

    try {
      const allMappings = await this.etlApi.getAllMappingConfigs();
      this.groups.set(this.buildGroupCards(allMappings));
    } catch (err: any) {
      this.error.set(err?.message ?? 'Erreur de chargement des configurations de mapping');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  async deleteGroup(configGroupNumber: number): Promise<void> {
    if (this.deletingGroup() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer la configuration ${configGroupNumber} ? Cette action est irreversible.`
    );

    if (!confirmed) {
      return;
    }

    this.deletingGroup.set(configGroupNumber);
    this.error.set(null);
    this.actionMessage.set(null);

    try {
      await this.etlApi.deleteMappingConfigGroup(configGroupNumber);
      await this.loadGroups();
      this.actionMessage.set(`Config ${configGroupNumber} supprimee avec succes.`);
    } catch (err: any) {
      this.error.set(err?.message ?? `Suppression impossible pour la config ${configGroupNumber}`);
    } finally {
      this.deletingGroup.set(null);
      this.cdr.markForCheck();
    }
  }

  openDetails(configGroupNumber: number): void {
    void this.router.navigate(['/mapping/configurations', configGroupNumber]);
  }

  openEdit(configGroupNumber: number): void {
    void this.router.navigate(['/mapping/configurations', configGroupNumber], {
      queryParams: { mode: 'edit' },
    });
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }

  trackByGroupNumber(_: number, group: MappingConfigGroupCard): number {
    return group.configGroupNumber;
  }

  private buildGroupCards(rows: MappingConfigRow[]): MappingConfigGroupCard[] {
    const grouped = new Map<number, { count: number; sources: Set<string>; targets: Set<string> }>();

    rows.forEach((row) => {
      const current = grouped.get(row.configGroupNumber) ?? {
        count: 0,
        sources: new Set<string>(),
        targets: new Set<string>(),
      };

      current.count += 1;
      if (row.tableSource?.trim()) {
        current.sources.add(row.tableSource.trim());
      }
      if (row.tableTarget?.trim()) {
        current.targets.add(row.tableTarget.trim());
      }

      grouped.set(row.configGroupNumber, current);
    });

    return Array.from(grouped.entries())
      .map(([configGroupNumber, value]) => ({
        configGroupNumber,
        totalMappings: value.count,
        sourceTables: Array.from(value.sources).sort((a, b) => a.localeCompare(b)),
        targetTables: Array.from(value.targets).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.configGroupNumber - b.configGroupNumber);
  }
}
