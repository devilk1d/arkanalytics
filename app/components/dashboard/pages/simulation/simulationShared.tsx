'use client';

import React from 'react';

// ── Helpers ────────────────────────────────────────────────────────────────────
export function uid() { return Math.random().toString(36).slice(2, 9); }

export function riskVariant(level: string): 'high' | 'med' | 'low' {
  if (level === 'High') return 'high';
  if (level === 'Medium') return 'med';
  return 'low';
}

export function formatHorizon(w: number): string {
  if (w < 4)  return `${w}w`;
  if (w === 4) return '1mo';
  if (w % 52 === 0) return `${w / 52}yr`;
  if (w % 4 === 0)  return `${w / 4}mo`;
  return `${w}w`;
}

export function formatCurrency(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(1)}K`;
  return `$${Math.round(abs)}`;
}

export function filterThinkTags(text: string): string {
  if (!text) return '';
  const out = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return out || text.replace(/<\/?think>/gi, '').trim();
}

export function genBaseline(startScore: number, horizonWeeks: number, riskLevel: string) {
  const drift = riskLevel === 'High' ? 0.45 : riskLevel === 'Medium' ? 0.2 : -0.15;
  const pts = [];
  let v = startScore;
  for (let w = 1; w <= horizonWeeks; w++) {
    const noise = (Math.sin(w * 1.3) + Math.cos(w * 2.1)) * 1.4;
    v = Math.max(2, Math.min(98, v + drift + noise * 0.6));
    pts.push({ week: w, prob: +v.toFixed(2) });
  }
  return pts;
}

export function genSegMigration(
  churnScore: number,
  segLabels: string[],
): { label: string; prob: number }[] {
  const base   = Math.min(1, Math.max(0, churnScore / 100));
  const labels = segLabels.length >= 2 ? segLabels : ['Churned', 'High Risk', 'At Risk', 'Retained'];
  const rawProbs = labels.map(lbl => {
    const l = lbl.toLowerCase();
    // High-churn labels (customers with high churn score should be more likely here)
    if ((l.includes('high') && l.includes('value')) || l === 'churned' ||
        (l.includes('high') && l.includes('risk'))) return base * 0.85 + 0.05;
    // At-risk labels (amber group)
    if (l.includes('at-risk') || l.includes('at risk') ||
        (l.includes('risk') && !l.includes('high'))) return base * 0.6 + 0.05;
    // Disengaged
    if (l.includes('disengage') || l.includes('payer')) return base * 0.4 + 0.05;
    // Safe labels (loyal, champion, retained)
    if (l.includes('loyal') || l.includes('champion') || l === 'retained') return (1 - base) * 0.75 + 0.05;
    return 0.12;
  });
  const total = rawProbs.reduce((a, b) => a + b, 0) || 1;
  return labels.map((label, i) => ({
    label,
    prob: Math.round(rawProbs[i] / total * 1000) / 1000,
  }));
}

export const monogram = (nameOrId: string) => {
  if (!nameOrId) return '—';
  const parts = nameOrId.split(' ');
  if (parts.length > 1) return parts.map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return nameOrId.slice(0, 2).toUpperCase();
};

// ── Inline SVGs ────────────────────────────────────────────────────────────────
export const Icons = {
  Search: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  X: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Play: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Plus: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Check: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Sparkle: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  Send: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Chat: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

// ── Markdown Renderer ──────────────────────────────────────────────────────────
export function renderMd(text: string): React.ReactNode {
  if (!text) return null;
  const processInline = (str: string): React.ReactNode => {
    const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return (
      <>
        {parts.map((part, j) => {
          if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={j} className="font-semibold text-[var(--t)]">{part.slice(2, -2)}</strong>;
          if (/^\*[^*]+\*$/.test(part))     return <em key={j} className="italic text-[var(--t3)] not-italic">{part.slice(1, -1)}</em>;
          if (/^`[^`]+`$/.test(part))       return <code key={j} className="font-mono text-[11px] bg-[var(--bg1)] border border-[var(--b)] px-1 rounded">{part.slice(1, -1)}</code>;
          return part;
        })}
      </>
    );
  };

  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    const bullet   = /^[-*•]\s+(.*)/.exec(line);
    const numbered = /^(\d+)[.)]\s+(.*)/.exec(line);
    if (bullet) {
      nodes.push(
        <div key={i} className="flex gap-2 items-baseline">
          <span className="text-[var(--accent)] shrink-0 text-[10px] mt-0.5">●</span>
          <span>{processInline(bullet[1])}</span>
        </div>
      );
    } else if (numbered) {
      nodes.push(
        <div key={i} className="flex gap-2 items-baseline">
          <span className="font-semibold text-[var(--accent)] shrink-0 min-w-[1rem] text-[11px]">{numbered[1]}.</span>
          <span>{processInline(numbered[2])}</span>
        </div>
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-1.5" />);
    } else {
      nodes.push(<p key={i} className="leading-relaxed">{processInline(line)}</p>);
    }
  });
  return <>{nodes}</>;
}

// ── Micro-components ───────────────────────────────────────────────────────────
export function FactorBar({ label, importance, direction, impactRatio = 0 }: {
  label: string; importance: number; direction: string; impactRatio?: number;
}) {
  const isUp = direction === 'raises_risk' || direction.includes('increases');
  const color = isUp ? 'var(--danger)' : 'var(--accent)';
  const basePct = Math.min(100, Math.round(importance * 100));
  // When a scenario reduces churn, shrink the "increases churn" bars proportionally
  const pct = isUp && impactRatio > 0 ? Math.max(4, Math.round(basePct * (1 - impactRatio))) : basePct;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] text-[var(--t)] font-semibold truncate max-w-[70%]">{label}</span>
        <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>
          {isUp ? '↑' : '↓'} {pct}%
        </span>
      </div>
      <div className="bar thin">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

/**
 * Segment color for migration bars.
 * MUST stay in sync with getSegmentColorway() in SegmentationPage.tsx.
 * Both use label keywords only — never cluster index.
 *
 * Ground truth (from actual model data):
 *   At-Risk Actives    → amber  (--c-amber)
 *   Disengaged Payers  → purple (--c-purple)
 *   Loyal Champions    → blue   (--c-blue)
 *   High-Value At-Risk → red    (--c-red)
 */
function getSegMigrationColor(label: string): string {
  const l = label.toLowerCase();
  // Same priority order as getSegmentColorway in SegmentationPage.tsx
  if ((l.includes('high') && l.includes('value')) || l === 'churned') return 'var(--c-red)';
  if (l.includes('loyal') || l.includes('champion') || l === 'retained') return 'var(--c-blue)';
  if (l.includes('disengage') || l.includes('payer') || l.includes('dormant')) return 'var(--c-purple)';
  if (l.includes('at-risk') || l.includes('at risk') || l.includes('active') ||
      (l.includes('risk') && !l.includes('high'))) return 'var(--c-amber)';
  if (l.includes('new') || l.includes('potential') || l.includes('prospect')) return 'var(--c-emerald)';
  if (l.includes('high') && l.includes('risk')) return 'var(--danger)';
  return 'var(--c-blue)';
}

export function SegBar({ item }: { item: { label: string; prob: number } }) {
  const pct = Math.round(item.prob * 100);
  const color = getSegMigrationColor(item.label);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] text-[var(--t)] font-semibold">{item.label}</span>
        <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="bar thin">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}