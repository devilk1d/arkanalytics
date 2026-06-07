'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Badge from '../../ui/Badge';
import { Icons, monogram } from './simulationShared';
import type { PredictionRow } from './types';
import { relativeTime, type SimulationRecord } from '@/lib/simulation-db';

// ── CustomerPicker ─────────────────────────────────────────────────────────────
export function CustomerPicker({
  value, exclude = [], onSelect, onClose, label = 'Pick a customer', hint = '', pad = 18,
  customersList, listLoading,
}: {
  value: string | null;
  exclude?: string[];
  onSelect: (id: string) => void;
  onClose?: () => void;
  label?: string;
  hint?: string;
  pad?: number;
  customersList: PredictionRow[];
  listLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [debSearch, setDebSearch] = useState('');
  const [risk, setRisk] = useState('all');
  const [plan, setPlan] = useState('all');
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 60);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debSearch, risk, plan]);

  const counts = useMemo(() => {
    const pool = customersList.filter(c => !exclude.includes(c.customer_id));
    return {
      all:    pool.length,
      high:   pool.filter(c => c.risk_level === 'High').length,
      medium: pool.filter(c => c.risk_level === 'Medium').length,
      low:    pool.filter(c => c.risk_level === 'Low').length,
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
    <div style={{ padding: `${pad}px ${pad + 6}px` }} className="flex flex-col gap-2">
      {/* Row 1: Search */}
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

      {/* Row 2: Risk + Plan filters */}
      <div className="picker-filter-row">
        <span className="picker-filter-label">Risk</span>
        <div className="picker-filter-group">
          {([['all', 'All'], ['High', 'High'], ['Medium', 'Med'], ['Low', 'Low']] as const).map(([k, l]) => (
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
          {listLoading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'customer' : 'customers'}`}
          {hint && <span className="text-[var(--t4)] ml-2.5">{hint}</span>}
        </span>
        {onClose && (
          <button onClick={onClose}
            className="text-[var(--t3)] text-[10px] font-mono uppercase tracking-[0.1em] inline-flex items-center gap-1.5">
            <Icons.X /> Close <kbd className="kbd-hint ml-1">Esc</kbd>
          </button>
        )}
      </div>

      <div className="picker-list picker-list-fixed">
        {listLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="picker-row" style={{ pointerEvents: 'none' }}>
              <div className="picker-row-mark" style={{
                background: 'var(--bg3)', border: '1px solid var(--b)',
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.08}s`,
              }} />
              <div className="picker-row-info" style={{ gap: 6 }}>
                <div style={{ height: 11, width: `${55 + (i % 3) * 15}px`, borderRadius: 4, background: 'var(--bg3)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
                <div style={{ height: 9, width: `${90 + (i % 4) * 20}px`, borderRadius: 4, background: 'var(--bg3)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08 + 0.05}s` }} />
              </div>
              <div style={{ height: 20, width: 44, borderRadius: 6, background: 'var(--bg3)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s`, flexShrink: 0 }} />
            </div>
          ))
        ) : (
          <>
            {paginated.length === 0 && (
              <div className="picker-empty">No customers match the current filters</div>
            )}
            {paginated.map(c => {
              const initials = monogram(c.customer_id);
              const rc = c.risk_level === 'High' ? 'var(--danger)' : c.risk_level === 'Medium' ? 'var(--warn)' : 'var(--accent)';
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
          </>
        )}
      </div>

      <div className="flex items-center justify-between px-2 py-3 border-t border-[var(--b)] text-[11px] text-[var(--t3)] font-mono">
        <span>
          {filtered.length > 0
            ? `Showing ${((page - 1) * PAGE_SIZE) + 1}–${Math.min(filtered.length, page * PAGE_SIZE)} of ${filtered.length}`
            : '0 customers'}
        </span>
        <div className="flex gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-1 rounded bg-[var(--bg2)] border border-[var(--b)] text-[var(--t)] hover:bg-[var(--bg3)] hover:text-[var(--t2)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Prev
          </button>
          <span className="self-center">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-1 rounded bg-[var(--bg2)] border border-[var(--b)] text-[var(--t)] hover:bg-[var(--bg3)] hover:text-[var(--t2)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HistoryPicker ──────────────────────────────────────────────────────────────
function HistoryPicker({
  records, loading, onPick, pad = 20,
}: {
  records: SimulationRecord[];
  loading: boolean;
  onPick: (rec: SimulationRecord) => void;
  pad?: number;
}) {
  const [search, setSearch] = useState('');
  const [debSearch, setDebSearch] = useState('');
  const [risk, setRisk] = useState('all');
  const [page, setPage] = useState(1);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debSearch, risk]);

  const counts = useMemo(() => ({
    all:    records.length,
    High:   records.filter(r => r.risk_level === 'High').length,
    Medium: records.filter(r => r.risk_level === 'Medium').length,
    Low:    records.filter(r => r.risk_level === 'Low').length,
  }), [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (risk !== 'all' && r.risk_level !== risk) return false;
      if (debSearch.trim()) {
        const hay = `${r.customer_id} ${r.segment_label ?? ''} ${r.scenario ?? ''}`.toLowerCase();
        if (!hay.includes(debSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [records, debSearch, risk]);

  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  return (
    <div style={{ padding: `${pad}px ${pad + 6}px` }} className="flex flex-col gap-2">
      {/* Row 1: Search */}
      <div className="picker-search">
        <Icons.Search />
        <input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search history by customer, segment, or scenario…"
        />
        {(search || risk !== 'all') && (
          <button
            onClick={() => { setSearch(''); setRisk('all'); }}
            className="text-[var(--t3)] text-[10px] font-mono uppercase tracking-[0.06em]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Row 2: Risk filter */}
      <div className="picker-filter-row">
        <span className="picker-filter-label">Risk</span>
        <div className="picker-filter-group">
          {([['all', 'All'], ['High', 'High'], ['Medium', 'Med'], ['Low', 'Low']] as const).map(([k, l]) => (
            <button key={k} className={`picker-filter-btn ${risk === k ? 'on' : ''}`} onClick={() => setRisk(k)}>
              {l} <span className="count">{counts[k as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--t3)] font-mono uppercase tracking-[0.1em]">
          {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'run' : 'runs'}`}
        </span>
      </div>

      <div className="picker-list picker-list-fixed" style={{ gridTemplateColumns: '1fr' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="picker-row" style={{ pointerEvents: 'none' }}>
              <div className="picker-row-mark" style={{
                background: 'var(--bg3)', border: '1px solid var(--b)',
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.08}s`,
              }} />
              <div className="picker-row-info" style={{ gap: 6 }}>
                <div style={{ height: 11, width: `${55 + (i % 3) * 15}px`, borderRadius: 4, background: 'var(--bg3)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
                <div style={{ height: 9, width: `${90 + (i % 4) * 20}px`, borderRadius: 4, background: 'var(--bg3)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08 + 0.05}s` }} />
              </div>
              <div style={{ height: 20, width: 44, borderRadius: 6, background: 'var(--bg3)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s`, flexShrink: 0 }} />
            </div>
          ))
        ) : paginated.length === 0 ? (
          <div className="picker-empty">
            {records.length === 0
              ? 'No simulations saved yet — pick a customer and run one'
              : 'No history matches the current filters'}
          </div>
        ) : (
          paginated.map(rec => {
            const rc = rec.risk_level === 'High' ? 'var(--danger)' : rec.risk_level === 'Medium' ? 'var(--warn)' : 'var(--accent)';
            const scenCount = rec.scenario_turns?.length ?? 0;
            const chatCount = rec.chat_messages?.length ?? 0;
            const isLoading = loadingId === rec.id;
            return (
              <button
                key={rec.id}
                disabled={isLoading}
                onClick={() => { setLoadingId(rec.id); onPick(rec); }}
                className="picker-row"
                style={{ opacity: loadingId && !isLoading ? 0.4 : 1 }}
              >
                <div className="picker-row-mark" style={{ borderColor: isLoading ? 'var(--accent)' : rc, color: rc }}>
                  {isLoading ? (
                    <span className="dot-pulse" style={{ transform: 'scale(0.6)' }} />
                  ) : (
                    <span style={{ fontWeight: 800 }}>
                      {rec.churn_score != null ? Math.round(Number(rec.churn_score)) : '—'}
                    </span>
                  )}
                </div>
                <div className="picker-row-info">
                  <div className="picker-row-name">
                    {isLoading ? 'Opening simulation…' : rec.customer_id}
                  </div>
                  <div className="picker-row-meta">
                    <span style={{ color: rc, fontWeight: 700 }}>{rec.risk_level ?? '—'}</span>
                    {' · '}{rec.segment_label ?? '—'}{' · '}{rec.horizon_weeks}w
                    {scenCount > 0 && <> · <span style={{ color: 'var(--accent)' }}>{scenCount} scenario{scenCount > 1 ? 's' : ''}</span></>}
                    {chatCount > 0 && <> · <span style={{ color: 'var(--info)' }}>{Math.floor(chatCount / 2)} Q&A</span></>}
                    {' · '}{relativeTime(rec.created_at)}
                  </div>
                </div>
                <div className="picker-row-stats">
                  <Badge
                    label={rec.risk_level ?? '—'}
                    variant={rec.risk_level === 'High' ? 'high' : rec.risk_level === 'Low' ? 'low' : 'med'}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between px-2 py-3 border-t border-[var(--b)] text-[11px] text-[var(--t3)] font-mono">
        <span>
          {filtered.length > 0
            ? `Showing ${((page - 1) * PAGE_SIZE) + 1}–${Math.min(filtered.length, page * PAGE_SIZE)} of ${filtered.length}`
            : '0 runs'}
        </span>
        <div className="flex gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-1 rounded bg-[var(--bg2)] border border-[var(--b)] text-[var(--t)] hover:bg-[var(--bg3)] hover:text-[var(--t2)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Prev
          </button>
          <span className="self-center">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-1 rounded bg-[var(--bg2)] border border-[var(--b)] text-[var(--t)] hover:bg-[var(--bg3)] hover:text-[var(--t2)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Welcome / Picker Screen ────────────────────────────────────────────────────
export function CustomerPickerView({
  customersList, listLoading, onSelect, onSelectHistory, wsHistory = [],
}: {
  customersList: PredictionRow[];
  listLoading: boolean;
  onSelect: (id: string) => void;
  onSelectHistory?: (rec: SimulationRecord) => void;
  wsHistory?: SimulationRecord[];
}) {
  const [tab, setTab] = useState<'customers' | 'history'>('customers');

  return (
    <div className="page-cockpit fade-in">
      <div className="welcome-hero">
        <div className="welcome-intro">
          <div className="welcome-eyebrow stage-in">
            <span>CHURN SIMULATION</span>
            <span className="dim">/</span>
            <span>{customersList.length} CUSTOMERS</span>
          </div>
          <h1 className="welcome-title stage-in stage-d1">
            Pick a customer to simulate <span className="accent">churn trajectory</span> and intervention scenarios.
          </h1>
          <p className="welcome-sub stage-in stage-d2">
            The model streams a four-agent analysis: behavioral, revenue, customer success, and product research. Set a horizon, run a baseline, then explore what-ifs.
          </p>

          <div className="welcome-shortcuts stage-in stage-d4">
            <span><kbd>⌘</kbd><kbd>K</kbd> Switch customer from anywhere</span>
            <span><kbd>R</kbd> Run simulation</span>
            <span><kbd>Esc</kbd> Close overlay</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="welcome-picker-host stage-in stage-d3">
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b)', marginBottom: 0 }}>
            {(['customers', 'history'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: tab === t ? 'var(--t)' : 'var(--t3)',
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1, transition: 'color .12s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {t === 'customers' ? 'Customers' : 'History'}
                {t === 'history' && wsHistory.length > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    background: 'var(--accent)', color: 'var(--inv)',
                    borderRadius: 9, padding: '1px 5px',
                  }}>
                    {wsHistory.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'customers' && (
            <CustomerPicker
              value={null}
              onSelect={onSelect}
              label="Search customers by name, ID, or segment…"
              pad={20}
              customersList={customersList}
              listLoading={listLoading}
            />
          )}

          {tab === 'history' && (
            <HistoryPicker
              records={wsHistory}
              loading={listLoading}
              pad={20}
              onPick={(rec) => {
                if (onSelectHistory) onSelectHistory(rec);
                else onSelect(rec.customer_id);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
