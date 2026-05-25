'use client';

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useDashboardContext } from '../../context/DashboardContext';
import SimulationChart from './SimulationChart';
import Badge from '../../ui/Badge';
import {
  type PredictionRow, type SimData, type AgentMessage,
  type Phase, type HistoryEntry, type RunSnapshot, type ScenarioTurn, type AskTurn,
  HORIZON_PRESETS,
} from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid()  { return Math.random().toString(36).slice(2, 9); }

function riskVariant(level: string): 'high' | 'med' | 'low' {
  if (level === 'High') return 'high';
  if (level === 'Medium') return 'med';
  return 'low';
}

function formatHorizon(w: number): string {
  if (w < 4)  return `${w}w`;
  if (w === 4) return '1mo';
  if (w % 52 === 0) return `${w / 52}yr`;
  if (w % 4 === 0)  return `${w / 4}mo`;
  return `${w}w`;
}

function formatCurrency(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(1)}K`;
  return `$${Math.round(abs)}`;
}

function filterThinkTags(text: string): string {
  if (!text) return '';
  const out = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return out || text.replace(/<\/?think>/gi, '').trim();
}

function genBaseline(startScore: number, horizonWeeks: number, riskLevel: string) {
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

// ── Monogram helper ───────────────────────────────────────────────────────────
const monogram = (nameOrId: string) => {
  if (!nameOrId) return '—';
  const parts = nameOrId.split(' ');
  if (parts.length > 1) {
    return parts.map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
  return nameOrId.slice(0, 2).toUpperCase();
};

// ── Inline SVGs ───────────────────────────────────────────────────────────────
const Icons = {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
  )
};

// ── Markdown Renderer ─────────────────────────────────────────────────────────
function renderMd(text: string): React.ReactNode {
  if (!text) return null;
  const processInline = (str: string, key: string): React.ReactNode => {
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
          <span>{processInline(bullet[1], `${i}`)}</span>
        </div>
      );
    } else if (numbered) {
      nodes.push(
        <div key={i} className="flex gap-2 items-baseline">
          <span className="font-semibold text-[var(--accent)] shrink-0 min-w-[1rem] text-[11px]">{numbered[1]}.</span>
          <span>{processInline(numbered[2], `${i}`)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-1.5" />);
    } else {
      nodes.push(<p key={i} className="leading-relaxed">{processInline(line, `${i}`)}</p>);
    }
  });
  return <>{nodes}</>;
}

// ── Micro-components ──────────────────────────────────────────────────────────
function FactorBar({ label, importance, direction }: { label: string; importance: number; direction: string }) {
  const pct = Math.min(100, Math.round(importance * 100));
  const isUp = direction.includes('increases');
  const color = isUp ? 'var(--danger)' : 'var(--accent)';
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] text-[var(--t2)] font-medium truncate max-w-[70%]">{label}</span>
        <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>
          {isUp ? '↑' : '↓'} {pct}%
        </span>
      </div>
      <div className="bar thin">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const SEG_COLORS: Record<string, string> = {
  Critical:   'var(--danger)',
  Potentials: 'var(--warn)',
  Loyalists:  'var(--info)',
  Champions:  'var(--accent)',
};

function SegBar({ item }: { item: { label: string; prob: number } }) {
  const pct = Math.round(item.prob * 100);
  const color = SEG_COLORS[item.label] || 'var(--accent)';
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] text-[var(--t2)]">{item.label}</span>
        <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="bar thin">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Default Mock Agents List for welcome/initial placeholders ──────────────────
const DEFAULT_AGENTS = [
  { short: 'BH', name: 'Behavioral Analyst', color: 'var(--accent)' },
  { short: 'RV', name: 'Revenue Strategist', color: 'var(--info)' },
  { short: 'CS', name: 'Customer Success',   color: 'var(--warn)' },
  { short: 'PR', name: 'Product Researcher', color: '#D8A0E8' },
];

// ── Default Mock Playbooks ────────────────────────────────────────────────────
const DEFAULT_RECS = [
  'Schedule QBR with admin + decision maker this week',
  'Offer 3-month premium support trial at renewal',
  'Trigger re-onboarding flow for new team members',
  'Send personalized usage report with peer benchmarks',
];

// ═══════════════════════════════════════════════════════════════════════════════
// ── Main Page Inner ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function SimulationPageInner() {
  const searchParams = useSearchParams();
  const { workspace } = useDashboardContext();
  const supabase = createClient();

  // ── Dataset ────────────────────────────────────────────────────────────────
  const [datasetId, setDatasetId] = useState<string | null>(searchParams.get('dataset_id'));
  useEffect(() => {
    if (datasetId || !workspace) return;
    supabase.from('datasets').select('id').eq('workspace_id', workspace.id).eq('status', 'done')
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setDatasetId(data[0].id as string); });
  }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client-side Customer List (instantly searchable) ────────────────────────
  const [customersList, setCustomersList] = useState<PredictionRow[]>([]);
  useEffect(() => {
    if (!datasetId) return;
    async function fetchAllPredictions() {
      let allData: PredictionRow[] = [];
      let pageIndex = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = pageIndex * batchSize;
        const to = from + batchSize - 1;
        const { data, error } = await supabase
          .from('predictions')
          .select('*')
          .eq('dataset_id', datasetId)
          .range(from, to);

        if (error) {
          console.error('Error fetching predictions batch:', error);
          break;
        }
        if (data && data.length > 0) {
          allData = [...allData, ...(data as PredictionRow[])];
          if (data.length < batchSize) {
            hasMore = false;
          } else {
            pageIndex++;
          }
        } else {
          hasMore = false;
        }
      }
      setCustomersList(allData);
    }
    fetchAllPredictions();
  }, [datasetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Customer selection state ───────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState('');
  const [compareId, setCompareId] = useState<string | null>(null);
  
  const customer = useMemo(() => customersList.find(c => c.customer_id === selectedId) || null, [selectedId, customersList]);
  const compareCustomer = useMemo(() => customersList.find(c => c.customer_id === compareId) || null, [compareId, customersList]);

  const [segLabels,  setSegLabels]  = useState<string[]>([]);
  useEffect(() => {
    if (customersList.length) {
      setSegLabels([...new Set(customersList.map(r => r.segment_label).filter(Boolean))]);
    }
  }, [customersList]);

  // ── Simulation state ───────────────────────────────────────────────────────
  const [phase,        setPhase]        = useState<Phase>('idle');
  const [horizonWeeks, setHorizonWeeks] = useState(12);
  const [simData,      setSimData]      = useState<SimData | null>(null);
  const [compareData,  setCompareData]  = useState<SimData | null>(null);
  const [narrative,    setNarrative]    = useState('');
  const [agents,       setAgents]       = useState<AgentMessage[]>([]);
  const [agentRecs,    setAgentRecs]    = useState<string[]>([]);
  const [isSynth,         setIsSynth]         = useState(false);
  const [error,           setError]           = useState('');
  const [runIndex,        setRunIndex]        = useState(0);
  const [compareAgentRecs, setCompareAgentRecs] = useState<string[]>([]);

  // ── Chat state ─────────────────────────────────────────────────────────────
  interface ChatMsg { id: string; role: 'user' | 'ai'; content: string; streaming?: boolean }
  const [chatMsgs,   setChatMsgs]   = useState<ChatMsg[]>([]);
  const [chatInput,  setChatInput]  = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Custom Scenario input ──────────────────────────────────────────────────
  const [scenInput, setScenInput] = useState('');

  // ── Tab state inside column 3 (Playbook vs Chat) ───────────────────────────
  const [thirdTab, setThirdTab] = useState<'playbook' | 'chat'>('playbook');

  // ── Overlay switches (switch | compare) ────────────────────────────────────
  const [cmdkMode, setCmdkMode] = useState<'switch' | 'compare' | null>(null);

  // ── History & View states ──────────────────────────────────────────────────
  const [history,      setHistory]      = useState<HistoryEntry[]>([]);
  const [viewingSnap,  setViewingSnap]  = useState<RunSnapshot | ScenarioTurn | null>(null);

  // ── LLM chat history context ────────────────────────────────────────────────
  const [chatCtx, setChatCtx] = useState<{ question: string; narrative: string }[]>([]);

  const abortRef    = useRef<AbortController | null>(null);
  const narRef      = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef('');

  // Reset when selected customer changes
  useEffect(() => {
    setSimData(null); setCompareData(null); setNarrative(''); setAgents([]); setAgentRecs([]); setCompareAgentRecs([]);
    setPhase('idle'); setError(''); setChatMsgs([]); setChatInput(''); setScenInput('');
    setHistory([]); setViewingSnap(null); setChatCtx([]); setCompareId(null);
    scenarioRef.current = '';
  }, [selectedId]);

  useEffect(() => { if (narRef.current) narRef.current.scrollTop = narRef.current.scrollHeight; }, [narrative]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  // Generate comparison baseline trajectory when compareId or horizon changes
  useEffect(() => {
    if (!compareId) {
      setCompareData(null);
      return;
    }
    if (compareCustomer) {
      const baseline = genBaseline(compareCustomer.churn_score, horizonWeeks, compareCustomer.risk_level);
      setCompareData({
        baseline,
        projection: null,
        retention_window_weeks: 0,
        revenue_at_risk: 0,
        confidence: 0.86,
        intervention_impact_pct: null,
        segment_migration: [],
      });
    }
  }, [compareId, horizonWeeks, compareCustomer]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cmdkMode) {
        setCmdkMode(null);
        return;
      }
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      // Cmd+K or Ctrl+K - Switch customer overlay
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkMode('switch');
        return;
      }
      // R - Run simulation
      if (!isInput && e.key.toLowerCase() === 'r' && customer && phase !== 'running' && phase !== 'chatting') {
        e.preventDefault();
        handleRunInitial();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [customer, phase, cmdkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core SSE runner ────────────────────────────────────────────────────────
  const runSSE = useCallback(async (
    text: string, mode: 'initial' | 'scenario' | 'ask'
  ) => {
    if (!customer) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError('');

    if (mode === 'initial') {
      setPhase('running'); setSimData(null); setNarrative('');
      setAgents([]); setAgentRecs([]); setCompareAgentRecs([]); setIsSynth(false); setViewingSnap(null);
      scenarioRef.current = '';
      setRunIndex(i => i + 1);
    } else if (mode === 'scenario') {
      setPhase('chatting'); setNarrative('');
      setAgents([]); setAgentRecs([]); setCompareAgentRecs([]); setIsSynth(false); setViewingSnap(null);
      scenarioRef.current = text;
      setRunIndex(i => i + 1);
    } else {
      setPhase('asking');
    }

    const compareC = compareCustomer;
    const payload: Record<string, unknown> = {
      customer_data: {
        customer_id: customer.customer_id, churn_score: customer.churn_score,
        risk_level: customer.risk_level, plan_type: customer.plan_type,
        contract_type: customer.contract_type, segment_label: customer.segment_label,
        shap_top5: customer.shap_top5 ?? [], sentiment: customer.sentiment ?? {},
        segment_rfm_context: customer.segment_rfm_context ?? {},
        nlp_red_flag: customer.nlp_red_flag ?? 0, loyalty_risk_flag: customer.loyalty_risk_flag ?? 0,
      },
      scenario: text, chat_history: chatCtx, horizon_weeks: horizonWeeks, segment_labels: segLabels, mode,
    };
    if (compareC) {
      payload.compare_customer_data = {
        customer_id: compareC.customer_id, churn_score: compareC.churn_score,
        risk_level: compareC.risk_level, plan_type: compareC.plan_type,
        contract_type: compareC.contract_type, segment_label: compareC.segment_label,
        shap_top5: compareC.shap_top5 ?? [], sentiment: compareC.sentiment ?? {},
        segment_rfm_context: compareC.segment_rfm_context ?? {},
        nlp_red_flag: compareC.nlp_red_flag ?? 0, loyalty_risk_flag: compareC.loyalty_risk_flag ?? 0,
      };
    }

    let narAccum = '';
    let latestSim: SimData | null = mode !== 'initial' ? simData : null;
    let latestAgents: AgentMessage[] = [];
    let latestRecs: string[] = [];
    let askMsgId = '';
    if (mode === 'ask') {
      askMsgId = uid();
      setChatMsgs(prev => [...prev, { id: uid(), role: 'user', content: text }, { id: askMsgId, role: 'ai', content: '', streaming: true }]);
    }

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader(), decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let evt: Record<string, unknown>;
          try { evt = JSON.parse(raw); } catch { continue; }

          if (evt.type === 'agent_start') {
            const m: AgentMessage = { name: evt.agent as string, short: evt.short as string, color: (evt.color as string) ?? '#6366f1', content: '', done: false };
            setAgents(prev => { const n = [...prev, m]; latestAgents = n; return n; });
          } else if (evt.type === 'agent_token') {
            setAgents(prev => { const n = prev.map(a => a.name === evt.agent as string ? { ...a, content: a.content + (evt.content as string) } : a); latestAgents = n; return n; });
          } else if (evt.type === 'agent_done') {
            setAgents(prev => { const n = prev.map(a => a.name === evt.agent as string ? { ...a, done: true } : a); latestAgents = n; return n; });
          } else if (evt.type === 'agent_recommendations') {
            const recs = (evt.recommendations as string[]) ?? [];
            setAgentRecs(recs); latestRecs = recs;
            if (evt.compare_recommendations) {
              setCompareAgentRecs((evt.compare_recommendations as string[]) ?? []);
            }
          } else if (evt.type === 'thinking') {
            setIsSynth(true);
          } else if (evt.type === 'data') {
            setIsSynth(false);
            const inc = evt.payload as Partial<SimData>;
            if (inc.baseline) {
              latestSim = inc as SimData; setSimData(latestSim);
            } else {
              setSimData(prev => {
                if (!prev) return prev;
                const n = { ...prev, projection: inc.projection ?? prev.projection, intervention_impact_pct: inc.intervention_impact_pct ?? prev.intervention_impact_pct, confidence: inc.confidence ?? prev.confidence, retention_window_weeks: inc.retention_window_weeks ?? prev.retention_window_weeks, revenue_at_risk: inc.revenue_at_risk ?? prev.revenue_at_risk, segment_migration: inc.segment_migration ?? prev.segment_migration };
                latestSim = n; return n;
              });
            }
          } else if (evt.type === 'token') {
            const tok = (evt.content as string) ?? '';
            narAccum += tok;
            if (mode === 'ask') {
              setChatMsgs(prev => prev.map(m => m.id === askMsgId ? { ...m, content: filterThinkTags(narAccum) } : m));
            } else {
              setNarrative(filterThinkTags(narAccum));
            }
          } else if (evt.type === 'done') {
            const final = filterThinkTags((evt.narrative as string) || narAccum);
            if (mode === 'ask') {
              setChatMsgs(prev => prev.map(m => m.id === askMsgId ? { ...m, content: final, streaming: false } : m));
              setChatCtx(prev => [...prev, { question: text, narrative: final }]);
              setHistory(prev => [{ type: 'ask', id: uid(), question: text, answer: final, timestamp: new Date() } as AskTurn, ...prev]);
            } else {
              setNarrative(final); setIsSynth(false);
              if (mode === 'scenario' && text.trim()) setChatCtx(prev => [...prev, { question: text, narrative: final }]);
              if (latestSim) {
                const entry = mode === 'initial'
                  ? { type: 'run', id: uid(), label: 'Initial Simulation', timestamp: new Date(), horizonWeeks, simData: latestSim, narrative: final, agents: latestAgents, recommendations: latestRecs } as RunSnapshot
                  : { type: 'scenario', id: uid(), label: text.trim() || 'Scenario', timestamp: new Date(), scenario: text, narrative: final, simData: latestSim, agents: latestAgents, recommendations: latestRecs } as ScenarioTurn;
                setHistory(prev => [entry, ...prev]);
              }
            }
            setPhase('done');
          } else if (evt.type === 'error') {
            if (mode === 'ask') setChatMsgs(prev => prev.map(m => m.id === askMsgId ? { ...m, content: `Error: ${evt.message}`, streaming: false } : m));
            setError((evt.message as string) ?? 'An error occurred');
            setPhase('error');
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') {
        if (mode === 'ask') setChatMsgs(prev => prev.map(m => m.id === askMsgId ? { ...m, content: 'Connection lost.', streaming: false } : m));
        setError((e as Error)?.message ?? 'Network error'); setPhase('error');
      }
    }
  }, [customer, compareCustomer, chatCtx, simData, horizonWeeks, segLabels]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived display values ─────────────────────────────────────────────────
  const isLoading     = phase === 'running' || phase === 'chatting' || phase === 'asking';
  const dispSimData   = viewingSnap?.simData   ?? simData;
  const dispNarrative = viewingSnap ? ('narrative' in viewingSnap ? viewingSnap.narrative : '') : narrative;
  const dispAgents    = viewingSnap?.agents    ?? agents;
  const dispRecs         = viewingSnap?.recommendations ?? agentRecs;
  const dispCompareRecs  = compareAgentRecs;
  const dispHorizon      = viewingSnap && 'horizonWeeks' in viewingSnap ? viewingSnap.horizonWeeks : horizonWeeks;
  const hasResults       = dispSimData !== null;

  // KPI computations
  const baseEnd       = dispSimData?.baseline?.at(-1)?.prob ?? customer?.churn_score ?? 0;
  const projEnd       = dispSimData?.projection?.at(-1)?.prob ?? null;
  const initialScore  = customer?.churn_score ?? 0;
  const shownChurn    = projEnd ?? baseEnd;
  const churnDelta    = projEnd !== null ? (projEnd - baseEnd) : (baseEnd - initialScore);
  const revAtRisk     = customer ? (customer.segment_rfm_context?.total_revenue?.customer ?? 0) * (baseEnd / 100) * 12 : 0;
  const confidence    = dispSimData?.confidence ?? 0.86;

  const compareBaseEnd = compareData?.baseline?.at(-1)?.prob ?? null;
  const compareRevRisk = compareCustomer && compareBaseEnd !== null
    ? (compareCustomer.segment_rfm_context?.total_revenue?.customer ?? 0) * (compareBaseEnd / 100) * 12
    : null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRunInitial = () => { if (!customer || isLoading) return; runSSE('', 'initial'); };
  const handleScenario   = (scenText: string) => {
    const t = scenText.trim();
    if (!t || isLoading) return;
    setScenInput('');
    runSSE(t, 'scenario');
  };
  const handleSendChat   = () => {
    const t = chatInput.trim();
    if (!t || phase === 'asking') return;
    setChatInput('');
    setThirdTab('chat');
    runSSE(t, 'ask');
  };

  // ── CustomerPicker Nested Component ────────────────────────────────────────
  const CustomerPicker = ({
    value, exclude = [], onSelect, onClose, label = 'Pick a customer', hint = '', pad = 18
  }: {
    value: string | null; exclude?: string[]; onSelect: (id: string) => void;
    onClose?: () => void; label?: string; hint?: string; pad?: number;
  }) => {
    const [search, setSearch] = useState('');
    const [debSearch, setDebSearch] = useState('');
    const [risk, setRisk] = useState('all');
    const [plan, setPlan] = useState('all');
    const [page, setPage] = useState(1);
    const searchRef = useRef<HTMLInputElement>(null);

    // Focus input on mount
    useEffect(() => {
      setTimeout(() => searchRef.current?.focus(), 60);
    }, []);

    // Debounce search input by 200ms
    useEffect(() => {
      const t = setTimeout(() => {
        setDebSearch(search);
      }, 200);
      return () => clearTimeout(t);
    }, [search]);

    // Reset pagination page on filter/search changes
    useEffect(() => {
      setPage(1);
    }, [debSearch, risk, plan]);

    const counts = useMemo(() => {
      const pool = customersList.filter(c => !exclude.includes(c.customer_id));
      return {
        all: pool.length,
        high: pool.filter(c => c.risk_level === 'High').length,
        medium: pool.filter(c => c.risk_level === 'Medium').length,
        low: pool.filter(c => c.risk_level === 'Low').length,
      };
    }, [exclude, customersList]);

    const plans = useMemo(() => {
      return ['all', ...Array.from(new Set(customersList.map(c => c.plan_type)))];
    }, [customersList]);

    const filtered = useMemo(() => {
      return customersList.filter(c => {
        if (exclude.includes(c.customer_id)) return false;
        if (debSearch.trim() && !`${c.customer_id} ${c.segment_label}`.toLowerCase().includes(debSearch.toLowerCase())) return false;
        if (risk !== 'all' && c.risk_level !== risk) return false;
        if (plan !== 'all' && c.plan_type !== plan) return false;
        return true;
      });
    }, [exclude, debSearch, risk, plan, customersList]);

    const PAGE_SIZE = 12;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    
    const paginated = useMemo(() => {
      return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    }, [filtered, page]);

    return (
      <div style={{ padding: `${pad}px ${pad + 6}px` }} className="flex flex-col gap-3.5">
        <div className="picker-toolbar">
          <div className="picker-search">
            <Icons.Search />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={label} />
            {(search || risk !== 'all' || plan !== 'all') && (
              <button onClick={() => { setSearch(''); setRisk('all'); setPlan('all'); }}
                className="text-[var(--t3)] text-[10px] font-mono uppercase tracking-[0.06em]">
                Clear
              </button>
            )}
          </div>

          <span className="picker-filter-label">Risk</span>
          <div className="picker-filter-group">
            {[
              ['all', 'All'],
              ['High', 'High'],
              ['Medium', 'Med'],
              ['Low', 'Low']
            ].map(([k, l]) => (
              <button key={k} className={`picker-filter-btn ${risk === k ? 'on' : ''}`} onClick={() => setRisk(k)}>
                {l} <span className="count">{counts[k as keyof typeof counts]}</span>
              </button>
            ))}
          </div>

          <span className="picker-filter-label">Plan</span>
          <div className="picker-filter-group">
            {plans.map(p => (
              <button key={p} className={`picker-filter-btn ${plan === p ? 'on' : ''}`} onClick={() => setPlan(p)}>
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--t3)] font-mono uppercase tracking-[0.1em]">
            {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'}
            {hint && <span className="text-[var(--t4)] ml-2.5">{hint}</span>}
          </span>
          {onClose && (
            <button onClick={onClose}
              className="text-[var(--t3)] text-[10px] font-mono uppercase tracking-[0.1em] inline-flex items-center gap-1.5">
              <Icons.X /> Close <kbd className="kbd-hint ml-1">Esc</kbd>
            </button>
          )}
        </div>

        <div className="picker-list">
          {paginated.length === 0 && (
            <div className="picker-empty">No customers match the current filters</div>
          )}
          {paginated.map(c => {
            const initials = monogram(c.customer_id);
            const rc = c.risk_level === 'High' ? 'var(--danger)' : c.risk_level === 'Medium' ? 'var(--warn)' : 'var(--accent)';
            const rl = riskVariant(c.risk_level);
            return (
              <button key={c.customer_id}
                className={`picker-row ${c.customer_id === value ? 'on' : ''}`}
                onClick={() => onSelect(c.customer_id)}
              >
                <div className="picker-row-mark" style={{ borderColor: rc }}>{initials}</div>
                <div className="picker-row-info">
                  <div className="picker-row-name">{c.customer_id}</div>
                  <div className="picker-row-meta">{c.plan_type} · {c.contract_type} · {c.segment_label}</div>
                </div>
                <div className="picker-row-stats">
                  <Badge label={c.risk_level} variant={c.risk_level === 'Low' ? 'low' : c.risk_level === 'High' ? 'high' : 'med'} />
                  <span className="picker-row-score" style={{ color: rc }}>{c.churn_score.toFixed(0)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Picker Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-3 border-t border-[var(--b)] text-[11px] text-[var(--t3)] font-mono">
            <span>
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(filtered.length, page * PAGE_SIZE)} of {filtered.length}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-2 py-1 rounded bg-[var(--bg2)] border border-[var(--b)] text-[var(--t)] hover:bg-[var(--bg3)] hover:text-[var(--t2)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Prev
              </button>
              <span className="self-center">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 rounded bg-[var(--bg2)] border border-[var(--b)] text-[var(--t)] hover:bg-[var(--bg3)] hover:text-[var(--t2)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── StatCell Component with Compare Support ─────────────────────────────────
  const StatCell = ({ label, primary, secondary, compareLabel, foot, variant, delta }: {
    label: string; primary: string | number; secondary?: string | number | null;
    compareLabel?: string | null; foot?: string; variant?: string; delta?: number | null;
  }) => {
    const isCompare = secondary != null && compareLabel;
    const deltaColor = delta != null ? (delta > 0 ? 'var(--danger)' : 'var(--accent)') : undefined;
    const deltaArrow = delta != null ? (delta > 0 ? '↑' : '↓') : null;
    if (isCompare) {
      return (
        <div className={`stat-cell ${variant || ''} compare`}>
          <div className="stat-label">{label}</div>
          <div className="compare-row a"><span className="who">A</span> {primary}</div>
          <div className="compare-row b"><span className="who">B</span> {secondary}</div>
          {foot && <div className="stat-foot">{foot}</div>}
        </div>
      );
    }
    return (
      <div className={`stat-cell ${variant || ''}`}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">
          {primary}
          {deltaArrow && (
            <span className="arrow" style={{ color: deltaColor, fontSize: 16, marginLeft: 4 }}>
              {deltaArrow}
            </span>
          )}
        </div>
        {foot && <div className="stat-foot">{foot}</div>}
      </div>
    );
  };

  // ═══ EMPTY / WELCOME STATE ═══════════════════════════════════════
  if (!customer) {
    return (
      <div className="page-cockpit fade-in">
        <div className="welcome-hero">
          <div className="welcome-eyebrow stage-in">
            <span>CHURN SIMULATION</span>
            <span className="dim">/</span>
            <span>MODEL v2.4.1</span>
            <span className="dim">/</span>
            <span>{customersList.length} CUSTOMERS IN ROSTER</span>
          </div>
          <h1 className="welcome-title stage-in stage-d1">
            Pick a customer to simulate <span className="accent">churn trajectory</span> and intervention scenarios.
          </h1>
          <p className="welcome-sub stage-in stage-d2">
            The model streams a four-agent analysis: behavioral, revenue, customer success, and product research. Set a horizon, run a baseline, then explore what-ifs side by side.
          </p>

          <div className="welcome-picker-host stage-in stage-d3">
            <CustomerPicker
              value={null}
              onSelect={(id) => setSelectedId(id)}
              label="Search customers by name, ID, or segment…"
              pad={20}
            />
          </div>

          <div className="welcome-shortcuts stage-in stage-d4">
            <span><kbd>⌘</kbd><kbd>K</kbd> Switch customer from anywhere</span>
            <span><kbd>R</kbd> Run simulation</span>
            <span><kbd>Esc</kbd> Close overlay</span>
            <span style={{ marginLeft: 'auto', color: 'var(--t4)' }}>Start typing to search →</span>
          </div>
        </div>
      </div>
    );
  }

  // ═══ CUSTOMER-SELECTED ACTIVE STATE ════════════════════════════════
  const initials = monogram(customer.customer_id);
  const riskColor = customer.risk_level === 'High' ? 'var(--danger)' : customer.risk_level === 'Medium' ? 'var(--warn)' : 'var(--accent)';

  // Synthesise Narrative lines
  const narrativeLines = dispNarrative ? dispNarrative.split('\n\n').filter(Boolean) : [];

  return (
    <div className="page-cockpit fade-in" key={customer.customer_id}>

      {/* ── HERO BAND ────────────────────────────────────────────── */}
      <div className="hero-band stage-in">
        <div>
          {/* Eyebrow */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--t3)', marginBottom: 14
          }}>
            <span>RUN #{String(runIndex || 1).padStart(3, '0')}</span>
            <span style={{ color: 'var(--t4)' }}>/</span>
            <span>{new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
            <span style={{ color: 'var(--t4)' }}>/</span>
            <span>WHAT-IF SIMULATION</span>
            {isLoading && (
              <>
                <span style={{ color: 'var(--t4)' }}>/</span>
                <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="dot-pulse" />
                  {phase === 'running' ? 'STREAMING' : phase === 'chatting' ? 'SCENARIO' : 'ANSWERING'}
                </span>
              </>
            )}
          </div>
          {/* Big customer name */}
          <div style={{
            fontSize: 40, fontWeight: 500, letterSpacing: '-0.03em',
            lineHeight: 1.05, color: 'var(--t)',
            fontFamily: 'var(--app-font-display)'
          }}>
            {customer.customer_id}
          </div>
          {/* Meta row */}
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap',
            gap: 10, marginTop: 12, fontSize: 13,
            color: 'var(--t3)', fontFamily: 'var(--font-mono)'
          }}>
            <span style={{ color: 'var(--t2)' }}>{customer.customer_id}</span>
            <span style={{ color: 'var(--t4)' }}>·</span>
            <span style={{ color: 'var(--t2)' }}>{customer.plan_type}</span>
            <span style={{ color: 'var(--t4)' }}>·</span>
            <span>{customer.contract_type}</span>
            <span style={{ color: 'var(--t4)' }}>·</span>
            <span style={{ color: 'var(--t2)' }}>${(customer.segment_rfm_context?.total_revenue?.customer ?? 0).toLocaleString()}/mo</span>
            <span style={{ color: 'var(--t4)' }}>·</span>
            <span>{customer.segment_label}</span>
            <span style={{ color: 'var(--t4)' }}>·</span>
            <Badge label={`${customer.risk_level} Risk`} variant={customer.risk_level === 'Low' ? 'low' : customer.risk_level === 'High' ? 'high' : 'med'} />

            {compareCustomer ? (
              <span className="compare-pill" style={{ marginLeft: 4 }}>
                <span style={{ color: 'var(--t4)' }}>vs</span>
                <span style={{ color: 'var(--info)' }}>●</span>
                <span style={{ color: 'var(--t2)' }}>{compareCustomer.customer_id}</span>
                <button onClick={() => setCompareId(null)} title="Exit compare"><Icons.X /></button>
              </span>
            ) : (
              <button className="compare-add" onClick={() => setCmdkMode('compare')} style={{ marginLeft: 4 }}>
                <Icons.Plus /> Compare
              </button>
            )}
          </div>
        </div>
        <div className="hero-controls">
          <div className="controls-row">
            <button className="btn" onClick={() => setCmdkMode('switch')} title="Switch customer (⌘K)">
              <Icons.Users /> Switch customer
              <kbd className="kbd-hint ml-1">⌘K</kbd>
            </button>
            <button className="btn btn-primary" onClick={handleRunInitial} disabled={isLoading}>
              <Icons.Play /> {hasResults ? `Re-run · ${formatHorizon(horizonWeeks)}` : `Run simulation · ${formatHorizon(horizonWeeks)}`}
              <kbd className="kbd-hint ml-1.5" style={{ borderColor: 'rgba(0,0,0,0.2)' }}>R</kbd>
            </button>
          </div>
          {hasResults && (
            <span className="text-[11px] text-[var(--t3)] font-mono uppercase tracking-[0.1em]">
              <Icons.Check className="mr-1.5 text-[var(--accent)]" style={{ display: 'inline' }} />
              Run completed · {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
      </div>

      {/* ── STAT STRIP ───────────────────────────────────────────── */}
      <div className="stat-strip stage-in stage-d1">
        <StatCell
          variant="danger"
          label="Starting score"
          primary={customer.churn_score.toFixed(0)}
          secondary={compareCustomer?.churn_score.toFixed(0)}
          compareLabel={compareCustomer ? compareCustomer.customer_id.split(' ')[0] : null}
          foot="Latest prediction · current week"
        />
        <StatCell
          variant={hasResults ? (projEnd !== null && projEnd < baseEnd ? 'accent' : 'danger') : ''}
          label={projEnd !== null ? 'Projected with scenario' : 'Projected end-of-horizon'}
          primary={hasResults ? shownChurn.toFixed(0) : '—'}
          secondary={compareBaseEnd !== null ? compareBaseEnd.toFixed(0) : null}
          compareLabel={compareCustomer ? compareCustomer.customer_id.split(' ')[0] : null}
          foot={hasResults ? (projEnd !== null ? `Baseline end · ${baseEnd.toFixed(0)}` : `Week ${horizonWeeks}`) : 'Run a simulation'}
          delta={hasResults && !compareCustomer ? (shownChurn - customer.churn_score) : null}
        />
        <StatCell
          label="Delta"
          primary={hasResults ? `${churnDelta > 0 ? '+' : '−'}${Math.abs(churnDelta).toFixed(1)}pp` : '—'}
          secondary={compareBaseEnd !== null && compareCustomer ? `${compareBaseEnd - compareCustomer.churn_score > 0 ? '+' : '−'}${Math.abs(compareBaseEnd - compareCustomer.churn_score).toFixed(1)}pp` : null}
          compareLabel={compareCustomer ? compareCustomer.customer_id.split(' ')[0] : null}
          foot={projEnd !== null ? 'Intervention vs baseline' : 'Natural drift this horizon'}
        />
        <StatCell
          label="Revenue exposure"
          primary={hasResults ? formatCurrency(revAtRisk) : '—'}
          secondary={compareRevRisk !== null ? formatCurrency(compareRevRisk) : null}
          compareLabel={compareCustomer ? compareCustomer.customer_id.split(' ')[0] : null}
          foot={`12-month projection · ${formatCurrency(customer.segment_rfm_context?.total_revenue?.customer ?? 0)}/mo MRR`}
        />
      </div>

      {/* ── HORIZON STRIP ────────────────────────────────────────── */}
      <div className="horizon-strip stage-in stage-d2">
        <span className="horizon-label">Prediction horizon</span>
        <div className="horizon-pills">
          {HORIZON_PRESETS.map(h => (
            <button key={h.weeks}
              className={`horizon-pill ${horizonWeeks === h.weeks ? 'on' : ''}`}
              onClick={() => setHorizonWeeks(h.weeks)}
              disabled={isLoading}
            >
              {h.weeks === 4 ? '1MO' : h.weeks === 8 ? '2MO' : h.weeks === 12 ? '3MO' : h.weeks === 24 ? '6MO' : h.weeks === 52 ? '1YR' : `${h.weeks}W`}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-[var(--t3)]">
          Retention window {hasResults ? (dispSimData.retention_window_weeks > horizonWeeks ? `> ${horizonWeeks} weeks` : `${dispSimData.retention_window_weeks} weeks`) : '—'}
        </span>
      </div>

      {/* ── CHART + NARRATIVE SIDE PANEL ─────────────────────────── */}
      <div className="chart-row stage-in stage-d3">
        <div className="chart-hero">
          <div className="chart-hero-head">
            <div>
              <div className="chart-hero-title font-semibold text-xs text-[var(--t)]">Churn trajectory</div>
              <div className="chart-hero-sub font-mono text-[11px] text-[var(--t3)] mt-1 uppercase tracking-[0.08em]">
                {formatHorizon(horizonWeeks)} projection
                {projEnd !== null && <> · scenario overlay active</>}
                {compareCustomer && <> · comparing with {compareCustomer.customer_id}</>}
              </div>
            </div>
            <div className="flex gap-4 text-[11px] text-[var(--t3)] font-mono uppercase tracking-[0.1em] flex-wrap justify-end">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[var(--danger)]" /> {customer.customer_id.split(' ')[0]}
              </span>
              {compareCustomer && (
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-[var(--info)]" /> {compareCustomer.customer_id.split(' ')[0]}
                </span>
              )}
              {projEnd !== null && (
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5" style={{ backgroundImage: 'linear-gradient(to right, var(--accent) 60%, transparent 60%)', backgroundSize: '6px 2px' }} /> Scenario
                </span>
              )}
            </div>
          </div>

          {dispSimData ? (
            <SimulationChart
              simData={dispSimData}
              horizonWeeks={horizonWeeks}
              compareData={compareData}
            />
          ) : isLoading ? (
            <div className="chart-placeholder">
              <span className="dot-pulse" />
              <div className="font-mono text-[11px] uppercase tracking-[0.1em]">
                Building {formatHorizon(horizonWeeks)} trajectory…
              </div>
            </div>
          ) : (
            <div className="chart-placeholder text-center">
              <div className="mx-auto w-8 h-8 flex items-center justify-center text-[var(--t3)]">
                <Icons.Play />
              </div>
              <div className="text-[13px] text-[var(--t2)] font-semibold mt-2">Trajectory not yet projected</div>
              <div className="text-[12px] text-[var(--t3)] max-w-[360px] mx-auto mt-1 leading-relaxed">
                Press <kbd className="kbd-hint">R</kbd> or click <em className="text-[var(--t2)] not-italic font-semibold">Run simulation</em> to build a {formatHorizon(horizonWeeks)} projection for {customer.customer_id}.
              </div>
              <div className="chart-placeholder-axis mt-4" />
            </div>
          )}
        </div>

        {/* ── NARRATIVE SIDE PANEL ──────────────────────────────── */}
        <aside className="narrative-side">
          <div className="narrative-side-head">
            <Icons.Sparkle />
            <span>{scenarioRef.current ? 'Scenario analysis' : 'Synthesised narrative'}</span>
            <span className="ml-auto text-[var(--t4)] font-mono text-[10px]">
              {narrativeLines.length}/4 paragraphs
            </span>
          </div>

          {scenarioRef.current && narrativeLines.length > 0 && (
            <div className="narrative-side-quote">“{scenarioRef.current}”</div>
          )}

          {narrativeLines.length === 0 && !isLoading && (
            <div className="narrative-side-placeholder">
              <div className="narrative-side-placeholder-icon">
                <Icons.Sparkle />
              </div>
              <div className="text-[12px] text-[var(--t2)]">Awaiting run</div>
              <div className="text-[11px] text-[var(--t3)] leading-relaxed max-w-[240px]">
                The synthesised narrative from the four-agent debate will stream in here once you run the simulation.
              </div>
            </div>
          )}

          {narrativeLines.length === 0 && isLoading && (
            <div className="narrative-side-placeholder">
              <span className="dot-pulse" />
              <div className="text-[11px] font-mono uppercase tracking-[0.1em]">
                Drafting paragraph 1…
              </div>
            </div>
          )}

          {narrativeLines.map((line, i) => (
            <div key={i} className="narrative-para">{renderMd(line)}</div>
          ))}

          {isLoading && narrativeLines.length > 0 && narrativeLines.length < 4 && (
            <span className="inline-flex items-center gap-2 text-[var(--t3)] text-[11px] font-mono uppercase tracking-[0.08em]">
              <span className="dot-pulse" /> Drafting paragraph {narrativeLines.length + 1}…
            </span>
          )}

          {phase === 'done' && narrativeLines.length > 0 && (
            <div className="narrative-side-foot">
              <Icons.Check className="text-[var(--accent)]" />
              Four-agent consensus · model v2.4.1 · {Math.round(confidence * 100)}% conf
            </div>
          )}
        </aside>
      </div>

      {/* ── TRIPLE COLUMN ───────────────────────────────────────── */}
      {(hasResults || isLoading) && (
        <div className="triple stage-in stage-d5">

          {/* COL 1 — Drivers & Segments */}
          <div className="triple-col">
            <div>
              <div className="triple-h">
                <span className="triple-h-num">01</span>
                <span>Risk drivers</span>
              </div>
              {customer.shap_top5?.length ? (
                customer.shap_top5.slice(0, 4).map((f, i) => (
                  <FactorBar key={i} label={f.feature_label} importance={f.importance} direction={f.direction} />
                ))
              ) : (
                <p className="text-xs text-[var(--t3)]">No risk factors available</p>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--b)', paddingTop: 16 }}>
              <div className="triple-h">
                <span className="triple-h-num">02</span>
                <span>Segment migration</span>
                {compareCustomer && dispSimData?.segment_migration?.length ? (
                  <span className="ml-auto text-[var(--t4)] text-[9px] font-mono">A: {customer.customer_id.slice(0, 8)}</span>
                ) : null}
              </div>
              {dispSimData?.segment_migration?.length ? (
                dispSimData.segment_migration.map((s, i) => <SegBar key={i} item={s} />)
              ) : (
                <div className="text-xs text-[var(--t3)]">No segment migration data</div>
              )}
              {compareCustomer && compareData?.segment_migration?.length ? (
                <>
                  <div className="text-[10px] text-[var(--info)] font-mono uppercase tracking-[0.1em] mt-3 mb-2">
                    B · {compareCustomer.customer_id.slice(0, 12)}
                  </div>
                  {compareData.segment_migration.map((s, i) => <SegBar key={`c-${i}`} item={s} />)}
                </>
              ) : null}
            </div>
          </div>

          {/* COL 2 — Agent thread */}
          <div className="triple-col">
            <div className="triple-h">
              <span className="triple-h-num">03</span>
              <span>Agent thread</span>
              <span className="ml-auto text-[var(--t4)]">
                {dispAgents.filter(a => a.done).length}/{dispAgents.length || 4}
              </span>
            </div>
            <div className="agent-thread">
              {dispAgents.length === 0 ? (
                // Show thinking placeholders
                DEFAULT_AGENTS.map((a, i) => (
                  <div key={i} className="agent-msg">
                    <div className="agent-msg-mark" style={{ background: a.color, color: 'var(--inv)' }}>{a.short}</div>
                    <div>
                      <div className="agent-msg-meta">
                        <span className="agent-msg-name">{a.name}</span>
                        <span>·</span>
                        <span>queued</span>
                      </div>
                      <ul className="agent-msg-body">
                        <li className="text-[var(--t4)]">Awaiting model dispatch…</li>
                      </ul>
                    </div>
                  </div>
                ))
              ) : (
                dispAgents.map((a, i) => (
                  <div key={i} className="agent-msg">
                    <div className="agent-msg-mark" style={{ background: a.color, color: 'var(--inv)' }}>{a.short}</div>
                    <div>
                      <div className="agent-msg-meta">
                        <span className="agent-msg-name">{a.name}</span>
                        <span>·</span>
                        <span>{a.done ? 'analysis complete' : 'thinking…'}</span>
                        {a.done && <Icons.Check className="ml-auto" style={{ color: a.color }} />}
                      </div>
                      <div className="agent-msg-body">
                        {a.content ? renderMd(filterThinkTags(a.content)) : <span className="text-[var(--t4)]">Thinking…</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COL 3 — Playbook / Chat */}
          <div className="triple-col">
            <div className="triple-h">
              <span className="triple-h-num">04</span>
              <span>{thirdTab === 'playbook' ? 'Playbook' : 'Q&A thread'}</span>
              <div className="col-toggle">
                <button className={thirdTab === 'playbook' ? 'on' : ''} onClick={() => setThirdTab('playbook')}>Playbook</button>
                <button className={thirdTab === 'chat' ? 'on' : ''} onClick={() => setThirdTab('chat')}>
                  Chat{chatMsgs.length > 0 && ` (${chatMsgs.filter(m => m.role === 'user').length})`}
                </button>
              </div>
            </div>

            {thirdTab === 'playbook' && (
              <>
                {compareCustomer && (dispRecs.length > 0 || dispCompareRecs.length > 0) ? (
                  <div className="playbook">
                    <div className="playbook-compare-label">
                      <span className="who-tag a">A</span>
                      {customer.customer_id}
                    </div>
                    {(dispRecs.length ? dispRecs : DEFAULT_RECS).map((r, i) => (
                      <button key={`a-${i}`} className="playbook-item" disabled={isLoading} onClick={() => handleScenario(r)}>
                        <span className="playbook-num">{String(i + 1).padStart(2, '0')}</span>
                        <span className="playbook-text">{r || <span style={{ color: 'var(--t4)' }}>—</span>}</span>
                      </button>
                    ))}
                    <div className="playbook-compare-label" style={{ marginTop: 4 }}>
                      <span className="who-tag b">B</span>
                      {compareCustomer.customer_id}
                    </div>
                    {(dispCompareRecs.length ? dispCompareRecs : DEFAULT_RECS).map((r, i) => (
                      <button key={`b-${i}`} className="playbook-item" disabled={isLoading} onClick={() => handleScenario(r)}>
                        <span className="playbook-num" style={{ color: 'var(--info)' }}>{String(i + 1).padStart(2, '0')}</span>
                        <span className="playbook-text">{r || <span style={{ color: 'var(--t4)' }}>—</span>}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="playbook">
                    {(dispRecs.length ? dispRecs : DEFAULT_RECS).map((r, i) => (
                      <button key={i} className="playbook-item" disabled={isLoading} onClick={() => handleScenario(r)}>
                        <span className="playbook-num">{String(i + 1).padStart(2, '0')}</span>
                        <span className="playbook-text">{r || <span style={{ color: 'var(--t4)' }}>—</span>}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="scenario-v2">
                  <div className="triple-h" style={{ marginBottom: 0 }}>
                    <span>Try a custom scenario</span>
                    {compareCustomer && (
                      <span className="text-[var(--t4)] text-[10px] font-mono normal-case tracking-normal ml-auto">applies to both</span>
                    )}
                  </div>
                  <div className="scenario-input">
                    <Icons.Sparkle />
                    <input
                      value={scenInput}
                      onChange={e => setScenInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && scenInput.trim()) handleScenario(scenInput); }}
                      placeholder="e.g. Offer 3-month premium support trial…"
                      disabled={isLoading}
                    />
                    <button
                      className="btn btn-primary btn-sm h-[30px]"
                      onClick={() => handleScenario(scenInput)}
                      disabled={!scenInput.trim() || isLoading}
                    >
                      <Icons.Send /> Run
                    </button>
                  </div>
                </div>
              </>
            )}

            {thirdTab === 'chat' && (
              <>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 320 }}>
                  {chatMsgs.length === 0 && (
                    <div className="text-[12px] text-[var(--t3)] leading-relaxed py-5">
                      Ask anything about this customer or their projection. Q&amp;A is grounded in the latest run and won't alter the chart.
                    </div>
                  )}
                  {chatMsgs.map(m => (
                    <div key={m.id} className={m.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}>
                      {m.content || <span className="dot-pulse" />}
                      {m.streaming && m.content && <span className="caret-blink" />}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="scenario-input mt-auto">
                  <Icons.Chat />
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                    placeholder={hasResults ? 'Ask a question…' : 'Run a simulation first'}
                    disabled={!hasResults || phase === 'asking'}
                  />
                  <button
                    className="btn btn-primary btn-sm h-[30px]"
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || !hasResults || phase === 'asking'}
                  >
                    <Icons.Send /> Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Switcher & Compare overlays ────────────────────────── */}
      {cmdkMode && (
        <div className="cmdk-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCmdkMode(null); }}>
          <div className="cmdk-panel">
            <div style={{ padding: '12px 18px 0' }} className="flex items-center gap-2.5 border-b border-[var(--b)] pb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]">
                {cmdkMode === 'switch' ? '⌘K · Switch customer' : '+ Compare with…'}
              </span>
              <span className="flex-1" />
              <button onClick={() => setCmdkMode(null)} className="text-[var(--t3)] text-[10px] font-mono">
                <Icons.X />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <CustomerPicker
                value={cmdkMode === 'switch' ? selectedId : compareId}
                exclude={cmdkMode === 'compare' ? [selectedId] : []}
                onSelect={(id) => {
                  if (cmdkMode === 'switch') setSelectedId(id);
                  else setCompareId(id);
                  setCmdkMode(null);
                }}
                label={cmdkMode === 'switch' ? 'Switch customer…' : 'Pick a customer to compare with…'}
                hint={cmdkMode === 'compare' ? 'will overlay their baseline on the chart' : ''}
              />
            </div>
            <div className="cmdk-foot">
              <span><kbd>↵</kbd> Select · <kbd>Esc</kbd> Close</span>
              <span className="text-[var(--t4)]">{customersList.length} customers · model v2.4.1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-[var(--t3)] text-sm">Loading…</div>}>
      <SimulationPageInner />
    </Suspense>
  );
}