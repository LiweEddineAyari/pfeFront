import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  ViewChild,
  AfterViewInit,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Vflow, VflowComponent, Node, Edge } from 'ngx-vflow';
import {
  ChevronRight,
  CircleDot,
  Database,
  GitBranch,
  KeyRound,
  Layers,
  Link2,
  Move,
  Search,
  Table2,
  ZoomIn,
  ZoomOut,
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { SchemaColumnRowComponent } from '../../shared/components/schema-column-row/schema-column-row.component';

export type DatamartTableType = 'fact' | 'dim' | 'sub_dim';
export type DatamartColumnType = 'pk' | 'fk' | 'attr';

interface DatamartColumn {
  name: string;
  type: DatamartColumnType;
}

interface DatamartTable {
  name: string;
  type: DatamartTableType;
  columns: DatamartColumn[];
}

interface DatamartConnection {
  from: string;
  to: string;
  relation: 'fact-dim' | 'dim-sub' | 'fact-sub';
}

type HandleSide = 'left' | 'right' | 'top' | 'bottom';
type HandleType = 'source' | 'target';

interface HandleConfig {
  id: string;
  type: HandleType;
  position: HandleSide;
  offset: number;
}

interface ConnectionHandleMeta {
  sourceSide: HandleSide;
  targetSide: HandleSide;
  sourceHandle: string;
  targetHandle: string;
}

const DATAMART_SCHEMA: DatamartTable[] = [
  {
    name: 'fact_balance',
    type: 'fact',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'id_agence', type: 'fk' },
      { name: 'id_devise', type: 'fk' },
      { name: 'id_devisebnq', type: 'fk' },
      { name: 'id_compte', type: 'fk' },
      { name: 'id_chapitre', type: 'fk' },
      { name: 'id_client', type: 'fk' },
      { name: 'id_contrat', type: 'fk' },
      { name: 'id_date', type: 'fk' },
      { name: 'soldeorigine', type: 'attr' },
      { name: 'soldeconvertie', type: 'attr' },
      { name: 'cumulomvtdb', type: 'attr' },
      { name: 'cumulomvtcr', type: 'attr' },
      { name: 'soldeinitdebmois', type: 'attr' },
      { name: 'amount', type: 'attr' },
      { name: 'actif', type: 'attr' },
    ],
  },
  {
    name: 'dim_client',
    type: 'dim',
    columns: [
      { name: 'idtiers', type: 'pk' },
      { name: 'id_residence', type: 'fk' },
      { name: 'id_agenteco', type: 'fk' },
      { name: 'id_douteux', type: 'fk' },
      { name: 'id_grpaffaire', type: 'fk' },
      { name: 'id_sectionactivite', type: 'fk' },
      { name: 'nomprenom', type: 'attr' },
      { name: 'raisonsoc', type: 'attr' },
      { name: 'chiffreaffaires', type: 'attr' },
    ],
  },
  {
    name: 'dim_contrat',
    type: 'dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'id_client', type: 'fk' },
      { name: 'id_agence', type: 'fk' },
      { name: 'id_devise', type: 'fk' },
      { name: 'id_objetfinance', type: 'fk' },
      { name: 'id_typcontrat', type: 'fk' },
      { name: 'id_dateouverture', type: 'fk' },
      { name: 'id_dateecheance', type: 'fk' },
      { name: 'ancienneteimpaye', type: 'attr' },
      { name: 'tauxcontrat', type: 'attr' },
      { name: 'actif', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_agence',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'numagence', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_devise',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'devise', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_date',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'date_value', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_chapitre',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'chapitre', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_compte',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'numcompte', type: 'attr' },
      { name: 'libellecompte', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_objetfinance',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'libelle', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_typcontrat',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'typcontrat', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_douteux',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'douteux', type: 'attr' },
      { name: 'datdouteux', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_agenteco',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'libelle', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_grpaffaire',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'nomgrpaffaires', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_sectionactivite',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'libelle', type: 'attr' },
    ],
  },
  {
    name: 'sub_dim_residence',
    type: 'sub_dim',
    columns: [
      { name: 'id', type: 'pk' },
      { name: 'pays', type: 'attr' },
      { name: 'residence', type: 'attr' },
      { name: 'geo', type: 'attr' },
    ],
  },
];

const DATAMART_CONNECTIONS: DatamartConnection[] = [
  { from: 'fact_balance', to: 'dim_client', relation: 'fact-dim' },
  { from: 'fact_balance', to: 'dim_contrat', relation: 'fact-dim' },
  { from: 'dim_contrat', to: 'dim_client', relation: 'fact-dim' },
  { from: 'fact_balance', to: 'sub_dim_agence', relation: 'fact-sub' },
  { from: 'fact_balance', to: 'sub_dim_devise', relation: 'fact-sub' },
  { from: 'fact_balance', to: 'sub_dim_date', relation: 'fact-sub' },
  { from: 'fact_balance', to: 'sub_dim_chapitre', relation: 'fact-sub' },
  { from: 'fact_balance', to: 'sub_dim_compte', relation: 'fact-sub' },
  { from: 'dim_contrat', to: 'sub_dim_devise', relation: 'dim-sub' },
  { from: 'dim_contrat', to: 'sub_dim_objetfinance', relation: 'dim-sub' },
  { from: 'dim_contrat', to: 'sub_dim_typcontrat', relation: 'dim-sub' },
  { from: 'dim_contrat', to: 'sub_dim_date', relation: 'dim-sub' },
  { from: 'dim_client', to: 'sub_dim_douteux', relation: 'dim-sub' },
  { from: 'dim_client', to: 'sub_dim_agenteco', relation: 'dim-sub' },
  { from: 'dim_client', to: 'sub_dim_grpaffaire', relation: 'dim-sub' },
  { from: 'dim_client', to: 'sub_dim_sectionactivite', relation: 'dim-sub' },
  { from: 'dim_client', to: 'sub_dim_residence', relation: 'dim-sub' },
];

@Component({
  selector: 'app-datamart',
  templateUrl: './datamart.component.html',
  styleUrls: ['./datamart.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Vflow, SchemaColumnRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatamartComponent implements OnInit, AfterViewInit {
  private readonly initialFocusNodes = ['fact_balance', 'dim_client', 'dim_contrat'];
  private readonly router = inject(Router);
  private currentZoom = signal(1);
  private readonly handlePositions = new Map<string, HandleConfig[]>();

  icons = {
    ChevronRight,
    Table2,
    Search,
    ZoomIn,
    ZoomOut,
    Move,
    GitBranch,
    KeyRound,
    CircleDot,
    Database,
    Layers,
    Link2
  };

  @ViewChild('vflow') vflowComponent!: VflowComponent;

  searchQuery = signal('');
  hoveredTable = signal<string | null>(null);
  selectedTable = signal<string | null>(null);

  nodes = signal<Node[]>([]);
  edges = signal<Edge[]>([]);

  flowBackground: any = {
    type: 'dots',
    color: 'rgba(148,163,184,0.32)',
    gap: 24,
    size: 2.2,
    backgroundColor: 'transparent'
  };

  constructor() {

  }

  ngOnInit() {
    this.buildGraph();
    const isDark = document.documentElement.classList.contains('dark');
    this.flowBackground = isDark ? {
      type: 'dots',
      color: 'rgba(148,163,184,0.32)',
      gap: 36,
      size: 3,
      backgroundColor: 'transparent'
    } : {
      type: 'dots',
      color: 'rgba(148,163,184,0.6)',
      gap: 36,
      size: 3,
      backgroundColor: 'transparent'
    };
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.vflowComponent) {
        this.vflowComponent.fitView({
          nodes: this.initialFocusNodes,
          padding: 0.28,
        });
      }
    }, 100);
  }

  buildGraph() {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    const layoutObj: Record<string, { x: number, y: number }> = {
      // Column 1
      'fact_balance': { x: -880.33, y: 1332.28 },

      // Column 2
      'dim_contrat': { x: -1410.31, y: 875.18 },
      'dim_client': { x: -363.87, y: 896.54 },
      'sub_dim_agence': { x: -1926.43, y: 1680.75 },
      'sub_dim_devise': { x: -983.13, y: 571.46 },
      'sub_dim_chapitre': { x: -1662.7, y: 2060.76 },
      'sub_dim_compte': { x: -1186.9, y: 2086.96 },

      // Column 3 (Connected from dim_contrat)
      'sub_dim_objetfinance': { x: -2039.55, y: 1102.74 },
      'sub_dim_typcontrat': { x: -2029.16, y: 864.38 },
      'sub_dim_date': { x: -2000.54, y: 1342.33 }, // Also connected to fact_balance

      // Column 3 (Connected from dim_client)
      'sub_dim_douteux': { x: 236.12, y: 610.88 },
      'sub_dim_agenteco': { x: 236.17, y: 845.98 },
      'sub_dim_grpaffaire': { x: 222.45, y: 1037.17 },
      'sub_dim_sectionactivite': { x: 235.71, y: 1201.56 },
      'sub_dim_residence': { x: 216.64, y: 1370.85 },
    };

    DATAMART_SCHEMA.forEach((table, index) => {
      let x = 0;
      let y = 0;

      if (layoutObj[table.name]) {
        x = layoutObj[table.name].x;
        y = layoutObj[table.name].y;
      }

      newNodes.push({
        id: table.name,
        type: 'html-template',
        point: signal({ x, y }),
        data: signal({
          ...table,
          connectionCount: DATAMART_CONNECTIONS.filter(c => c.from === table.name || c.to === table.name).length
        })
      } as Node);
    });

    const handleMetaByEdge = this.buildHandleMetadata(layoutObj);

    DATAMART_CONNECTIONS.forEach((conn, index) => {
      const edgeHandleMeta = handleMetaByEdge[index];

      newEdges.push({
        id: `${conn.from}-${conn.to}-${index}`,
        source: conn.from,
        target: conn.to,
        sourceHandle: edgeHandleMeta.sourceHandle,
        targetHandle: edgeHandleMeta.targetHandle,
        type: 'template',
        curve: signal('bezier'),
        data: signal({ relation: conn.relation }),
      } as Edge);
    });

    this.nodes.set(newNodes);
    this.edges.set(newEdges);
  }

  updateSearch(query: string) {
    this.searchQuery.set(query);
  }

  resetView() {
    if (this.vflowComponent) {
      this.vflowComponent.fitView({ padding: 0.08 });
      this.currentZoom.set(1);
    }
  }

  zoomIn() {
    if (this.vflowComponent) {
      const nextZoom = Math.min(3, this.currentZoom() + 0.15);
      this.vflowComponent.zoomTo(nextZoom);
      this.currentZoom.set(nextZoom);
    }
  }

  zoomOut() {
    if (this.vflowComponent) {
      const nextZoom = Math.max(0.25, this.currentZoom() - 0.15);
      this.vflowComponent.zoomTo(nextZoom);
      this.currentZoom.set(nextZoom);
    }
  }

  setHoveredTable(name: string | null) {
    this.hoveredTable.set(name);
  }

  setSelectedTable(name: string) {
    if (this.selectedTable() === name) {
      this.selectedTable.set(null);
    } else {
      this.selectedTable.set(name);
    }
  }

  onNodePositionChanges(changes: Array<{ id: string; point: { x: number; y: number } }>) {
    if (!changes?.length) {
      return;
    }

    const positionSnapshot = this.nodes().map((node) => {
      const point = node.point();
      return {
        table: node.id,
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2)),
      };
    });

    console.groupCollapsed(`[Datamart] Position update (${changes.map((change) => change.id).join(', ')})`);
    console.table(positionSnapshot);
    console.groupEnd();
  }

  isEdgeHighlighted(edge: Edge): boolean {
    const selected = this.selectedTable();

    if (selected && (edge.source === selected || edge.target === selected)) {
      return true;
    }
    return false;
  }

  getHandles(tableName: string): HandleConfig[] {
    return this.handlePositions.get(tableName) ?? [];
  }

  getHandleStyle(handle: HandleConfig): Record<string, string> {
    const baseStyle: Record<string, string> = {
      opacity: '0',
      width: '1px',
      height: '1px',
      background: 'transparent',
      border: 'none',
      pointerEvents: 'none',
    };

    if (handle.position === 'left' || handle.position === 'right') {
      return {
        ...baseStyle,
        top: `${handle.offset}%`,
        transform: 'translateY(-50%)',
      };
    }

    return {
      ...baseStyle,
      left: `${handle.offset}%`,
      transform: 'translateX(-50%)',
    };
  }

  getEdgeStroke(edge: Edge): string {
    if (this.isEdgeHighlighted(edge)) {
      return '#01F99E';
    }

    if (this.isEdgeDimmed(edge)) {
      return 'rgba(1,245,156,0.25)';
    }

    switch (this.getEdgeRelation(edge)) {
      case 'fact-dim':
        return '#01F59C';
      case 'dim-sub':
        return '#01B574';
      default:
        return 'rgba(1,245,156,0.88)';
    }
  }

  getEdgeWidth(edge: Edge): number {
    const relation = this.getEdgeRelation(edge);
    const baseWidth = relation === 'fact-dim' ? 2.0 : relation === 'dim-sub' ? 1.5 : 1.5;
    return this.isEdgeHighlighted(edge) ? baseWidth + 0.8 : baseWidth;
  }

  getEdgeDasharray(edge: Edge): string | null {
    switch (this.getEdgeRelation(edge)) {
      case 'fact-dim':
        return null;
      case 'dim-sub':
        return '6 4';
      default:
        return '6 4';
    }
  }

  getEdgeOpacity(edge: Edge): number {
    if (this.isEdgeDimmed(edge)) {
      return 0.28;
    }

    switch (this.getEdgeRelation(edge)) {
      case 'fact-dim':
        return 0.92;
      case 'dim-sub':
        return 0.82;
      default:
        return 0.82;
    }
  }

  getEdgeFilter(edge: Edge): string | null {
    return this.isEdgeHighlighted(edge) ? 'drop-shadow(0 0 5px rgba(1,245,156,0.45))' : null;
  }

  isTableMuted(table: DatamartTable): boolean {
    const search = this.searchQuery().toLowerCase();
    if (search && !table.name.toLowerCase().includes(search) && !table.columns.some(c => c.name.toLowerCase().includes(search))) {
      return true;
    }
    const selected = this.selectedTable();
    if (selected && selected !== table.name) {
      const connected = DATAMART_CONNECTIONS.some(c => (c.from === selected && c.to === table.name) || (c.to === selected && c.from === table.name));
      if (!connected) return true;
    }
    return false;
  }

  getTableTypeLabel(type: string): string {
    switch (type) {
      case 'fact': return 'Fact Table';
      case 'dim': return 'Dimension';
      case 'sub_dim': return 'Sub-Dimension';
      default: return 'Table';
    }
  }

  getTableIcon(type: string): any {
    switch (type) {
      case 'fact': return Database;
      case 'dim': return Layers;
      case 'sub_dim': return GitBranch;
      default: return Table2;
    }
  }

  getColumnDataType(column: DatamartColumn): string {
    const normalized = column.name.toLowerCase();
    if (column.type === 'pk' || column.type === 'fk' || normalized.startsWith('id')) return 'uuid';
    if (normalized.includes('date') || normalized.includes('dat')) return 'date';
    if (normalized.includes('amount') || normalized.includes('solde') || normalized.includes('taux') || normalized.includes('chiffre') || normalized.includes('cumul')) return 'numeric';
    if (normalized.includes('actif')) return 'boolean';
    return 'text';
  }

  getColumnBadgeLabel(type: string): string {
    return type.toUpperCase();
  }

  getColumnIcon(type: string): any {
    switch (type) {
      case 'pk': return KeyRound;
      case 'fk': return Link2;
      default: return CircleDot;
    }
  }

  openTablePage(tableName: string) {
    if (tableName === 'dim_client') {
      void this.router.navigate(['/datamart/client']);
      return;
    }

    if (tableName === 'dim_contrat') {
      void this.router.navigate(['/datamart/contrat']);
    }
  }

  private buildHandleMetadata(
    layoutObj: Record<string, { x: number; y: number }>,
  ): ConnectionHandleMeta[] {
    const sourceGroups = new Map<string, number[]>();
    const targetGroups = new Map<string, number[]>();
    const edgeMeta: ConnectionHandleMeta[] = [];

    DATAMART_CONNECTIONS.forEach((conn, edgeIndex) => {
      const sourceSide = this.getSourceSide(conn, layoutObj);
      const targetSide = this.getTargetSide(conn, layoutObj);

      const sourceKey = `${conn.from}|source|${sourceSide}`;
      const targetKey = `${conn.to}|target|${targetSide}`;

      if (!sourceGroups.has(sourceKey)) {
        sourceGroups.set(sourceKey, []);
      }
      if (!targetGroups.has(targetKey)) {
        targetGroups.set(targetKey, []);
      }

      sourceGroups.get(sourceKey)!.push(edgeIndex);
      targetGroups.get(targetKey)!.push(edgeIndex);

      edgeMeta.push({
        sourceSide,
        targetSide,
        sourceHandle: '',
        targetHandle: '',
      });
    });

    const positionsByTable = new Map<string, HandleConfig[]>();

    sourceGroups.forEach((edgeIndexes, groupKey) => {
      const [tableName, type, side] = groupKey.split('|') as [string, HandleType, HandleSide];
      edgeIndexes.forEach((edgeIndex, idx) => {
        const offset = ((idx + 1) * 100) / (edgeIndexes.length + 1);
        const id = `${tableName}-${type}-${side}-${idx}`;

        edgeMeta[edgeIndex].sourceHandle = id;

        if (!positionsByTable.has(tableName)) {
          positionsByTable.set(tableName, []);
        }

        positionsByTable.get(tableName)!.push({
          id,
          type,
          position: side,
          offset,
        });
      });
    });

    targetGroups.forEach((edgeIndexes, groupKey) => {
      const [tableName, type, side] = groupKey.split('|') as [string, HandleType, HandleSide];
      edgeIndexes.forEach((edgeIndex, idx) => {
        const offset = ((idx + 1) * 100) / (edgeIndexes.length + 1);
        const id = `${tableName}-${type}-${side}-${idx}`;

        edgeMeta[edgeIndex].targetHandle = id;

        if (!positionsByTable.has(tableName)) {
          positionsByTable.set(tableName, []);
        }

        positionsByTable.get(tableName)!.push({
          id,
          type,
          position: side,
          offset,
        });
      });
    });

    this.handlePositions.clear();
    positionsByTable.forEach((handles, tableName) => {
      this.handlePositions.set(tableName, handles);
    });

    return edgeMeta;
  }

  private getSourceSide(
    conn: DatamartConnection,
    layoutObj: Record<string, { x: number; y: number }>,
  ): HandleSide {
    if (conn.from === 'fact_balance') {
      if (conn.to === 'dim_client') {
        return 'right';
      }
      return 'left';
    }

    if (conn.from === 'dim_contrat') {
      if (conn.to === 'dim_client' || conn.to === 'sub_dim_devise') {
        return 'right';
      }
      return 'left';
    }

    if (conn.from === 'dim_client') {
      return 'right';
    }

    const sourcePoint = layoutObj[conn.from];
    const targetPoint = layoutObj[conn.to];

    if (!sourcePoint || !targetPoint) {
      return 'right';
    }

    if (targetPoint.x < sourcePoint.x) {
      return 'left';
    }
    if (targetPoint.x > sourcePoint.x) {
      return 'right';
    }
    return 'bottom';
  }

  private getTargetSide(
    conn: DatamartConnection,
    layoutObj: Record<string, { x: number; y: number }>,
  ): HandleSide {
    if (conn.relation === 'fact-sub') {
      return 'top';
    }

    if (conn.to === 'dim_contrat' && conn.from === 'fact_balance') {
      return 'right';
    }

    if (conn.to === 'dim_client' && conn.from === 'fact_balance') {
      return 'left';
    }

    if (conn.to === 'dim_client' && conn.from === 'dim_contrat') {
      return 'left';
    }

    if (conn.from === 'dim_contrat' && conn.relation === 'dim-sub') {
      if (conn.to === 'sub_dim_devise') {
        return 'left';
      }
      return 'right';
    }

    if (conn.from === 'dim_client' && conn.relation === 'dim-sub') {
      return 'left';
    }

    const sourcePoint = layoutObj[conn.from];
    const targetPoint = layoutObj[conn.to];

    if (!sourcePoint || !targetPoint) {
      return 'left';
    }

    if (sourcePoint.x < targetPoint.x) {
      return 'left';
    }
    if (sourcePoint.x > targetPoint.x) {
      return 'right';
    }
    return 'top';
  }

  private getEdgeRelation(edge: Edge): DatamartConnection['relation'] {
    const relation = (edge as any)?.data?.()?.relation;
    if (relation === 'fact-dim' || relation === 'dim-sub' || relation === 'fact-sub') {
      return relation;
    }
    return 'fact-dim';
  }

  private isEdgeDimmed(edge: Edge): boolean {
    const selected = this.selectedTable();
    if (!selected) {
      return false;
    }

    return !(edge.source === selected || edge.target === selected);
  }
}
