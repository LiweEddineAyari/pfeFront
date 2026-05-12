/**
 * Chat domain models — AI chatbot page.
 * Mirrors the backend SSE protocol from /ai/chat.
 */

// ─── SSE Events ──────────────────────────────────────────────────────────────

export type ChatEventType =
  | 'session'
  | 'token'
  | 'tool_executed'
  | 'rag_sources'
  | 'done'
  | 'error';

export interface SessionEventData {
  sessionId: string;
  isNew: boolean;
}

export interface TokenEventData {
  text: string;
}

export interface ToolExecutedEventData {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface RagSourcesEventData {
  sources: RagSource[];
}

export interface DoneEventData {
  sessionId: string;
  finishReason?: string;
}

export interface ErrorEventData {
  message: string;
}

export type ChatEventData =
  | SessionEventData
  | TokenEventData
  | ToolExecutedEventData
  | RagSourcesEventData
  | DoneEventData
  | ErrorEventData;

export interface ChatEvent {
  type: ChatEventType;
  data: ChatEventData;
}

// ─── Streaming UI state ──────────────────────────────────────────────────────

export type StreamingState =
  | 'idle'
  | 'thinking'
  | 'tool-running'
  | 'streaming'
  | 'done';

export type ToolCardStateValue = 'queued' | 'running' | 'done' | 'error';

export interface ToolCardState {
  name: string;
  label: string;
  icon: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: ToolCardStateValue;
  startTime: number;
  duration?: number;
  error?: string;
  expanded?: boolean;
}

// ─── RAG ─────────────────────────────────────────────────────────────────────

export type RagDocumentType =
  | 'RATIO_DEFINITION'
  | 'THRESHOLD_INTERPRETATION'
  | 'RECOMMENDATION'
  | 'RISK_INTERPRETATION'
  | 'REGULATION'
  | 'PARAMETER_DEFINITION'
  | string;

export interface RagSource {
  text: string;
  documentType: RagDocumentType;
  ratioCode?: string;
  title?: string;
}

// ─── Messages & Sessions ─────────────────────────────────────────────────────

export type MessageRole = 'USER' | 'AI';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  streamingContent?: string;
  toolCards: ToolCardState[];
  ragSources: RagSource[];
  isStreaming: boolean;
  createdAt: Date;
  cancelled?: boolean;
  error?: string;
}

export type SessionStatus = 'ACTIVE' | 'ARCHIVED';

export interface ChatSession {
  id: string;
  title: string | null;
  lastMessageAt: Date | null;
  status: SessionStatus;
  isGeneratingTitle: boolean;
  createdAt?: Date;
}

// ─── Tool icon + label maps ──────────────────────────────────────────────────

export const TOOL_ICONS: Record<string, string> = {
  execute_ratio: 'bar-chart-3',
  execute_parameter: 'hash',
  get_dashboard_by_date: 'layout-dashboard',
  get_all_dashboard_rows: 'calendar',
  compare_ratio_across_dates: 'trending-up',
  check_threshold_breaches: 'alert-triangle',
  run_stress_test: 'flask-conical',
  get_stress_test_diagnostics: 'search',
  list_all_ratios: 'list',
  get_ratio_detail: 'eye',
  list_all_parameters: 'settings',
};

export const TOOL_LABELS: Record<string, string> = {
  execute_ratio: 'Calcul du ratio',
  execute_parameter: 'Calcul du parametre',
  get_dashboard_by_date: 'Chargement du dashboard',
  get_all_dashboard_rows: 'Recuperation toutes dates',
  compare_ratio_across_dates: 'Analyse de tendance',
  check_threshold_breaches: 'Verification des seuils',
  run_stress_test: 'Simulation stress test',
  get_stress_test_diagnostics: 'Diagnostic stress test',
  list_all_ratios: 'Catalogue des ratios',
  get_ratio_detail: 'Detail du ratio',
  list_all_parameters: 'Catalogue des parametres',
};

export function getToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name;
}

export function getToolIcon(name: string): string {
  return TOOL_ICONS[name] ?? 'wrench';
}

// ─── RAG source category color (Tailwind palette names) ──────────────────────

export interface RagCategoryStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export const RAG_CATEGORY_STYLES: Record<string, RagCategoryStyle> = {
  RATIO_DEFINITION: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    label: 'Definition',
  },
  THRESHOLD_INTERPRETATION: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    label: 'Seuils',
  },
  RECOMMENDATION: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'Recommandation',
  },
  RISK_INTERPRETATION: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
    label: 'Risque',
  },
  REGULATION: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    label: 'Reglementation',
  },
  PARAMETER_DEFINITION: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/30',
    label: 'Parametre',
  },
};

export function getRagStyle(documentType: string): RagCategoryStyle {
  return (
    RAG_CATEGORY_STYLES[documentType] ?? {
      bg: 'bg-slate-500/10',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-500/30',
      label: documentType || 'Source',
    }
  );
}

// ─── Suggestion prompts (empty state) ────────────────────────────────────────

export interface SuggestionPrompt {
  icon: string;
  label: string;
  prompt: string;
  accent?: 'green' | 'blue' | 'amber' | 'purple';
}

export const DEFAULT_SUGGESTIONS: SuggestionPrompt[] = [
  {
    icon: 'bar-chart-3',
    label: 'RS au 31/12/2024',
    prompt: "Quel est le ratio de solvabilite (RS) au 31 decembre 2024 ?",
    accent: 'green',
  },
  {
    icon: 'droplet',
    label: 'RLCT seuil alerte',
    prompt: 'Le RLCT est-il sous le seuil d\'alerte sur les 3 derniers mois ?',
    accent: 'blue',
  },
  {
    icon: 'trending-up',
    label: 'Tendance RS 2024',
    prompt: "Montre-moi l'evolution du ratio RS sur l'annee 2024.",
    accent: 'purple',
  },
  {
    icon: 'alert-triangle',
    label: 'Ratios en breach',
    prompt: 'Quels ratios sont en breach au 31 decembre 2024 ?',
    accent: 'amber',
  },
  {
    icon: 'flask-conical',
    label: 'Stress test -15% FPE',
    prompt: 'Simule un stress test avec une baisse de 15% des fonds propres en 2024.',
    accent: 'purple',
  },
  {
    icon: 'list',
    label: 'Tous les ratios',
    prompt: 'Liste tous les ratios disponibles et leur statut actuel.',
    accent: 'green',
  },
];
