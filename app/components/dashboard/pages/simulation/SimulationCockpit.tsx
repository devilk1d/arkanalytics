'use client';

import { useRef, useState } from 'react';
import SimulationChart from './SimulationChart';
import Badge from '../../ui/Badge';
import { CustomerPicker } from './CustomerPickerView';
import {
  Icons, renderMd, filterThinkTags, formatHorizon, formatCurrency,
  FactorBar, SegBar,
  monogram,
} from './simulationShared';
import {
  type PredictionRow, type SimData, type AgentMessage,
  type Phase, type RunSnapshot, type ScenarioTurn,
  HORIZON_PRESETS,
} from './types';
import { relativeTime, type SimulationRecord } from '@/lib/simulation-db';

export interface ChatMsg {
  id: string;
  role: 'user' | 'ai';
  content: string;
  streaming?: boolean;
}

// ── HistoryRow ─────────────────────────────────────────────────────────────────
function HistoryRow({
  rec, simId, isSame, onLoad, onNavigate,
}: {
  rec: SimulationRecord;
  simId: string | null;
  isSame: boolean;       // true = same customer, false = different customer
  onLoad: (r: SimulationRecord) => void;
  onNavigate: (r: SimulationRecord) => void;
}) {
  const isActive = rec.id === simId;
  const rc = rec.risk_level === 'High' ? 'var(--danger)' : rec.risk_level === 'Medium' ? 'var(--warn)' : 'var(--accent)';
  const scenCount = rec.scenario_turns?.length ?? 0;
  const chatCount = Math.floor((rec.chat_messages?.length ?? 0) / 2);

  return (
    <button
      onClick={() => isSame ? onLoad(rec) : onNavigate(rec)}
      style={{
        display: 'grid', gridTemplateColumns: '44px 1fr auto',
        gap: 12, padding: '13px 18px', width: '100%', textAlign: 'left',
        borderBottom: '1px solid var(--b)',
        background: isActive ? 'var(--bg1)' : 'transparent',
        transition: 'background .12s',
      }}
      className="hover:bg-[var(--bg1)]"
    >
      {/* Score chip */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, border: `2px solid ${rc}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: rc, lineHeight: 1 }}>
          {rec.churn_score != null ? Math.round(Number(rec.churn_score)) : '—'}
        </span>
        <span style={{ fontSize: 8, color: 'var(--t3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>SCORE</span>
      </div>
      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t)', marginBottom: 3 }} className="truncate">
          {rec.customer_id}{!isSame && <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 400, marginLeft: 6 }}>{rec.segment_label}</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {isSame && <span>{rec.segment_label ?? '—'}</span>}
          {isSame && <span>·</span>}
          <span>{rec.horizon_weeks}w forecast</span>
          {scenCount > 0 && <><span>·</span><span style={{ color: 'var(--accent)' }}>{scenCount} scenario{scenCount > 1 ? 's' : ''}</span></>}
          {chatCount > 0 && <><span>·</span><span style={{ color: 'var(--info)' }}>{chatCount} Q&amp;A</span></>}
          {!isSame && (
            <><span>·</span><span style={{ color: rc, fontWeight: 700 }}>{rec.risk_level}</span></>
          )}
        </div>
        {rec.scenario && (
          <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 4 }} className="truncate">
            Last: &ldquo;{rec.scenario.slice(0, 52)}{rec.scenario.length > 52 ? '…' : ''}&rdquo;
          </div>
        )}
      </div>
      {/* Time + status */}
      <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
          {relativeTime(rec.created_at)}
        </span>
        {isActive ? (
          <span style={{ fontSize: 8, color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', border: '1px solid var(--accent)', borderRadius: 4, padding: '1px 5px' }}>
            ACTIVE
          </span>
        ) : !isSame ? (
          <span style={{ fontSize: 8, color: 'var(--t3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', border: '1px solid var(--b)', borderRadius: 4, padding: '1px 5px' }}>
            OPEN →
          </span>
        ) : null}
      </div>
    </button>
  );
}

// ── HistoryOverlay ─────────────────────────────────────────────────────────────
function HistoryOverlay({
  customer, simId, dbHistory, wsHistory, dbHistoryLoading,
  onClose, onLoadFromDb, onSelectHistory,
}: {
  customer: import('./types').PredictionRow;
  simId: string | null;
  dbHistory: SimulationRecord[];
  wsHistory: SimulationRecord[];
  dbHistoryLoading: boolean;
  onClose: () => void;
  onLoadFromDb: (rec: SimulationRecord) => void;
  onSelectHistory: (rec: SimulationRecord) => void;
}) {
  const [tab, setTab] = useState<'customer' | 'all'>('customer');
  const otherHistory = wsHistory.filter(r => r.customer_id !== customer.customer_id);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: active ? 'var(--t)' : 'var(--t3)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: -1, transition: 'color .12s',
    display: 'flex', alignItems: 'center', gap: 6,
  });

  const activeList = tab === 'customer' ? dbHistory : otherHistory;
  const isLoading  = tab === 'customer' && dbHistoryLoading;

  return (
    <div className="cmdk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmdk-panel" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div style={{ padding: '12px 18px 0' }} className="flex items-center gap-2.5 border-b border-[var(--b)] pb-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]">
            Simulation History
          </span>
          <span className="flex-1" />
          <button onClick={onClose} className="text-[var(--t3)] hover:text-[var(--t)] transition-colors">
            <Icons.X />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--b)', padding: '0 18px' }}>
          <button style={tabStyle(tab === 'customer')} onClick={() => setTab('customer')}>
            This customer
            {dbHistory.length > 0 && (
              <span style={{ fontSize: 9, background: tab === 'customer' ? 'var(--accent)' : 'var(--bg3)', color: tab === 'customer' ? 'var(--inv)' : 'var(--t3)', borderRadius: 9, padding: '1px 5px' }}>
                {dbHistory.length}
              </span>
            )}
          </button>
          <button style={tabStyle(tab === 'all')} onClick={() => setTab('all')}>
            All customers
            {otherHistory.length > 0 && (
              <span style={{ fontSize: 9, background: tab === 'all' ? 'var(--accent)' : 'var(--bg3)', color: tab === 'all' ? 'var(--inv)' : 'var(--t3)', borderRadius: 9, padding: '1px 5px' }}>
                {otherHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1" style={{ maxHeight: 440 }}>
          {isLoading ? (
            /* Skeleton rows */
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, padding: '13px 18px', borderBottom: '1px solid var(--b)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg2)', animation: `pulse 1.4s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                  <div style={{ height: 11, width: `${60 + i * 10}%`, borderRadius: 4, background: 'var(--bg2)', animation: `pulse 1.4s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
                  <div style={{ height: 9, width: `${40 + i * 8}%`, borderRadius: 4, background: 'var(--bg2)', animation: `pulse 1.4s ease-in-out infinite`, animationDelay: `${i * 0.1 + 0.05}s` }} />
                </div>
                <div style={{ width: 40, height: 11, borderRadius: 4, background: 'var(--bg2)', alignSelf: 'center', animation: `pulse 1.4s ease-in-out infinite` }} />
              </div>
            ))
          ) : activeList.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
                {tab === 'customer' ? 'No runs saved for this customer' : 'No other customers simulated yet'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                {tab === 'customer' ? 'Run a simulation — it saves automatically.' : 'Run simulations for other customers to see them here.'}
              </div>
            </div>
          ) : (
            activeList.map(rec => (
              <HistoryRow
                key={rec.id}
                rec={rec}
                simId={simId}
                isSame={tab === 'customer'}
                onLoad={onLoadFromDb}
                onNavigate={onSelectHistory}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cmdk-foot">
          <span><kbd>↵</kbd> {tab === 'customer' ? 'Load' : 'Open'} · <kbd>Esc</kbd> Close</span>
          <span className="text-[var(--t4)]">
            {tab === 'customer'
              ? `${dbHistory.length} saved run${dbHistory.length !== 1 ? 's' : ''} for ${customer.customer_id}`
              : `${otherHistory.length} run${otherHistory.length !== 1 ? 's' : ''} across other customers`
            }
          </span>
        </div>
      </div>
    </div>
  );
}

// ── StatCell ───────────────────────────────────────────────────────────────────
function StatCell({ label, primary, foot, variant, delta }: {
  label: string; primary: string | number;
  foot?: string; variant?: string; delta?: number | null;
}) {
  const deltaColor = delta != null ? (delta > 0 ? 'var(--danger)' : 'var(--accent)') : undefined;
  const deltaArrow = delta != null ? (delta > 0 ? '↑' : '↓') : null;
  return (
    <div className={`stat-cell ${variant || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {primary}
        {deltaArrow && (
          <span className="arrow" style={{ color: deltaColor, fontSize: 16, marginLeft: 4 }}>{deltaArrow}</span>
        )}
      </div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
export interface SimulationCockpitProps {
  customer: PredictionRow;
  customersList: PredictionRow[];
  listLoading: boolean;
  selectedId: string;
  phase: Phase;
  horizonWeeks: number;
  simData: SimData | null;
  narrative: string;
  agents: AgentMessage[];
  agentRecs: string[];
  isSynth: boolean;
  error: string;
  runIndex: number;
  chatMsgs: ChatMsg[];
  chatInput: string;
  scenInput: string;
  thirdTab: 'playbook' | 'chat';
  collapsedAgents: Set<number>;
  cmdkMode: 'switch' | null;
  viewingSnap: RunSnapshot | ScenarioTurn | null;
  scenarioText: string;
  // Derived
  dispSimData: SimData | null;
  dispNarrative: string;
  dispAgents: AgentMessage[];
  dispRecs: string[];
  dispHorizon: number;
  hasResults: boolean;
  isLoading: boolean;
  baseEnd: number;
  projEnd: number | null;
  shownChurn: number;
  churnDelta: number;
  revAtRisk: number;
  confidence: number;
  // Handlers
  onRunInitial: () => void;
  onScenario: (text: string) => void;
  onSendChat: () => void;
  onSwitchCustomer: (id: string) => void;
  onSetCmdkMode: (mode: 'switch' | null) => void;
  onSetHorizonWeeks: (w: number) => void;
  onSetThirdTab: (tab: 'playbook' | 'chat') => void;
  onSetChatInput: (v: string) => void;
  onSetScenInput: (v: string) => void;
  onToggleAgent: (i: number) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  usedRecs: Set<string>;
  // History
  showHistory: boolean;
  onSetShowHistory: (v: boolean) => void;
  dbHistory: SimulationRecord[];          // this customer
  wsHistory: SimulationRecord[];          // all customers
  dbHistoryLoading: boolean;
  onLoadFromDb: (rec: SimulationRecord) => void;         // same customer — no navigation
  onSelectHistory: (rec: SimulationRecord) => void;      // different customer — navigate + restore
  simId: string | null;
}

// ── Cockpit ────────────────────────────────────────────────────────────────────
export function SimulationCockpit(props: SimulationCockpitProps) {
  const {
    customer, customersList, listLoading, selectedId,
    phase, horizonWeeks, simData, narrative,
    agents, agentRecs,
    isSynth, error, runIndex,
    chatMsgs, chatInput, scenInput,
    thirdTab, collapsedAgents, cmdkMode, viewingSnap, scenarioText,
    dispSimData, dispNarrative, dispAgents, dispRecs,
    dispHorizon, hasResults, isLoading,
    baseEnd, projEnd, shownChurn, churnDelta, revAtRisk, confidence,
    onRunInitial, onScenario, onSendChat,
    onSwitchCustomer, onSetCmdkMode, onSetHorizonWeeks,
    onSetThirdTab, onSetChatInput, onSetScenInput, onToggleAgent,
    chatEndRef, usedRecs,
    showHistory, onSetShowHistory, dbHistory, wsHistory, dbHistoryLoading,
    onLoadFromDb, onSelectHistory, simId,
  } = props;

  // Scale "increases_churn" factor bars when a scenario has reduced churn
  const scenarioImpactRatio = projEnd !== null && projEnd < baseEnd && baseEnd > 0
    ? Math.min(0.8, (baseEnd - projEnd) / baseEnd)
    : 0;

  const narrativeLines = dispNarrative ? dispNarrative.split('\n\n').filter(Boolean) : [];

  return (
    <div className="page-cockpit fade-in" key={customer.customer_id}>

      {/* ── HERO BAND ─────────────────────────────────────────────────── */}
      <div className="hero-band stage-in">
        <div>
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
          <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--t)', fontFamily: 'var(--app-font-display)' }}>
            {customer.customer_id}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12, fontSize: 13, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
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
          </div>
        </div>
        <div className="hero-controls">
          <div className="controls-row">
            <button className="btn" onClick={() => onSetCmdkMode('switch')} title="Switch customer (⌘K)">
              <Icons.Users /> Switch customer
              <kbd className="kbd-hint ml-1">⌘K</kbd>
            </button>
            <button className="btn" onClick={() => onSetShowHistory(true)} title="View past simulation runs">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              History
              {dbHistory.length > 0 && (
                <span style={{ marginLeft: 4, fontSize: 9, background: 'var(--accent)', color: 'var(--inv)', borderRadius: 9, padding: '1px 5px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {dbHistory.length}
                </span>
              )}
            </button>
            <button className="btn btn-primary" onClick={onRunInitial} disabled={isLoading}>
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

      {/* ── STAT STRIP ────────────────────────────────────────────────── */}
      <div className="stat-strip stage-in stage-d1">
        <StatCell
          variant="danger"
          label="Churn Risk Score"
          primary={customer.churn_score.toFixed(0)}
          foot="Current score out of 100 · higher means higher churn risk"
        />
        <StatCell
          variant={hasResults ? (projEnd !== null && projEnd < baseEnd ? 'accent' : 'danger') : ''}
          label={projEnd !== null ? 'Score After Scenario' : 'Forecast End Score'}
          primary={hasResults ? shownChurn.toFixed(0) : '—'}
          foot={hasResults ? (projEnd !== null ? `Without scenario: ${baseEnd.toFixed(0)}` : `At week ${horizonWeeks}`) : 'Run the simulation first'}
          delta={hasResults ? (shownChurn - customer.churn_score) : null}
        />
        <StatCell
          label="Score Change"
          primary={hasResults ? `${churnDelta > 0 ? '+' : '−'}${Math.abs(churnDelta).toFixed(1)}pp` : '—'}
          foot={projEnd !== null ? 'Scenario vs no action' : 'Natural drift over forecast period'}
        />
        <StatCell
          label="Revenue at Risk"
          primary={hasResults ? formatCurrency(revAtRisk) : '—'}
          foot={`12-month estimate · MRR ${formatCurrency(customer.segment_rfm_context?.total_revenue?.customer ?? 0)}/mo`}
        />
      </div>

      {/* ── HORIZON STRIP ─────────────────────────────────────────────── */}
      <div className="horizon-strip stage-in stage-d2">
        <span className="horizon-label">Forecast horizon</span>
        <div className="horizon-pills">
          {HORIZON_PRESETS.map(h => (
            <button key={h.weeks}
              className={`horizon-pill ${horizonWeeks === h.weeks ? 'on' : ''}`}
              onClick={() => onSetHorizonWeeks(h.weeks)}
              disabled={isLoading}
            >
              {h.weeks === 4 ? '1MO' : h.weeks === 8 ? '2MO' : h.weeks === 12 ? '3MO' : h.weeks === 24 ? '6MO' : h.weeks === 52 ? '1YR' : `${h.weeks}W`}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] font-semibold text-[var(--t2)]">
          Retention window {hasResults ? (dispSimData!.retention_window_weeks > horizonWeeks ? `> ${horizonWeeks} weeks` : `${dispSimData!.retention_window_weeks} weeks`) : '—'}
        </span>
      </div>

      {/* ── CHART + NARRATIVE ─────────────────────────────────────────── */}
      <div className="chart-row stage-in stage-d3">
        <div className="chart-hero">
          <div className="chart-hero-head">
            <div>
              <div className="chart-hero-title font-semibold text-xs text-[var(--t)]">Churn Trajectory</div>
              <div className="chart-hero-sub font-mono text-[11px] font-semibold mt-1 uppercase tracking-[0.08em]">
                {formatHorizon(horizonWeeks)} forecast
                {projEnd !== null && <> · Scenario overlay active</>}
              </div>
            </div>
            <div className="flex gap-4 text-[11px] font-semibold text-[var(--t2)] font-mono uppercase tracking-[0.1em] flex-wrap justify-end">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[var(--danger)]" /> {customer.customer_id.split(' ')[0]}
              </span>
              {projEnd !== null && (
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5" style={{ backgroundImage: 'linear-gradient(to right, var(--accent) 60%, transparent 60%)', backgroundSize: '6px 2px' }} /> Scenario
                </span>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {dispSimData ? (
              <SimulationChart simData={dispSimData} horizonWeeks={horizonWeeks} />
            ) : isLoading ? (
              <div className="chart-placeholder" style={{ flex: 1 }}>
                <span className="dot-pulse" />
                <div className="font-mono text-[11px] uppercase tracking-[0.1em]">
                  Building {formatHorizon(horizonWeeks)} trajectory…
                </div>
              </div>
            ) : (
              <div className="chart-placeholder text-center" style={{ flex: 1 }}>
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
        </div>

        {/* ── NARRATIVE SIDE ─────────────────────────────────────────── */}
        <aside className="narrative-side">
          <div className="narrative-side-head">
            <Icons.Sparkle />
            <span>{scenarioText ? 'Scenario Analysis' : 'AI Summary'}</span>
            <span className="ml-auto text-[var(--t4)] font-mono text-[10px]">
              {narrativeLines.length}/4 paragraphs
            </span>
          </div>

          {scenarioText && narrativeLines.length > 0 && (
            <div className="narrative-side-quote">"{scenarioText}"</div>
          )}

          {narrativeLines.length === 0 && !isLoading && (
            <div className="narrative-side-placeholder">
              <div className="narrative-side-placeholder-icon"><Icons.Sparkle /></div>
              <div className="text-[12px] font-semibold text-[var(--t2)]">Waiting for results</div>
              <div className="text-[11px] font-medium text-[var(--t2)] leading-relaxed max-w-[240px]">
                The AI summary from the four-agent analysis will appear here once you run the simulation.
              </div>
            </div>
          )}

          {narrativeLines.length === 0 && isLoading && (
            <div className="narrative-side-placeholder">
              <span className="dot-pulse" />
              <div className="text-[11px] font-mono uppercase tracking-[0.1em]">Drafting paragraph 1…</div>
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
              4-agent consensus · {Math.round(confidence * 100)}% confidence
            </div>
          )}
        </aside>
      </div>

      {/* ── TRIPLE COLUMN ─────────────────────────────────────────────── */}
      {(hasResults || isLoading) && (
        <div className="triple stage-in stage-d5">

          {/* COL 1 — Drivers & Segments */}
          <div className="triple-col">
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div className="triple-h">
                  <span className="triple-h-num">01</span>
                  <span>Top Risk Factors</span>
                </div>
                {customer.shap_top5?.length ? (
                  customer.shap_top5.slice(0, 5).map((f, i) => (
                    <FactorBar key={i} label={f.feature_label} importance={f.importance} direction={f.direction} impactRatio={scenarioImpactRatio} />
                  ))
                ) : (
                  <p className="text-xs text-[var(--t3)]">No risk factors available</p>
                )}
              </div>
              <div style={{ borderTop: '1px solid var(--b)', paddingTop: 16 }}>
                <div className="triple-h">
                  <span className="triple-h-num">02</span>
                  <span>Segment Forecast</span>
                </div>
                {dispSimData?.segment_migration?.length ? (
                  dispSimData.segment_migration.map((s, i) => <SegBar key={i} item={s} />)
                ) : (
                  <div className="text-xs text-[var(--t3)]">No segment migration data</div>
                )}
              </div>
            </div>
          </div>

          {/* COL 2 — Agent thread */}
          <div className="triple-col">
            <div className="triple-h" style={{ flexShrink: 0 }}>
              <span className="triple-h-num">03</span>
              <span>AI Agent Analysis</span>
              <span className="ml-auto font-semibold text-[var(--t3)]">
                {dispAgents.filter(a => a.done).length}/{dispAgents.length || 4}
              </span>
            </div>
            <div className="agent-thread" style={{ overflowY: 'auto', flex: 1 }}>
              {dispAgents.length === 0 ? (
                <div className="text-xs font-medium text-[var(--t2)] py-4">Agents queued — run the simulation to start…</div>
              ) : (
                dispAgents.map((a, i) => {
                  const collapsed = collapsedAgents.has(i);
                  return (
                    <div key={i} className="agent-msg">
                      <div className="agent-msg-mark" style={{ background: a.color, color: 'var(--inv)', flexShrink: 0 }}>{a.short}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="agent-msg-meta" style={{ cursor: 'pointer' }} onClick={() => onToggleAgent(i)}>
                          <span className="agent-msg-name">{a.name}</span>
                          <span>·</span>
                          <span>{a.done ? 'done' : 'thinking…'}</span>
                          {a.done && <Icons.Check className="ml-1" style={{ color: a.color }} />}
                          <button
                            style={{ marginLeft: 'auto', color: 'var(--t4)', lineHeight: 1, flexShrink: 0 }}
                            aria-label={collapsed ? 'Expand' : 'Collapse'}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                              style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </div>
                        {!collapsed && (
                          <div className="agent-msg-body">
                            {a.content ? (
                              <>
                                {renderMd(filterThinkTags(a.content))}
                                {!a.done && <span className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--t2)] align-middle animate-pulse" />}
                              </>
                            ) : (
                              <div className="flex flex-col gap-1.5 py-1.5 opacity-40">
                                <div className="h-2 bg-[var(--t2)] rounded w-[90%] animate-pulse" />
                                <div className="h-2 bg-[var(--t2)] rounded w-[75%] animate-pulse" />
                                <div className="h-2 bg-[var(--t2)] rounded w-[50%] animate-pulse" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COL 3 — Playbook / Chat */}
          <div className="triple-col">
            <div className="triple-h">
              <span className="triple-h-num">04</span>
              <span>{thirdTab === 'playbook' ? 'Action Playbook' : 'Q&A Chat'}</span>
              <div className="col-toggle">
                <button className={thirdTab === 'playbook' ? 'on' : ''} onClick={() => onSetThirdTab('playbook')}>Actions</button>
                <button className={thirdTab === 'chat' ? 'on' : ''} onClick={() => onSetThirdTab('chat')}>
                  Ask AI{chatMsgs.length > 0 && ` (${chatMsgs.filter(m => m.role === 'user').length})`}
                </button>
              </div>
            </div>

            {thirdTab === 'playbook' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', gap: 12 }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <div className="playbook">
                    {dispRecs.map((r, i) => {
                      const used = usedRecs.has(r);
                      return (
                        <button key={i} className={`playbook-item${used ? ' used' : ''}`} disabled={isLoading || used} onClick={() => onScenario(r)}>
                          <span className="playbook-num">{used ? '✓ RAN' : String(i + 1).padStart(2, '0')}</span>
                          <span className="playbook-text">{r || <span style={{ color: 'var(--t4)' }}>—</span>}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="scenario-v2" style={{ flexShrink: 0 }}>
                  <div className="triple-h" style={{ marginBottom: 0 }}>
                    <span>Try Your Own Scenario</span>
                  </div>
                  <div className="scenario-input">
                    <Icons.Sparkle />
                    <input
                      value={scenInput}
                      onChange={e => onSetScenInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && scenInput.trim()) onScenario(scenInput); }}
                      placeholder="e.g. Offer 3-month premium support trial…"
                      disabled={isLoading}
                    />
                    <button
                      className="btn btn-primary btn-sm h-[30px]"
                      onClick={() => onScenario(scenInput)}
                      disabled={!scenInput.trim() || isLoading}
                    >
                      <Icons.Send /> Run
                    </button>
                  </div>
                </div>
              </div>
            )}

            {thirdTab === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', gap: 10 }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {chatMsgs.length === 0 && (
                    <div className="text-[12px] font-medium text-[var(--t2)] leading-relaxed py-5">
                      Ask anything about this customer — the AI answers based on the latest simulation run and won't change the chart.
                    </div>
                  )}
                  {chatMsgs.map(m => (
                    <div key={m.id} className={m.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}>
                      {m.content
                        ? m.role === 'ai'
                          ? <>{renderMd(filterThinkTags(m.content))}{m.streaming && <span className="caret-blink" />}</>
                          : m.content
                        : <span className="dot-pulse" />}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="scenario-input" style={{ flexShrink: 0 }}>
                  <Icons.Chat />
                  <input
                    value={chatInput}
                    onChange={e => onSetChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onSendChat(); }}
                    placeholder={hasResults ? 'Ask a question…' : 'Run a simulation first'}
                    disabled={!hasResults || phase === 'asking'}
                  />
                  <button
                    className="btn btn-primary btn-sm h-[30px]"
                    onClick={onSendChat}
                    disabled={!chatInput.trim() || !hasResults || phase === 'asking'}
                  >
                    <Icons.Send /> Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History Overlay ───────────────────────────────────────────── */}
      {showHistory && (
        <HistoryOverlay
          customer={customer}
          simId={simId}
          dbHistory={dbHistory}
          wsHistory={wsHistory}
          dbHistoryLoading={dbHistoryLoading}
          onClose={() => onSetShowHistory(false)}
          onLoadFromDb={onLoadFromDb}
          onSelectHistory={onSelectHistory}
        />
      )}

      {/* ── CMDK Overlay ──────────────────────────────────────────────── */}
      {cmdkMode && (
        <div className="cmdk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onSetCmdkMode(null); }}>
          <div className="cmdk-panel">
            <div style={{ padding: '12px 18px 0' }} className="flex items-center gap-2.5 border-b border-[var(--b)] pb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]">
                ⌘K · Switch customer
              </span>
              <span className="flex-1" />
              <button onClick={() => onSetCmdkMode(null)} className="text-[var(--t3)] text-[10px] font-mono">
                <Icons.X />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <CustomerPicker
                value={selectedId}
                exclude={[]}
                onSelect={(id) => { onSwitchCustomer(id); onSetCmdkMode(null); }}
                label="Switch customer…"
                hint=""
                customersList={customersList}
                listLoading={listLoading}
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
