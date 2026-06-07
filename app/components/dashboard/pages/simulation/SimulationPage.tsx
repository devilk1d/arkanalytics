'use client';

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useDashboardContext } from '../../context/DashboardContext';
import {
  type PredictionRow,
  type SimData,
  type AgentMessage,
  type Phase,
  type HistoryEntry,
  type RunSnapshot,
  type ScenarioTurn,
  type AskTurn,
} from './types';
import { uid } from './simulationShared';
import { CustomerPickerView } from './CustomerPickerView';
import { SimulationCockpit, type ChatMsg } from './SimulationCockpit';
import {
  createSimulation, appendScenarioTurn, appendChatMessages,
  loadWorkspaceSimulations, loadCustomerSimulations,
  formatSimLabel, relativeTime,
  type SimulationRecord,
} from '@/lib/simulation-db';

function SimulationPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
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

  // ── Client-side Customer List ──────────────────────────────────────────────
  const [customersList, setCustomersList] = useState<PredictionRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  // Tracks whether the customer list fetch has completed at least once for the current datasetId.
  // Without this, the first render (listLoading=false, list=[]) incorrectly shows CustomerPickerView
  // instead of the loading screen when a customer_id is already set in the URL.
  const customersFetched = useRef(false);
  useEffect(() => {
    if (!datasetId) return;
    setListLoading(true);
    customersFetched.current = false;
    async function fetchAllPredictions() {
      let allData: PredictionRow[] = [];
      let pageIndex = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const from = pageIndex * batchSize;
        const to = from + batchSize - 1;
        const { data, error } = await supabase
          .from('predictions').select('*').eq('dataset_id', datasetId).range(from, to);
        if (error) { console.error('Error fetching predictions batch:', error); break; }
        if (data && data.length > 0) {
          allData = [...allData, ...(data as PredictionRow[])];
          if (data.length < batchSize) { hasMore = false; } else { pageIndex++; }
        } else { hasMore = false; }
      }
      setCustomersList(allData);
      customersFetched.current = true;
      setListLoading(false);
    }
    fetchAllPredictions();
  }, [datasetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Customer selection ─────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(() => searchParams.get('customer_id') || '');
  const urlCustomerId = searchParams.get('customer_id') || '';
  useEffect(() => { setSelectedId(urlCustomerId); }, [urlCustomerId]);

  const handleSelectCustomer = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) { params.set('customer_id', id); } else { params.delete('customer_id'); }
    router.push(`${pathname}?${params.toString()}`);
    setSelectedId(id);
  }, [searchParams, router, pathname]);

  const customer = useMemo(() => customersList.find(c => c.customer_id === selectedId) || null, [selectedId, customersList]);

  const [segLabels, setSegLabels] = useState<string[]>([]);
  useEffect(() => {
    if (customersList.length) {
      setSegLabels([...new Set(customersList.map(r => r.segment_label).filter(Boolean))]);
    }
  }, [customersList]);

  // ── Simulation state ───────────────────────────────────────────────────────
  const [phase,        setPhase]        = useState<Phase>('idle');
  const [horizonWeeks, setHorizonWeeks] = useState(12);
  const [simData,      setSimData]      = useState<SimData | null>(null);
  const [narrative,    setNarrative]    = useState('');
  const [agents,       setAgents]       = useState<AgentMessage[]>([]);
  const [agentRecs,    setAgentRecs]    = useState<string[]>([]);
  const [isSynth,      setIsSynth]      = useState(false);
  const [error,        setError]        = useState('');
  const [runIndex,     setRunIndex]     = useState(0);

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatMsgs,  setChatMsgs]  = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Scenario / playbook state ──────────────────────────────────────────────
  const [scenInput,      setScenInput]      = useState('');
  const [thirdTab,       setThirdTab]       = useState<'playbook' | 'chat'>('playbook');
  const [collapsedAgents, setCollapsedAgents] = useState<Set<number>>(new Set());
  const [usedRecs,       setUsedRecs]       = useState<Set<string>>(new Set());
  const toggleAgent = (i: number) =>
    setCollapsedAgents(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });

  // ── CMDK overlay ───────────────────────────────────────────────────────────
  const [cmdkMode, setCmdkMode] = useState<'switch' | null>(null);

  // ── In-memory session history ──────────────────────────────────────────────
  const [history,     setHistory]     = useState<HistoryEntry[]>([]);
  const [viewingSnap, setViewingSnap] = useState<RunSnapshot | ScenarioTurn | null>(null);
  const [chatCtx,     setChatCtx]     = useState<{ question: string; narrative: string }[]>([]);

  // ── DB simulation history ──────────────────────────────────────────────────
  const [simId,           setSimId]           = useState<string | null>(null);
  const [dbHistory,       setDbHistory]       = useState<SimulationRecord[]>([]);
  const [dbHistoryLoading, setDbHistoryLoading] = useState(false);
  const [showHistory,     setShowHistory]     = useState(false);
  const [wsHistory,       setWsHistory]       = useState<SimulationRecord[]>([]);

  // Load workspace-wide history for the picker
  useEffect(() => {
    if (!workspace?.id) return;
    loadWorkspaceSimulations(workspace.id, 30).then(setWsHistory);
  }, [workspace?.id]);

  // Load customer-specific history when customer changes
  useEffect(() => {
    if (!workspace?.id || !selectedId) { setDbHistory([]); return; }
    setDbHistoryLoading(true);
    loadCustomerSimulations(workspace.id, selectedId, 10)
      .then(data => { setDbHistory(data); setDbHistoryLoading(false); });
  }, [workspace?.id, selectedId]);

  const abortRef         = useRef<AbortController | null>(null);
  const scenarioRef      = useRef('');
  // When navigating to a customer via history, store the record to restore
  const pendingHistoryRef = useRef<SimulationRecord | null>(null);

  // ── Shared restore-from-record logic ──────────────────────────────────────
  const restoreFromRecord = useCallback((rec: SimulationRecord) => {
    const sd = rec.sim_data as SimData | null | undefined;
    if (!sd || !Array.isArray((sd as SimData).baseline) || (sd as SimData).baseline.length === 0) {
      console.warn('[sim-load] no usable sim_data in record', rec.id);
      return false;
    }
    setSimData(sd as SimData);
    setNarrative(rec.narrative ?? '');
    setAgents((rec.agents ?? []) as AgentMessage[]);
    setAgentRecs(rec.recommendations ?? []);
    setSimId(rec.id);
    const chatMapped = (rec.chat_messages ?? []).map(m => ({
      id: uid(), role: m.role as 'user' | 'ai', content: m.content, streaming: false,
    }));
    setChatMsgs(chatMapped);
    // Restore scenario context
    const lastScenario = (rec.scenario_turns ?? []).at(-1)?.scenario ?? rec.scenario ?? '';
    scenarioRef.current = lastScenario;
    // Mark previously-run scenarios as used
    const usedSet = new Set<string>(
      (rec.scenario_turns ?? []).map((t: { scenario: string }) => t.scenario).filter(Boolean)
    );
    setUsedRecs(usedSet);
    setPhase('done');
    setViewingSnap(null);
    setScenInput('');
    setShowHistory(false);
    setCollapsedAgents(new Set());
    setRunIndex(i => i + 1);
    if (chatMapped.length > 0) setThirdTab('chat');
    else setThirdTab('playbook');
    return true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when selected customer changes — then check for pending history restore
  useEffect(() => {
    setSimData(null); setNarrative(''); setAgents([]); setAgentRecs([]);
    setPhase('idle'); setError(''); setChatMsgs([]); setChatInput(''); setScenInput('');
    setHistory([]); setViewingSnap(null); setChatCtx([]);
    scenarioRef.current = '';
    setUsedRecs(new Set());
    setSimId(null);
    setShowHistory(false);

    // If the user navigated here from the history tab, auto-restore that record
    const pending = pendingHistoryRef.current;
    if (pending && pending.customer_id === selectedId) {
      pendingHistoryRef.current = null;
      const sd = pending.sim_data as SimData | null | undefined;
      if (sd && Array.isArray((sd as SimData).baseline) && (sd as SimData).baseline.length > 0) {
        // These setState calls are batched with the resets above — final render uses these values
        setSimData(sd as SimData);
        setNarrative(pending.narrative ?? '');
        setAgents((pending.agents ?? []) as AgentMessage[]);
        setAgentRecs(pending.recommendations ?? []);
        setSimId(pending.id);
        const chatMapped = (pending.chat_messages ?? []).map(m => ({
          id: uid(), role: m.role as 'user' | 'ai', content: m.content, streaming: false,
        }));
        setChatMsgs(chatMapped);
        scenarioRef.current = (pending.scenario_turns ?? []).at(-1)?.scenario ?? pending.scenario ?? '';
        setUsedRecs(new Set((pending.scenario_turns ?? []).map((t: { scenario: string }) => t.scenario).filter(Boolean)));
        setPhase('done');
        if (chatMapped.length > 0) setThirdTab('chat');
      }
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cmdkMode) { setCmdkMode(null); return; }
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setCmdkMode('switch'); return;
      }
      if (!isInput && e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && customer && phase !== 'running' && phase !== 'chatting') {
        e.preventDefault(); handleRunInitial();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [customer, phase, cmdkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core SSE runner ────────────────────────────────────────────────────────
  const runSSE = useCallback(async (text: string, mode: 'initial' | 'scenario' | 'ask') => {
    if (!customer) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError('');

    const filterThinkTags = (str: string): string => {
      if (!str) return '';
      const out = str.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      return out || str.replace(/<\/?think>/gi, '').trim();
    };

    if (mode === 'initial') {
      setPhase('running'); setSimData(null); setNarrative('');
      setAgents([]); setAgentRecs([]); setIsSynth(false); setViewingSnap(null);
      scenarioRef.current = '';
      setRunIndex(i => i + 1);
    } else if (mode === 'scenario') {
      setPhase('chatting'); setNarrative('');
      setAgents([]); setAgentRecs([]); setIsSynth(false); setViewingSnap(null);
      scenarioRef.current = text;
      setRunIndex(i => i + 1);
    } else {
      setPhase('asking');
    }

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
      current_segment_migration: mode === 'scenario' ? (simData?.segment_migration ?? null) : null,
    };

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
              // Persist chat to DB if we have an active simulation
              if (simId) {
                appendChatMessages(simId, [
                  { role: 'user', content: text,  ts: new Date().toISOString() },
                  { role: 'ai',   content: final, ts: new Date().toISOString() },
                ]).catch(console.error);
              }
            } else {
              setNarrative(final); setIsSynth(false);
              if (mode === 'scenario' && text.trim()) setChatCtx(prev => [...prev, { question: text, narrative: final }]);
              if (latestSim) {
                const entry = mode === 'initial'
                  ? { type: 'run', id: uid(), label: 'Initial Simulation', timestamp: new Date(), horizonWeeks, simData: latestSim, narrative: final, agents: latestAgents, recommendations: latestRecs } as RunSnapshot
                  : { type: 'scenario', id: uid(), label: text.trim() || 'Scenario', timestamp: new Date(), scenario: text, narrative: final, simData: latestSim, agents: latestAgents, recommendations: latestRecs } as ScenarioTurn;
                setHistory(prev => [entry, ...prev]);

                // ── Auto-save to Supabase ──────────────────────────────
                if (mode === 'initial' && workspace?.id && customer) {
                  createSimulation({
                    workspace_id:    workspace.id,
                    dataset_id:      datasetId,
                    customer_id:     customer.customer_id,
                    label:           formatSimLabel(customer.customer_id, '', horizonWeeks),
                    horizon_weeks:   horizonWeeks,
                    churn_score:     customer.churn_score,
                    risk_level:      customer.risk_level,
                    segment_label:   customer.segment_label,
                    sim_data:        latestSim,
                    narrative:       final,
                    agents:          latestAgents,
                    recommendations: latestRecs,
                  }).then(id => {
                    if (id) {
                      setSimId(id);
                      // Refresh customer DB history
                      if (workspace?.id) loadCustomerSimulations(workspace.id, customer.customer_id, 10).then(setDbHistory);
                      if (workspace?.id) loadWorkspaceSimulations(workspace.id, 30).then(setWsHistory);
                    }
                  }).catch(console.error);
                } else if (mode === 'scenario' && simId && latestSim) {
                  appendScenarioTurn(simId, {
                    scenario:        text,
                    sim_data:        latestSim,
                    narrative:       final,
                    agents:          latestAgents,
                    recommendations: latestRecs,
                    created_at:      new Date().toISOString(),
                  }, latestSim).catch(console.error);
                }
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
  }, [customer, chatCtx, simData, horizonWeeks, segLabels, simId, datasetId, workspace]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived display values ─────────────────────────────────────────────────
  const isLoading     = phase === 'running' || phase === 'chatting' || phase === 'asking';
  const dispSimData   = viewingSnap?.simData   ?? simData;
  const dispNarrative = viewingSnap ? ('narrative' in viewingSnap ? viewingSnap.narrative : '') : narrative;
  const dispAgents    = viewingSnap?.agents    ?? agents;
  const dispRecs      = viewingSnap?.recommendations ?? agentRecs;
  const dispHorizon   = viewingSnap && 'horizonWeeks' in viewingSnap ? viewingSnap.horizonWeeks : horizonWeeks;
  const hasResults    = dispSimData !== null;

  const baseEnd      = dispSimData?.baseline?.at(-1)?.prob ?? customer?.churn_score ?? 0;
  const projEnd      = dispSimData?.projection?.at(-1)?.prob ?? null;
  const initialScore = customer?.churn_score ?? 0;
  const shownChurn   = projEnd ?? baseEnd;
  const churnDelta   = projEnd !== null ? (projEnd - baseEnd) : (baseEnd - initialScore);
  const revAtRisk    = customer ? (customer.segment_rfm_context?.total_revenue?.customer ?? 0) * (baseEnd / 100) * 12 : 0;
  const confidence   = dispSimData?.confidence ?? 0.86;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRunInitial = () => { if (!customer || isLoading) return; setUsedRecs(new Set()); setSimId(null); runSSE('', 'initial'); };

  // Load from cockpit history overlay (same customer, no navigation)
  const handleLoadFromDb = useCallback((rec: SimulationRecord) => {
    restoreFromRecord(rec);
  }, [restoreFromRecord]);

  // Load from CustomerPickerView history (different customer — store pending, then navigate)
  const handleSelectHistory = useCallback((rec: SimulationRecord) => {
    pendingHistoryRef.current = rec;
    handleSelectCustomer(rec.customer_id);
  }, [handleSelectCustomer]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleScenario   = (scenText: string) => {
    const t = scenText.trim();
    if (!t || isLoading) return;
    setScenInput('');
    setUsedRecs(prev => new Set([...prev, t]));
    runSSE(t, 'scenario');
  };
  const handleSendChat = () => {
    const t = chatInput.trim();
    if (!t || phase === 'asking') return;
    setChatInput('');
    setThirdTab('chat');
    runSSE(t, 'ask');
  };

  // ═══ EMPTY / WELCOME STATE ════════════════════════════════════════════════
  if (selectedId && (listLoading || !customersFetched.current)) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-[var(--t3)] font-mono text-xs uppercase tracking-[0.15em] gap-3">
        <span className="dot-pulse" />
        Loading simulation workspace for {selectedId}…
      </div>
    );
  }

  if (!customer) {
    return (
      <CustomerPickerView
        customersList={customersList}
        listLoading={listLoading}
        onSelect={handleSelectCustomer}
        onSelectHistory={handleSelectHistory}
        wsHistory={wsHistory}
      />
    );
  }

  // ═══ CUSTOMER-SELECTED ACTIVE STATE ══════════════════════════════════════
  return (
    <SimulationCockpit
      customer={customer}
      customersList={customersList}
      listLoading={listLoading}
      selectedId={selectedId}
      phase={phase}
      horizonWeeks={horizonWeeks}
      simData={simData}
      narrative={narrative}
      agents={agents}
      agentRecs={agentRecs}
      isSynth={isSynth}
      error={error}
      runIndex={runIndex}
      chatMsgs={chatMsgs}
      chatInput={chatInput}
      scenInput={scenInput}
      thirdTab={thirdTab}
      collapsedAgents={collapsedAgents}
      cmdkMode={cmdkMode}
      viewingSnap={viewingSnap}
      scenarioText={viewingSnap && 'scenario' in viewingSnap ? viewingSnap.scenario : scenarioRef.current}
      dispSimData={dispSimData}
      dispNarrative={dispNarrative}
      dispAgents={dispAgents}
      dispRecs={dispRecs}
      dispHorizon={dispHorizon}
      hasResults={hasResults}
      isLoading={isLoading}
      baseEnd={baseEnd}
      projEnd={projEnd}
      shownChurn={shownChurn}
      churnDelta={churnDelta}
      revAtRisk={revAtRisk}
      confidence={confidence}
      onRunInitial={handleRunInitial}
      onScenario={handleScenario}
      onSendChat={handleSendChat}
      onSwitchCustomer={handleSelectCustomer}
      onSetCmdkMode={setCmdkMode}
      onSetHorizonWeeks={setHorizonWeeks}
      onSetThirdTab={setThirdTab}
      onSetChatInput={setChatInput}
      onSetScenInput={setScenInput}
      onToggleAgent={toggleAgent}
      chatEndRef={chatEndRef}
      usedRecs={usedRecs}
      showHistory={showHistory}
      onSetShowHistory={setShowHistory}
      dbHistory={dbHistory}
      dbHistoryLoading={dbHistoryLoading}
      onLoadFromDb={handleLoadFromDb}
      onSelectHistory={handleSelectHistory}
      wsHistory={wsHistory}
      simId={simId}
    />
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-[var(--t3)] text-sm">Loading…</div>}>
      <SimulationPageInner />
    </Suspense>
  );
}
