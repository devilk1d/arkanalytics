'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../layout/DashboardLayout';
import SegmentStatCard from '../../ui/SegmentStatCard';
import Card from '../../ui/Card';
import SearchBar from '../../ui/SearchBar';
import AuthDropdown from '@/app/components/auth/AuthDropdown';
import ProgressBar from '../../ui/ProgressBar';
import ClusterChart from '../../charts/ClusterChart';
import Pagination from '../../ui/Pagination';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useDashboardContext } from '../../context/DashboardContext';
import { createClient } from '@/lib/supabase/client';

export const PALETTE = [
  { hex: '#ef4444', textClass: 'text-red-600', iconBgClass: 'bg-red-100', badgeClass: 'bg-red-100 text-red-700' },
  { hex: '#3b82f6', textClass: 'text-blue-600', iconBgClass: 'bg-blue-100', badgeClass: 'bg-blue-100 text-blue-700' },
  { hex: '#a855f7', textClass: 'text-purple-600', iconBgClass: 'bg-purple-100', badgeClass: 'bg-purple-100 text-purple-700' },
  { hex: '#10b981', textClass: 'text-emerald-600', iconBgClass: 'bg-emerald-100', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { hex: '#f59e0b', textClass: 'text-amber-600', iconBgClass: 'bg-amber-100', badgeClass: 'bg-amber-100 text-amber-700' },
  { hex: '#06b6d4', textClass: 'text-cyan-600', iconBgClass: 'bg-cyan-100', badgeClass: 'bg-cyan-100 text-cyan-700' }
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

export default function SegmentationPage() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, workspace, router]);

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
        const stats = segData.map((s: any, idx: number) => {
          const colorSet = getSegmentColorway(s.segment_label);

          return {
            label: s.segment_label,
            value: s.total_customers.toLocaleString(),
            badge: `${s.pct_high_risk}%`,
            avgMrr: `$${Math.round(s.avg_revenue).toLocaleString()}`,
            totalMrr: `$${Math.round((s.avg_revenue * s.total_customers) / 1000)}K`,
            metricColorClass: colorSet.textClass,
            iconBgClass: colorSet.iconBgClass,
            icon: getSegmentIcon(s.segment_label, colorSet.textClass),
            colorSet
          };
        });
        setSegmentStats(stats);

        const barChartData = segData.map((s: any, idx: number) => {
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
      .select('customer_id,plan_type,churn_score,risk_level,segment_label,segment_rfm_context', { count: 'exact' })
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
          name: `Customer ${c.customer_id}`,
          email: `${c.customer_id.toLowerCase()}@example.com`,
          plan: c.plan_type,
          mrr: `$${Math.round(mrrVal).toLocaleString()}`,
          segment: c.segment_label,
          score: Math.round(c.churn_score)
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

  if (!datasetId) {
    return (
      <DashboardLayout page="Customer Segmentation">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
          <div className="text-center">
            <h3 className="text-sm font-bold text-black mb-1">No Dataset Selected</h3>
            <p className="text-xs text-gray-400 max-w-[250px] mx-auto leading-relaxed">
              Please select a dataset from the Data Management page.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout page="Customer Segmentation">
      <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 2xl:grid-cols-4">
        {segmentStats.map((s, i) => (
          <SegmentStatCard
            key={i}
            label={s.label}
            value={s.value}
            percentage={s.badge}
            avgMrr={s.avgMrr}
            totalMrr={s.totalMrr}
            icon={s.icon}
            iconBgClass={s.iconBgClass}
            metricColorClass={s.metricColorClass}
          />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><ClusterChart segmentOrder={segmentStats.map(s => s.label)} /></Card>
          <Card>
            <h3 className="text-lg font-bold text-black mb-0.5">Segment Distribution</h3>
            <p className="text-sm text-gray-400 mb-4">Customer count by segment</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }} barSize={14}>
                <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => [`${v} customers`]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-xl font-medium whitespace-nowrap">
              {totalCustomers.toLocaleString()} customers
            </span>
          </div>

          <Card padding="none">
            <div className="min-h-[500px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['ID', 'Customer', 'Plan', 'MRR', 'Segment', 'Score'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">Loading...</td></tr>
                  ) : customers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">No customers found</td></tr>
                  ) : (
                    customers.map(c => (
                      <tr key={c.id} className={`transition-colors ${c.score >= 70 ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-sm font-semibold text-black">{c.name}</p>
                              <p className="text-xs text-gray-400">{c.email}</p>
                            </div>
                            {c.score >= 70 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider ml-1">At Risk</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{c.plan}</td>
                        <td className="px-4 py-3 text-sm font-bold text-black">{c.mrr}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getSegmentColorway(c.segment).badgeClass}`}>{c.segment}</span>
                        </td>
                        <td className="px-4 py-3 w-28">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={c.score} color={c.score >= 70 ? 'red' : c.score >= 40 ? 'yellow' : 'green'} height="sm" />
                            <span className={`text-xs font-bold shrink-0 ${c.score >= 70 ? 'text-red-600' : 'text-gray-600'}`}>{c.score}</span>
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
}

