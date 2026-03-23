import { Component, Input, Output, EventEmitter, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

const SCHEMAS: Record<string, { target: string[] }> = {
  TIERS: {
    target: ['idtiers','nomprenom','raisonsoc','residence',
      'agenteco','sectionactivite','chiffreaffaires','nationalite',
      'douteux','datdouteux','grpaffaires','nomgrpaffaires']
  },
  CONTRAT: {
    target: ['idcontrat','agence','devise','ancienneteimpaye',
      'objetfinance','typcontrat','datouv','datech',
      'idtiers','tauxcontrat','actif']
  },
  COMPTA: {
    target: ['agence','devise','compte','chapitre','libellecompte',
      'idtiers','soldeorigine','soldeconvertie','devisebbnq',
      'cumulmvtdb','cumulmvtcr','soldeinitdebmois',
      'idcontrat','amount','actif']
  }
};

interface Arrow {
  sourceCol: string;
  targetField: string;
  x1: number; y1: number; x2: number; y2: number;
}

@Component({
  selector: 'app-field-mapping',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './field-mapping.component.html',
  styleUrls: ['./field-mapping.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldMappingComponent implements AfterViewInit, OnDestroy {
  @Input() fileColumns: string[] = [];
  @Input() fileType: 'TIERS' | 'CONTRAT' | 'COMPTA' = 'TIERS';
  @Output() complete = new EventEmitter<Record<string, string>>();
  @Output() back = new EventEmitter<void>();

  mappings: Record<string, string> = {};
  selectedSource: string | null = null;
  arrows: Arrow[] = [];
  hoveredArrow: string | null = null;

  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;
  
  private resizeObserver!: ResizeObserver;

  constructor(private cdr: ChangeDetectorRef) {}

  get targetFields(): string[] {
    return SCHEMAS[this.fileType]?.target || [];
  }

  get unmappedCount(): number {
    return this.targetFields.length - Object.keys(this.mappings).length;
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateArrows();
    });
    if (this.canvasContainer) {
      this.resizeObserver.observe(this.canvasContainer.nativeElement);
    }
    setTimeout(() => this.updateArrows(), 100);
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  onSourceClick(col: string) {
    if (this.selectedSource === col) {
      this.selectedSource = null;
    } else {
      this.selectedSource = col;
    }
    this.cdr.markForCheck();
  }

  onTargetClick(tgt: string) {
    if (!this.selectedSource) return;

    const nextMappings = { ...this.mappings };
    
    // remove old source mapping if it exists elsewhere
    Object.keys(nextMappings).forEach(k => {
      if (nextMappings[k] === this.selectedSource) {
        delete nextMappings[k];
      }
    });

    nextMappings[tgt] = this.selectedSource;
    this.mappings = nextMappings;
    this.selectedSource = null;
    
    this.updateArrows();
    this.cdr.markForCheck();
  }

  removeMapping(tgt: string) {
    const nextMappings = { ...this.mappings };
    delete nextMappings[tgt];
    this.mappings = nextMappings;
    this.updateArrows();
    this.cdr.markForCheck();
  }

  autoMatch(): void {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[_\s\-]/g, '');

    const newMappings = { ...this.mappings };
    const usedSources = new Set(Object.values(newMappings));

    this.targetFields.forEach(tgt => {
      if (newMappings[tgt]) return; // already mapped
      const normTgt = normalize(tgt);
      
      const exactMatch = this.fileColumns.find(src =>
        !usedSources.has(src) && normalize(src) === normTgt
      );
      
      if (exactMatch) {
        newMappings[tgt] = exactMatch;
        usedSources.add(exactMatch);
      }
    });

    this.mappings = newMappings;
    this.updateArrows();
    this.cdr.markForCheck();
  }

  arrowPath(arrow: Arrow): string {
    const cx = (arrow.x1 + arrow.x2) / 2;
    return `M${arrow.x1},${arrow.y1} C${cx},${arrow.y1} ${cx},${arrow.y2} ${arrow.x2},${arrow.y2}`;
  }

  midX(arrow: Arrow): number {
    return (arrow.x1 + arrow.x2) / 2;
  }

  midY(arrow: Arrow): number {
    return (arrow.y1 + arrow.y2) / 2;
  }

  resetMappings() {
    this.mappings = {};
    this.selectedSource = null;
    this.updateArrows();
    this.cdr.markForCheck();
  }

  onContinue() {
    
    this.complete.emit(this.mappings);
  }

  updateArrows() {
    if (!this.canvasContainer) return;
    const canvasEl = this.canvasContainer.nativeElement;
    const cr = canvasEl.getBoundingClientRect();

    const newArrows: Arrow[] = [];
    
    Object.entries(this.mappings).forEach(([tgt, src]) => {
      const se = document.getElementById(`source-${src}`);
      const te = document.getElementById(`target-${tgt}`);
      if (!se || !te) return;

      const sr = se.getBoundingClientRect();
      const tr = te.getBoundingClientRect();

      // Add check to ensure elements are visible before drawing arrows
      if (sr.width === 0 || tr.width === 0) return;

      const sourceX = sr.right - cr.left;
      const targetX = tr.left - cr.left;
      
      newArrows.push({
        sourceCol: src,
        targetField: tgt,
        x1: sourceX,
        y1: sr.top + sr.height / 2 - cr.top,
        x2: targetX,
        y2: tr.top + tr.height / 2 - cr.top,
      });
    });

    this.arrows = newArrows;
    this.cdr.detectChanges(); 
  }

  isSourceMapped(src: string): boolean {
    return Object.values(this.mappings).includes(src);
  }

  isTargetMapped(tgt: string): boolean {
    return !!this.mappings[tgt];
  }
}
