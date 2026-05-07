'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboardContext } from '../../context/DashboardContext';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import SearchBar from '../../ui/SearchBar';
import Select from '../../ui/Select';
import ProgressBar from '../../ui/ProgressBar';
import Pagination from '../../ui/Pagination';
import StatCard from '../../ui/StatCard';
import AuthDropdown from '@/app/components/auth/AuthDropdown';
import { SendToChatModal } from './ActionModals';
import { AnalyzeCustomerModal } from './AnalyzeCustomerModal';
import { createClient } from '@/lib/supabase/client';
import type { CustomerPrediction } from '@/types/churn';
import PermissionGate from '../../ui/PermissionGate';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PredictionRow {
  customer_id: string;
  plan_type: string;
  contract_type: string;
  churn_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  segment_label: string;
  nlp_red_flag: number;
  loyalty_risk_flag?: number;
  // CSV metrics
  mrr?: number;
  total_users?: number;
  usage_hrs?: number;
  subscribed_date?: string;
}

interface CsvMetrics {
  mrr: number;
  total_users: number;
  usage_hrs: number;
  subscribed_date?: string;
  plan_type?: string;
  contract_type?: string;
}


const planColors: Record<string, string> = {
  Enterprise: 'bg-blue-100 text-blue-700',
  Professional: 'bg-purple-100 text-purple-700',
  Starter: 'bg-gray-100 text-gray-700',
};

const riskColors = { Low: 'text-green-500', Medium: 'text-yellow-500', High: 'text-red-500' };

const PAGE_SIZE_OPTIONS = [
  { label: '10 items', value: '10' },
  { label: '25 items', value: '25' },
  { label: '50 items', value: '50' },
  { label: '100 items', value: '100' }
];

// ── Main Page ─────────────────────────────────────────────────────────────────
function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const datasetId = searchParams.get('dataset_id');
  const { workspace, profile, members } = useDashboardContext();
  const supabase = createClient();

  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [risk, setRisk] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [csvMetrics, setCsvMetrics] = useState<Map<string, CsvMetrics>>(new Map());
  const [maxUsage, setMaxUsage] = useState(1);

  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [retainCustomer, setRetain] = useState<PredictionRow | null>(null);
  const [offerCustomer, setOffer] = useState<PredictionRow | null>(null);
  const [shareCustomers, setShareCustomers] = useState<PredictionRow[] | null>(null);

  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    avgScore: 0,
    highRiskCount: 0,
    revenueAtRisk: 0,
    highRiskPct: 0
  });

  const loadSummaryStats = useCallback(async (dsId: string, metrics: Map<string, CsvMetrics>) => {
    let allPreds: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('predictions')
        .select('customer_id,churn_score,risk_level')
        .eq('dataset_id', dsId)
        .range(from, from + step - 1);

      if (error || !data) {
        hasMore = false;
      } else {
        allPreds = [...allPreds, ...data];
        if (data.length < step) hasMore = false;
        else from += step;
      }
    }

    if (allPreds.length > 0) {
      let totalScore = 0;
      let hrCount = 0;
      let hrRev = 0;

      allPreds.forEach(p => {
        totalScore += p.churn_score || 0;
        if (p.risk_level?.toLowerCase() === 'high') {
          hrCount++;
          const m = metrics.get(p.customer_id);
          if (m) hrRev += m.mrr;
        }
      });

      setSummaryStats({
        total: allPreds.length,
        avgScore: allPreds.length > 0 ? totalScore / allPreds.length : 0,
        highRiskCount: hrCount,
        revenueAtRisk: hrRev,
        highRiskPct: allPreds.length > 0 ? (hrCount / allPreds.length) * 100 : 0
      });
    }
  }, [supabase]);

  const loadCsvMetrics = async (dsId: string) => {
    try {
      const { data: ds } = await supabase.from('datasets').select('storage_path').eq('id', dsId).single();
      if (!ds) return;

      const blobs = new Map<string, Blob>();
      const keysToLoad = ['customer_accounts', 'monthly_usage_metrics', 'billing_data'];

      for (const key of keysToLoad) {
        const { data: blob } = await supabase.storage.from('files').download(`${ds.storage_path}/${key}.csv`);
        if (blob) blobs.set(key, blob);
      }

      const metricsMap = new Map<string, CsvMetrics>();
      let localMaxUsage = 1;

      const parseCsv = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim());
        const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
            else if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { result.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else { current += char; }
          }
          result.push(current.trim().replace(/^"|"$/g, ''));
          return result;
        });
        return { header, rows };
      };

      const caBlob = blobs.get('customer_accounts');
      if (caBlob) {
        const { header, rows } = parseCsv(await caBlob.text());
        const idIdx = header.indexOf('customer_id');
        const userIdx = header.indexOf('total_users');
        const planIdx = header.indexOf('plan_type');
        const contractIdx = header.indexOf('contract_type');
        const subDateIdx = header.indexOf('subscription_date');

        if (idIdx !== -1) {
          rows.forEach(r => {
            const id = r[idIdx];
            const users = userIdx !== -1 ? (parseInt(r[userIdx]) || 0) : 0;
            const subDate = subDateIdx !== -1 ? r[subDateIdx] : undefined;
            const plan = planIdx !== -1 ? r[planIdx] : undefined;
            const contract = contractIdx !== -1 ? r[contractIdx] : undefined;

            metricsMap.set(id, {
              mrr: 0,
              total_users: users,
              usage_hrs: 0,
              subscribed_date: subDate,
              plan_type: plan,
              contract_type: contract
            });
          });
        }
      }

      const umBlob = blobs.get('monthly_usage_metrics');
      if (umBlob) {
        const { header, rows } = parseCsv(await umBlob.text());
        const idIdx = header.indexOf('customer_id');
        const usageIdx = header.indexOf('monthly_usage_hrs');
        if (idIdx !== -1 && usageIdx !== -1) {
          rows.forEach(r => {
            const id = r[idIdx];
            const usage = parseFloat(r[usageIdx]) || 0;
            if (usage > localMaxUsage) localMaxUsage = usage;
            const entry = metricsMap.get(id) || { mrr: 0, total_users: 0, usage_hrs: 0 };
            entry.usage_hrs = usage;
            metricsMap.set(id, entry);
          });
        }
      }

      const bdBlob = blobs.get('billing_data');
      if (bdBlob) {
        const { header, rows } = parseCsv(await bdBlob.text());
        const idIdx = header.indexOf('customer_id');
        const typeIdx = header.indexOf('record_type');
        const valIdx = header.indexOf('payment_value');
        if (idIdx !== -1 && valIdx !== -1) {
          rows.forEach(r => {
            const id = r[idIdx];
            const type = typeIdx !== -1 ? r[typeIdx] : 'payment';
            if (type.toLowerCase() === 'payment') {
              const val = parseFloat(r[valIdx]) || 0;
              const entry = metricsMap.get(id) || { mrr: 0, total_users: 0, usage_hrs: 0 };
              entry.mrr += val;
              metricsMap.set(id, entry);
            }
          });
        }
      }

      setCsvMetrics(metricsMap);
      setMaxUsage(localMaxUsage);
    } catch (err) {
      console.error('Error loading CSV metrics:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(r => r.customer_id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSendToChat = (customers: PredictionRow[]) => {
    if (customers.length === 0) return;
    setShareCustomers(customers);
  };

  const loadPage = useCallback(async (
    currentPage: number, searchVal: string, planVal: string, riskVal: string, dsId: string, pageSizeVal: number
  ) => {
    setLoading(true);
    const from = (currentPage - 1) * pageSizeVal;
    const to = from + pageSizeVal - 1;

    let query = supabase
      .from('predictions')
      .select('customer_id,plan_type,contract_type,churn_score,risk_level,segment_label,nlp_red_flag,loyalty_risk_flag', { count: 'exact' })
      .eq('dataset_id', dsId)
      .order('customer_id', { ascending: true })
      .range(from, to);

    if (planVal !== 'all') query = query.ilike('plan_type', planVal);
    if (riskVal !== 'all') query = query.ilike('risk_level', riskVal);
    if (searchVal.trim() !== '') {
      query = query.or(`customer_id.ilike.%${searchVal.trim()}%,plan_type.ilike.%${searchVal.trim()}%`);
    }

    const { data, count, error } = await query;
    if (error) console.error('Fetch predictions error:', error);
    if (!error && data) {
      const rawRows = data as PredictionRow[];
      const merged = rawRows.map(row => {
        const metrics = csvMetrics.get(row.customer_id);
        return {
          ...row,
          mrr: metrics?.mrr ?? 0,
          total_users: metrics?.total_users ?? 0,
          usage_hrs: metrics?.usage_hrs ?? 0,
          subscribed_date: metrics?.subscribed_date,
          plan_type: metrics?.plan_type ?? row.plan_type,
          contract_type: metrics?.contract_type ?? row.contract_type,
        };
      });
      setRows(merged);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [supabase, csvMetrics]);

  // 1. Initial Redirect & Analyze ID handle
  useEffect(() => {
    const aid = searchParams.get('analyze_id');
    if (aid) setAnalyzeId(aid);

    if (!datasetId && workspace) {
      async function findDefault() {
        setLoading(true);
        if (!workspace) return;
        const { data } = await supabase.from('datasets').select('id')
          .eq('workspace_id', workspace.id).eq('status', 'done')
          .order('created_at', { ascending: false }).limit(1);
        if (data && data.length > 0) {
          const dsId = data[0].id;
          router.replace(`/dashboard/analytics?dataset_id=${dsId}${aid ? `&analyze_id=${aid}` : ''}`);
        } else {
          setLoading(false);
        }
      }
      findDefault();
    }
  }, [datasetId, workspace, router, searchParams]);

  // 2. Load CSV Metrics & Summary when datasetId changes
  useEffect(() => {
    if (datasetId) {
      loadCsvMetrics(datasetId).then(() => {
        // We'll call summary calculation inside loadCsvMetrics's effect to ensure it has the map
      });
    }
  }, [datasetId]);

  useEffect(() => {
    if (datasetId && csvMetrics.size > 0) {
      loadSummaryStats(datasetId, csvMetrics);
    }
  }, [datasetId, csvMetrics.size, loadSummaryStats]);

  // 3. Load Page Data
  useEffect(() => {
    if (!datasetId) return;
    loadPage(page, search, plan, risk, datasetId, pageSize);
  }, [page, search, plan, risk, datasetId, pageSize, loadPage]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handlePlan = (v: string) => { setPlan(v); setPage(1); };
  const handleRisk = (v: string) => { setRisk(v); setPage(1); };
  const handlePageSizeChange = (v: number) => { setPageSize(v); setPage(1); };

  if (loading && !datasetId) {
    return (
      <DashboardLayout page="Customer Analytics">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <svg className="animate-spin text-gray-200" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  if (!datasetId) {
    return (
      <DashboardLayout page="Customer Analytics">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-2 shadow-sm">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-black mb-1">No Dataset Selected</h3>
            <p className="text-xs text-gray-400 max-w-[250px] mx-auto leading-relaxed">
              Please select a dataset from the Data Management page to view customer analytics.
            </p>
          </div>
          <a href="/dashboard/data-management" className="mt-2 inline-flex items-center justify-center h-9 px-4 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-colors shadow-sm">
            Go to Data Management
          </a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout page="Customer Analytics">
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total Customers"
          value={summaryStats.total.toLocaleString()}
          change="Total"
          changeSuffix="customer base"
          changePositive={true}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Avg. Churn Score"
          value={summaryStats.avgScore.toFixed(1)}
          change={`${summaryStats.avgScore > 50 ? 'Needs Attention' : 'Healthy'}`}
          changePositive={summaryStats.avgScore <= 50}
          changeSuffix="overall risk"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          }
          iconBg="bg-purple-50"
        />
        <StatCard
          label="High Risk Level"
          value={summaryStats.highRiskCount.toLocaleString()}
          change={`${summaryStats.highRiskPct.toFixed(1)}%`}
          changePositive={false}
          changeSuffix="of total"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
               <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
               <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          iconBg="bg-red-50"
        />
        <StatCard
          label="Revenue at Risk"
          value={`$${Math.round(summaryStats.revenueAtRisk).toLocaleString()}`}
          change="Urgent"
          changePositive={false}
          changeSuffix=""
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          iconBg="bg-amber-50"
        />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <SearchBar value={search} onChange={handleSearch} placeholder="Search by customer ID or plan..." className="w-72" />
        <AuthDropdown
          value={plan}
          onChange={handlePlan}
          className="w-44"
          placeholder="Filter Plan"
          variant="filter"
          options={[
            { label: 'All Plans', value: 'all' },
            { label: 'Enterprise', value: 'enterprise' },
            { label: 'Professional', value: 'professional' },
            { label: 'Starter', value: 'starter' },
          ]}
        />
        <AuthDropdown
          value={risk}
          onChange={handleRisk}
          className="w-44"
          placeholder="Filter Risk"
          variant="filter"
          options={[
            { label: 'All Risk', value: 'all' },
            { label: 'High', value: 'high' },
            { label: 'Medium', value: 'medium' },
            { label: 'Low', value: 'low' },
          ]}
        />
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full animate-in fade-in slide-in-from-left-2 transition-all">
            <span className="text-[11px] font-bold text-blue-600">{selectedIds.size} selected</span>
            <button
              onClick={() => handleSendToChat(rows.filter(r => selectedIds.has(r.customer_id)))}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0047AB] text-white rounded-full text-[10px] font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <SendIcon size={10} /> Send to Chat
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-blue-400 hover:text-blue-600 font-medium px-1">Clear</button>
          </div>
        )}
        {loading && (
          <svg className="animate-spin text-gray-400 ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        )}
      </div>

      <Card padding="none">
        <div className="min-h-[600px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer ID</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Subscribed Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Usage</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Segment</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Users</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Risk</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">MRR</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="w-4 h-4 rounded bg-gray-50 animate-pulse" /></td>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + ((i * 10 + j) % 4) * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-xs text-gray-400">No customers found</td></tr>
              ) : (
                rows.map(c => (
                  <tr key={c.customer_id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(c.customer_id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.customer_id)}
                        onChange={() => toggleSelectRow(c.customer_id)}
                        className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer align-middle"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-gray-600">{c.customer_id}</span>
                        {c.nlp_red_flag === 1 && (
                          <span title="Hidden Risk" className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        )}
                        {c.loyalty_risk_flag === 1 && (
                          <span title="Loyalty Risk" className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block w-fit capitalize ${planColors[c.plan_type] || 'bg-gray-100 text-gray-600'}`}>
                          {c.plan_type}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1 capitalize">{c.contract_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">
                        {c.subscribed_date ? new Date(c.subscribed_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-32">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-400 font-medium">{c.usage_hrs?.toFixed(1) ?? '0.0'} hrs</span>
                        </div>
                        <ProgressBar value={Math.min(100, (c.usage_hrs || 0) / (maxUsage || 1) * 100)} height="sm" color={c.risk_level === 'Low' ? 'green' : c.risk_level === 'High' ? 'red' : 'yellow'} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-gray-500 font-medium">{c.segment_label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{c.total_users ?? '0'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-black ${riskColors[c.risk_level]}`}>{c.churn_score}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={c.risk_level} variant={c.risk_level === 'Low' ? 'low' : c.risk_level === 'High' ? 'high' : 'med'} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-black">${c.mrr?.toLocaleString() ?? '0'}</span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center justify-start gap-2">
                        <Button size="sm" className="rounded-xl shadow-sm hover:translate-y-[-1px] transition-transform" onClick={() => setAnalyzeId(c.customer_id)}>
                          Analyze
                        </Button>
                        <button
                          onClick={() => handleSendToChat([c])}
                          className="w-8 h-8 flex items-center justify-center bg-[#0047AB] text-white rounded-xl hover:bg-blue-800 transition-all shadow-sm active:scale-95"
                          title="Send to chat"
                        >
                          <SendIcon size={14} />
                        </button>
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
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </Card>

      {analyzeId && datasetId && (
        <AnalyzeCustomerModal
          open={!!analyzeId}
          customerId={analyzeId}
          datasetId={datasetId}
          onClose={() => setAnalyzeId(null)}
        />
      )}

      {workspace && profile && (
        <SendToChatModal
          open={!!shareCustomers}
          onClose={() => setShareCustomers(null)}
          customers={shareCustomers || []}
          workspaceId={workspace.id}
          userId={profile.id}
          members={members}
          maxUsage={maxUsage}
        />
      )}
    </DashboardLayout>
  );
}

export default function AnalyticsPage() {
  return (
    <PermissionGate permission="view_analytics">
      <AnalyticsPageContent />
    </PermissionGate>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
function SendIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
