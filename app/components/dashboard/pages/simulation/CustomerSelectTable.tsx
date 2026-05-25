'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Badge from '../../ui/Badge';
import FilterDropdown from '../../ui/FilterDropdown';
import type { CustomerListItem } from './types';

interface Props {
  datasetId:  string | null;
  selectedId: string;
  onSelect:   (id: string) => void;
}

function riskColor(level: string) {
  if (level === 'High')   return 'var(--r)';
  if (level === 'Medium') return 'var(--o)';
  return 'var(--g)';
}

function riskVariant(level: string): 'high' | 'med' | 'low' {
  if (level === 'High')   return 'high';
  if (level === 'Medium') return 'med';
  return 'low';
}

function monogram(id: string) {
  return id.slice(0, 2).toUpperCase();
}

const PAGE_SIZE = 12;

const RISK_OPTIONS = [
  { label: 'All Risk',  value: 'all' },
  { label: 'High',      value: 'High' },
  { label: 'Medium',    value: 'Medium' },
  { label: 'Low',       value: 'Low' },
];

export default function CustomerSelectTable({ datasetId, selectedId, onSelect }: Props) {
  const supabase = createClient();

  const [rows,       setRows]       = useState<CustomerListItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [debSearch,  setDebSearch]  = useState('');
  const [risk,       setRisk]       = useState('all');
  const [loading,    setLoading]    = useState(false);

  const debTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => { setDebSearch(v); setPage(1); }, 300);
  };

  const loadPage = useCallback(async () => {
    if (!datasetId) return;
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let q = supabase
      .from('predictions')
      .select('customer_id, risk_level, churn_score, plan_type, segment_label', { count: 'exact' })
      .eq('dataset_id', datasetId)
      .order('customer_id', { ascending: true })
      .range(from, to);

    if (risk !== 'all')         q = q.ilike('risk_level', risk);
    if (debSearch.trim() !== '') q = q.ilike('customer_id', `%${debSearch.trim()}%`);

    const { data, count } = await q;
    if (data) setRows(data as CustomerListItem[]);
    if (count != null) setTotal(count);
    setLoading(false);
  }, [datasetId, page, risk, debSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPage(); }, [loadPage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageButtons = () => {
    const btns: (number | '…')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) btns.push(i);
    } else {
      btns.push(1);
      if (page > 3)          btns.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) btns.push(i);
      if (page < totalPages - 2) btns.push('…');
      btns.push(totalPages);
    }
    return btns;
  };

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t4)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search customer ID…"
            className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-[var(--t)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--p)] transition-colors"
          />
        </div>
        <FilterDropdown
          options={RISK_OPTIONS}
          value={risk}
          onChange={v => { setRisk(v); setPage(1); }}
          size="xs"
          showIcon
          className="w-28 shrink-0"
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-[var(--b)] bg-[var(--surf)]">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--b)] bg-[var(--bg1)]">
              <th className="text-left px-3 py-2 font-semibold text-[var(--t3)] uppercase tracking-[0.06em] text-[9px] w-[50%]">Customer</th>
              <th className="text-right px-3 py-2 font-semibold text-[var(--t3)] uppercase tracking-[0.06em] text-[9px] w-[22%]">Score</th>
              <th className="text-left px-2 py-2 font-semibold text-[var(--t3)] uppercase tracking-[0.06em] text-[9px] w-[28%] min-w-[78px]">Risk</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--b)] last:border-0">
                  <td className="px-3 py-2.5 w-[50%]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[var(--b2)] animate-pulse shrink-0" />
                      <div className="h-2.5 w-20 rounded bg-[var(--b2)] animate-pulse" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 w-[22%]">
                    <div className="h-2.5 w-10 rounded bg-[var(--b2)] animate-pulse ml-auto" />
                  </td>
                  <td className="px-2 py-2.5 w-[28%] min-w-[78px]">
                    <div className="h-4 w-12 rounded bg-[var(--b2)] animate-pulse" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-[var(--t4)] text-xs">
                  No customers found
                </td>
              </tr>
            ) : rows.map(row => {
              const active = row.customer_id === selectedId;
              const sc = row.churn_score;
              return (
                <tr
                  key={row.customer_id}
                  onClick={() => onSelect(row.customer_id)}
                  className={`border-b border-[var(--b)] last:border-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-[var(--p)]/8'
                      : 'hover:bg-[var(--bg1)]'
                  } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <td className="px-3 py-2.5 w-[50%]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded-md text-[9px] font-black flex items-center justify-center shrink-0 text-white"
                        style={{ background: riskColor(row.risk_level) }}
                      >
                        {monogram(row.customer_id)}
                      </span>
                      <div className="min-w-0">
                        <p className={`font-semibold truncate leading-tight ${active ? 'text-[var(--p)]' : 'text-[var(--t)]'}`}>
                          {row.customer_id}
                        </p>
                        <p className="text-[9px] text-[var(--t4)] truncate">{row.plan_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 w-[22%]">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold tabular-nums" style={{ color: riskColor(row.risk_level) }}>
                        {sc.toFixed(0)}
                      </span>
                      <div className="w-12 h-1 rounded-full bg-[var(--b2)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${sc}%`, background: riskColor(row.risk_level) }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 w-[28%] min-w-[78px]">
                    <Badge label={row.risk_level} variant={riskVariant(row.risk_level)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[10px] text-[var(--t3)] font-mono">
          {total > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
            : '0 customers'}
        </p>
        <div className="flex gap-0.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg1)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {pageButtons().map((b, i) =>
            b === '…' ? (
              <span key={`e${i}`} className="w-6 h-6 flex items-center justify-center text-[10px] text-[var(--t4)]">…</span>
            ) : (
              <button
                key={b}
                onClick={() => setPage(b as number)}
                className={`w-6 h-6 rounded text-[10px] font-semibold transition-colors ${
                  b === page
                    ? 'bg-[var(--p)] text-white'
                    : 'text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg1)]'
                }`}
              >
                {b}
              </button>
            )
          )}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg1)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}