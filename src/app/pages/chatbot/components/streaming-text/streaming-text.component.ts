import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-streaming-text',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="streaming-text">
      <span [innerHTML]="renderedHtml"></span>
      <span *ngIf="streaming" class="cursor" aria-hidden="true"></span>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .streaming-text {
      font-size: 14px;
      line-height: 1.65;
      color: var(--text-primary);
      word-wrap: break-word;
    }

    .streaming-text ::ng-deep p {
      margin: 0 0 10px 0;
    }
    .streaming-text ::ng-deep p:last-child { margin-bottom: 0; }

    .streaming-text ::ng-deep strong {
      font-weight: 700;
      color: var(--text-primary);
    }

    .streaming-text ::ng-deep em {
      font-style: italic;
      color: var(--text-secondary);
    }

    .streaming-text ::ng-deep code {
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12.5px;
      padding: 1px 6px;
      border-radius: 5px;
      background: rgba(1, 181, 116, 0.10);
      color: var(--color-primary);
      border: 1px solid rgba(1, 181, 116, 0.15);
    }

    .streaming-text ::ng-deep pre {
      margin: 10px 0;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.04);
      border: 1px solid var(--color-border);
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.55;
    }
    :host-context(html.dark) .streaming-text ::ng-deep pre {
      background: rgba(255, 255, 255, 0.03);
    }
    .streaming-text ::ng-deep pre code {
      background: transparent;
      border: none;
      padding: 0;
      color: var(--text-primary);
      font-size: 12px;
    }

    .streaming-text ::ng-deep ul,
    .streaming-text ::ng-deep ol {
      margin: 6px 0 10px 0;
      padding-left: 22px;
    }
    .streaming-text ::ng-deep li { margin: 3px 0; }
    .streaming-text ::ng-deep ul li { list-style: disc; }
    .streaming-text ::ng-deep ol li { list-style: decimal; }

    .streaming-text ::ng-deep h1,
    .streaming-text ::ng-deep h2,
    .streaming-text ::ng-deep h3 {
      font-weight: 700;
      color: var(--text-primary);
      margin: 14px 0 6px 0;
      line-height: 1.3;
    }
    .streaming-text ::ng-deep h1 { font-size: 18px; }
    .streaming-text ::ng-deep h2 { font-size: 16px; }
    .streaming-text ::ng-deep h3 { font-size: 14.5px; }

    .streaming-text ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 12.5px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .streaming-text ::ng-deep th,
    .streaming-text ::ng-deep td {
      padding: 6px 10px;
      border-bottom: 1px solid var(--color-border);
      text-align: left;
    }
    .streaming-text ::ng-deep th {
      background: var(--bg-page);
      font-weight: 600;
      color: var(--text-primary);
    }

    .streaming-text ::ng-deep .value-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 12.5px;
      font-variant-numeric: tabular-nums;
      margin: 0 1px;
    }
    .streaming-text ::ng-deep .value-chip.healthy {
      background: rgba(1, 181, 116, 0.12);
      color: #047857;
      border: 1px solid rgba(1, 181, 116, 0.25);
    }
    :host-context(html.dark) .streaming-text ::ng-deep .value-chip.healthy {
      color: #6ee7b7;
    }
    .streaming-text ::ng-deep .value-chip.critical {
      background: rgba(239, 68, 68, 0.12);
      color: #b91c1c;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    :host-context(html.dark) .streaming-text ::ng-deep .value-chip.critical {
      color: #fca5a5;
    }

    .streaming-text ::ng-deep .severity-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin: 0 1px;
      vertical-align: middle;
    }
    .streaming-text ::ng-deep .severity-badge.critical {
      background: rgba(239, 68, 68, 0.15);
      color: #b91c1c;
    }
    :host-context(html.dark) .streaming-text ::ng-deep .severity-badge.critical { color: #fca5a5; }
    .streaming-text ::ng-deep .severity-badge.alert {
      background: rgba(249, 115, 22, 0.15);
      color: #c2410c;
    }
    :host-context(html.dark) .streaming-text ::ng-deep .severity-badge.alert { color: #fdba74; }
    .streaming-text ::ng-deep .severity-badge.warning {
      background: rgba(234, 179, 8, 0.15);
      color: #a16207;
    }
    :host-context(html.dark) .streaming-text ::ng-deep .severity-badge.warning { color: #fde047; }
    .streaming-text ::ng-deep .severity-badge.healthy {
      background: rgba(1, 181, 116, 0.15);
      color: #047857;
    }
    :host-context(html.dark) .streaming-text ::ng-deep .severity-badge.healthy { color: #6ee7b7; }

    .cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      vertical-align: text-bottom;
      background: var(--color-primary);
      margin-left: 2px;
      animation: blink 0.85s ease-in-out infinite;
      border-radius: 1px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0; }
    }
  `],
})
export class StreamingTextComponent {
  private sanitizer = inject(DomSanitizer);

  @Input() set text(value: string) {
    this._text = value ?? '';
    const html = renderMarkdown(this._text);
    this.renderedHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }
  get text(): string {
    return this._text;
  }

  @Input() streaming = false;

  private _text = '';
  renderedHtml: SafeHtml = '';
}

// ─── Minimal-but-decent Markdown renderer ────────────────────────────────────
// Supports: bold, italic, inline code, fenced code, lists (ul/ol), headings,
// pipe tables, percent chips, severity badges. Streaming-friendly: tolerates
// half-open ** and ` pairs.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text: string): string {
  let out = escapeHtml(text);

  // Inline code
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Bold
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

  // Italic — careful with `_` collisions
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?])/g, '$1<em>$2</em>');

  // Severity badges (whole-word)
  out = out.replace(
    /\b(CRITICAL|CRITIQUE)\b/g,
    '<span class="severity-badge critical">$1</span>'
  );
  out = out.replace(
    /\b(ALERT|ALERTE)\b/g,
    '<span class="severity-badge alert">$1</span>'
  );
  out = out.replace(
    /\b(WARNING|VIGILANCE)\b/g,
    '<span class="severity-badge warning">$1</span>'
  );
  out = out.replace(
    /\b(HEALTHY|SAIN|OK)\b/g,
    '<span class="severity-badge healthy">$1</span>'
  );

  // Percent value chips: 12.34%, 12,34%, -3,5%
  out = out.replace(
    /(<strong>)?(-?\d+[.,]?\d*\s?%)(<\/strong>)?/g,
    (_match, openStrong, value) => {
      const numericText = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      const num = parseFloat(numericText);
      const isCritical = !isNaN(num) && (num < 8 || num > 100);
      const klass = isCritical ? 'critical' : 'healthy';
      const inner = `<span class="value-chip ${klass}">${value}</span>`;
      return openStrong ? `<strong>${inner}</strong>` : inner;
    }
  );

  return out;
}

function renderMarkdown(src: string): string {
  if (!src) return '';
  const lines = src.split(/\r?\n/);
  const out: string[] = [];

  let i = 0;
  let inCode = false;
  let codeLang = '';
  let codeBuf: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  let listBuf: string[] = [];
  const flushList = () => {
    if (listType && listBuf.length) {
      out.push(`<${listType}>${listBuf.join('')}</${listType}>`);
    }
    listType = null;
    listBuf = [];
  };

  let paraBuf: string[] = [];
  const flushPara = () => {
    if (paraBuf.length) {
      out.push(`<p>${renderInline(paraBuf.join(' '))}</p>`);
      paraBuf = [];
    }
  };

  // Table accumulator
  let tableRows: string[][] | null = null;
  const flushTable = () => {
    if (tableRows && tableRows.length >= 1) {
      const [header, ...body] = tableRows;
      const headHtml =
        header
          .map((c) => `<th>${renderInline(c.trim())}</th>`)
          .join('') ?? '';
      const bodyHtml = body
        .map(
          (row) =>
            `<tr>${row
              .map((c) => `<td>${renderInline(c.trim())}</td>`)
              .join('')}</tr>`
        )
        .join('');
      out.push(
        `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
      );
    }
    tableRows = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code
    const fence = line.match(/^```([\w-]*)\s*$/);
    if (fence) {
      if (inCode) {
        out.push(
          `<pre><code class="lang-${codeLang}">${escapeHtml(
            codeBuf.join('\n')
          )}</code></pre>`
        );
        inCode = false;
        codeBuf = [];
        codeLang = '';
      } else {
        flushPara();
        flushList();
        flushTable();
        inCode = true;
        codeLang = fence[1] || '';
        codeBuf = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    // Table — quick & dirty: two consecutive lines with pipes
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushPara();
      flushList();
      if (!tableRows) tableRows = [];
      // Skip separator row `| --- | --- |`
      if (!/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line)) {
        const cells = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|');
        tableRows.push(cells);
      }
      i++;
      continue;
    } else if (tableRows) {
      flushTable();
    }

    // Heading
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushPara();
      flushList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // List items
    const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
    const olMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ulMatch) {
      flushPara();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listBuf.push(`<li>${renderInline(ulMatch[1])}</li>`);
      i++;
      continue;
    }
    if (olMatch) {
      flushPara();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listBuf.push(`<li>${renderInline(olMatch[1])}</li>`);
      i++;
      continue;
    } else if (listType) {
      flushList();
    }

    // Blank line ends paragraph
    if (line.trim() === '') {
      flushPara();
      i++;
      continue;
    }

    paraBuf.push(line);
    i++;
  }

  // Flush leftovers (streaming-friendly)
  flushPara();
  flushList();
  flushTable();
  if (inCode) {
    out.push(
      `<pre><code class="lang-${codeLang}">${escapeHtml(codeBuf.join('\n'))}</code></pre>`
    );
  }

  return out.join('');
}
