'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../layout/DashboardLayout';
import StatCard from '../../ui/StatCard';
import Card from '../../ui/Card';
import SearchBar from '../../ui/SearchBar';
import AuthDropdown from '@/app/components/auth/AuthDropdown';
import ProgressBar from '../../ui/ProgressBar';
import ClusterChart from '../../charts/ClusterChart';
import SegmentDistributionChart from '../../charts/SegmentDistributionChart';
import Pagination from '../../ui/Pagination';
import PermissionGate from '../../ui/PermissionGate';
import { useDashboardContext } from '../../context/DashboardContext';
import { createClient } from '@/lib/supabase/client';

export const PALETTE = [
  { hex: '#ef4444', textClass: 'text-red-600', iconBgClass: 'bg-red-50', badgeClass: 'bg-red-50/50 text-red-600 border border-red-100' },
  { hex: '#3b82f6', textClass: 'text-blue-600', iconBgClass: 'bg-blue-50', badgeClass: 'bg-blue-50/50 text-blue-600 border border-blue-100' },
  { hex: '#a855f7', textClass: 'text-purple-600', iconBgClass: 'bg-purple-50', badgeClass: 'bg-purple-50/50 text-purple-600 border border-purple-100' },
  { hex: '#10b981', textClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50', badgeClass: 'bg-emerald-50/50 text-emerald-600 border border-emerald-100' },
  { hex: '#f59e0b', textClass: 'text-amber-600', iconBgClass: 'bg-amber-50', badgeClass: 'bg-amber-50/50 text-amber-600 border border-amber-100' },
  { hex: '#06b6d4', textClass: 'text-cyan-600', iconBgClass: 'bg-cyan-50', badgeClass: 'bg-cyan-50/50 text-cyan-600 border border-cyan-100' }
];

export function getSegmentIcon(label: string, colorClass: string) {
  const lower = label.toLowerCase();

  if (lower.includes('risk') || lower.includes('churn') || lower.includes('danger') || lower.includes('leave') || lower.includes('unhappy') || lower.includes('dissatisfied') || lower.includes('poor') || lower.includes('bad') || lower.includes('low')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  if (lower.includes('loyal') || lower.includes('champion') || lower.includes('satisfied') || lower.includes('best')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }

  if (lower.includes('new') || lower.includes('adopter') || lower.includes('recent') || lower.includes('starter')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }

  if (lower.includes('value') || lower.includes('high') || lower.includes('premium') || lower.includes('whale') || lower.includes('tier')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }

  if (lower.includes('bill') || lower.includes('price') || lower.includes('cost') || lower.includes('usage') || lower.includes('intensive')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function getSegmentColorway(label: string) {
  const lower = label.toLowerCase();
  
  if (lower.includes('risk') || lower.includes('churn') || lower.includes('danger') || lower.includes('leave') || lower.includes('unhappy') || lower.includes('dissatisfied') || lower.includes('poor') || lower.includes('bad') || lower.includes('low')) {
    return PALETTE[0]; // Red
  }
  if (lower.includes('loyal') || lower.includes('champion') || lower.includes('satisfied') || lower.includes('best')) {
    return PALETTE[3]; // Emerald
  }
  if (lower.includes('new') || lower.includes('adopter') || lower.includes('recent') || lower.includes('starter')) {
    return PALETTE[1]; // Blue
  }
  if (lower.includes('value') || lower.includes('high') || lower.includes('premium') || lower.includes('whale') || lower.includes('tier')) {
    return PALETTE[2]; // Purple
  }
  if (lower.includes('bill') || lower.includes('price') || lower.includes('cost') || lower.includes('usage') || lower.includes('intensive')) {
    return PALETTE[4]; // Amber
  }

  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function getFallbackPalette(label: string) {
  return getSegmentColorway(label);
}

const SegmentationPageContent = memo(() => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const datasetId = searchParams.get('dataset_id');
  const { workspace } = useDashboardContext();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [segmentStats, setSegmentStats] = useState<any[]>([]);
  const [barData, setBarData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [search, setSearch] = useState('');
  const [seg, setSeg] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    async function init() {
      if (!datasetId) {
        if (!workspace) return;
        setLoading(true);
        const { data } = await supabase.from('datasets').select('id')
          .eq('workspace_id', workspace.id).eq('status', 'done')
          .order('created_at', { ascending: false }).limit(1);
        if (data && data.length > 0) {
          router.replace(`/dashboard/segmentation?dataset_id=${data[0].id}`);
        } else {
          setLoading(false);
        }
        return;
      }
    }
    init();
  }, [datasetId, workspace, router, supabase]);

  const loadData = useCallback(async (
    currentPage: number, searchVal: string, segVal: string, dsId: string, limit: number
  ) => {
    setLoading(true);

    if (segmentStats.length === 0) {
      const { data: segData, error: segError } = await supabase
        .from('segments')
        .select('*')
        .eq('dataset_id', dsId)
        .order('avg_churn_score', { ascending: false });

      if (!segError && segData) {
        const stats = segData.map((s: any) => {
          const colorSet = getSegmentColorway(s.segment_label);

          return {
            label: s.segment_label,
            value: s.total_customers.toLocaleString('en-US'),
            badge: `${s.pct_high_risk}%`,
            avgMrr: `$${Math.round(s.avg_revenue).toLocaleString('en-US')}`,
            totalMrr: `$${Math.round((s.avg_revenue * s.total_customers) / 1000).toLocaleString('en-US')}K`,
            metricColorClass: colorSet.textClass,
            iconBgClass: colorSet.iconBgClass,
            icon: getSegmentIcon(s.segment_label, colorSet.textClass),
            accentColor: colorSet.hex,
            colorSet
          };
        });
        setSegmentStats(stats);

        const barChartData = segData.map((s: any) => {
          const colorSet = getSegmentColorway(s.segment_label);
          return {
            name: s.segment_label,
            count: s.total_customers,
            fill: colorSet.hex
          };
        });
        setBarData(barChartData);
      }
    }

    const from = (currentPage - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('predictions')
      .select('customer_id,plan_type,contract_type,churn_score,risk_level,segment_label,segment_rfm_context,nlp_red_flag,loyalty_risk_flag', { count: 'exact' })
      .eq('dataset_id', dsId)
      .order('customer_id', { ascending: true })
      .range(from, to);

    if (segVal !== 'all') {
      query = query.eq('segment_label', segVal);
    }
    if (searchVal.trim() !== '') {
      query = query.ilike('customer_id', `%${searchVal.trim()}%`);
    }

    const { data: custData, count, error: custError } = await query;
    if (!custError && custData) {
      const formattedCustomers = custData.map((c: any) => {
        const mrrVal = c.segment_rfm_context?.total_revenue?.customer || 0;
        return {
          id: c.customer_id,
          plan: c.plan_type,
          contract: c.contract_type,
          mrr: `$${Math.round(mrrVal).toLocaleString()}`,
          segment: c.segment_label,
          score: Math.round(c.churn_score),
          riskLevel: c.risk_level,
          nlpFlag: c.nlp_red_flag === 1,
          loyaltyFlag: c.loyalty_risk_flag === 1,
        };
      });
      setCustomers(formattedCustomers);
      setTotalCustomers(count ?? 0);
    }

    setLoading(false);
  }, [segmentStats.length, supabase]);

  useEffect(() => {
    if (!datasetId) return;
    loadData(page, search, seg, datasetId, pageSize);
  }, [page, search, seg, datasetId, pageSize, loadData]);

  const totalPages = Math.ceil(totalCustomers / pageSize);
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleSeg = (v: string) => { setSeg(v); setPage(1); };
  const handlePageSizeChange = (v: number) => { setPageSize(v); setPage(1); };

  if (!isMounted) return <div className="h-screen bg-[var(--bg)] animate-pulse" />;

  if (loading && !datasetId) {
    return (
      <DashboardLayout page="Customer Segmentation">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <svg className="animate-spin text-[var(--b3)]" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  if (!datasetId) {
    return (
      <DashboardLayout page="Customer Segmentation">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg1)] border border-[var(--b)] flex items-center justify-center mb-2 shadow-sm">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-[var(--t)] mb-1">No Dataset Selected</h3>
            <p className="text-xs text-[var(--t4)] max-w-[250px] mx-auto leading-relaxed">
              Please select a dataset from the Data Management page.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout page="Customer Segmentation">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {segmentStats.map((s, i) => {
          const colorSet = getSegmentColorway(s.label);
          return (
            <StatCard
              key={i}
              label={s.label}
              value={s.value}
              change={s.avgMrr}
              changeSuffix={`avg MRR · ${s.badge} high risk`}
              changePositive={parseFloat(s.badge) < 30}
              accentColor={colorSet.hex}
              icon={getSegmentIcon(s.label, colorSet.textClass)}
            />
          );
        })}
      </div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><ClusterChart segmentOrder={segmentStats.map(s => s.label)} /></Card>
          <Card>
            <SegmentDistributionChart data={barData} />
          </Card>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <SearchBar value={search} onChange={handleSearch} placeholder="Search by ID..." className="flex-1" />
            <AuthDropdown
              value={seg}
              onChange={handleSeg}
              className="w-48"
              placeholder="Filter Segment"
              variant="filter"
              options={[
                { label: 'All Segments', value: 'all' },
                ...segmentStats.map(s => ({ label: s.label, value: s.label }))
              ]}
            />
            <span className="text-[10px] text-[var(--t3)] bg-[var(--bg1)] px-3 py-2 rounded-xl font-bold uppercase tracking-wider whitespace-nowrap border border-[var(--b)]">
              {totalCustomers.toLocaleString()} customers
            </span>
          </div>

          <Card padding="none">
              <div className="min-h-[500px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--b)]">
                    {['ID', 'Plan & Contract', 'MRR', 'Segment', 'Risk Flags', 'Score'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--b)]/50">
                  {loading ? (
                    Array.from({ length: pageSize }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 bg-[var(--bg1)] rounded animate-pulse" style={{ width: `${60 + ((i * 6 + j) % 4) * 10}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : customers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--t4)]">No customers found</td></tr>
                  ) : (
                    customers.map(c => (
                      <tr key={c.id} className="transition-colors hover:bg-[var(--bg1)]">
                        <td className="px-4 py-3 text-xs font-mono text-[var(--t4)]">{c.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block w-fit uppercase tracking-wider ${
                              c.plan === 'Enterprise' ? 'bg-zinc-900 text-zinc-50 border border-zinc-800' :
                              c.plan === 'Professional' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>{c.plan}</span>
                            <span className="text-[10px] text-[var(--t4)] ml-1 capitalize">{c.contract || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-[var(--t)]">{c.mrr}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getSegmentColorway(c.segment).badgeClass} ${c.score >= 70 ? '!bg-red-50 !text-red-600 !border-red-200' : ''}`}>{c.segment}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {c.nlpFlag && (
                              <span title="NLP Hidden Risk" className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--o)]/10 text-[var(--o)] border border-[var(--o)]/20 uppercase tracking-[0.05em]">
                                <span className="w-1 h-1 rounded-full bg-[var(--o)] inline-block" />NLP
                              </span>
                            )}
                            {c.loyaltyFlag && (
                              <span title="Loyalty Risk" className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--p)]/10 text-[var(--p)] border border-[var(--p)]/20 uppercase tracking-[0.05em]">
                                <span className="w-1 h-1 rounded-full bg-[var(--p)] inline-block" />Loyalty
                              </span>
                            )}
                            {!c.nlpFlag && !c.loyaltyFlag && <span className="text-[10px] text-[var(--t4)]">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 w-28">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={c.score} color={c.score >= 70 ? 'red' : 'black'} height="xs" />
                            <span className={`text-xs font-bold ${c.score >= 70 ? 'text-[var(--r)]' : 'text-[var(--t)]'}`}>{c.score}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCustomers}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
});

export default function SegmentationPage() {
  return (
    <PermissionGate permission="view_analytics">
      <SegmentationPageContent />
    </PermissionGate>
  );
}
