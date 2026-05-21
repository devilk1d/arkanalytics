'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboardContext } from '../../context/DashboardContext';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import StatCard from '../../ui/StatCard';
import { SendToChatModal } from './ActionModals';
import { AnalyzeCustomerModal } from './AnalyzeCustomerModal';
import { createClient } from '@/lib/supabase/client';
import PermissionGate from '../../ui/PermissionGate';
import { normalizeSegmentLabel } from '../segmentation/SegmentationPage';

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
  const [tableLoading, setTableLoading] = useState(true);
  
  // Local state for search to keep typing responsive
  const [search, setSearch] = useState('');
  
  // Read other filters directly from URL search parameters to avoid full page reload
  const plan = searchParams.get('plan') || 'all';
  const risk = searchParams.get('risk') || 'all';
  const segment = searchParams.get('segment') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const [segmentOptions, setSegmentOptions] = useState<{label: string, value: string}[]>([]);
  const [csvMetrics, setCsvMetrics] = useState<Map<string, CsvMetrics>>(new Map());
  const [maxUsage, setMaxUsage] = useState(1);

  // Helper to update search params and trigger table-only reload
  const updateQueryParams = useCallback((newParams: Record<string, string | number | undefined>) => {
    if (!datasetId) return;
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === 'all' || val === '') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    
    // Auto reset page to 1 if we are changing filters other than page/pageSize
    const hasFilterChange = Object.keys(newParams).some(k => k !== 'page' && k !== 'pageSize');
    if (hasFilterChange) {
      params.delete('page');
    }
    
    router.replace(`/dashboard/analytics?${params.toString()}`);
  }, [router, searchParams, datasetId]);

  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [shareCustomers, setShareCustomers] = useState<PredictionRow[] | null>(null);

  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    avgScore: 0,
    highRiskCount: 0,
    revenueAtRisk: 0,
    highRiskPct: 0
  });

  const [churnDist, setChurnDist] = useState<{ label: string; value: number; color: string }[]>([]);
  const [churnDrivers, setChurnDrivers] = useState<{ label: string; value: number; color: string }[]>([]);

  const loadChartsData = useCallback(async (dsId: string) => {
    const { data, error } = await supabase
      .from('predictions')
      .select('churn_score, risk_level, shap_top5')
      .eq('dataset_id', dsId);
      
    if (error || !data) {
      console.error('Error loading charts data:', error);
      return;
    }
    
    // Calculate Churn Score Distribution (10 bins)
    const bins = [
      { label: '0.0-0.1', value: 0, color: 'var(--g)' },
      { label: '0.1-0.2', value: 0, color: 'var(--g)' },
      { label: '0.2-0.3', value: 0, color: 'var(--g)' },
      { label: '0.3-0.4', value: 0, color: 'var(--g)' },
      { label: '0.4-0.5', value: 0, color: 'var(--o)' },
      { label: '0.5-0.6', value: 0, color: 'var(--o)' },
      { label: '0.6-0.7', value: 0, color: 'var(--o)' },
      { label: '0.7-0.8', value: 0, color: 'var(--r)' },
      { label: '0.8-0.9', value: 0, color: 'var(--r)' },
      { label: '0.9-1.0', value: 0, color: 'var(--r)' }
    ];
    
    const driversMap = new Map<string, { cumulativeImportance: number; count: number }>();
    
    data.forEach((p: any) => {
      const score = p.churn_score || 0;
      const binIndex = Math.min(9, Math.floor(score / 10));
      bins[binIndex].value++;
      
      const shap = p.shap_top5;
      if (Array.isArray(shap)) {
        shap.forEach((factor: any) => {
          const label = factor.feature_label || factor.feature;
          if (!label) return;
          const entry = driversMap.get(label) || { cumulativeImportance: 0, count: 0 };
          entry.cumulativeImportance += factor.importance || 0;
          entry.count++;
          driversMap.set(label, entry);
        });
      }
    });
    
    setChurnDist(bins);
    
    const compiledDrivers = Array.from(driversMap.entries()).map(([label, dData]) => {
      const avgImportance = dData.cumulativeImportance / dData.count;
      let color = 'var(--p)';
      if (avgImportance > 0.3) color = 'var(--r)';
      else if (avgImportance > 0.2) color = 'var(--o)';
      
      return {
        label,
        value: Math.round(avgImportance * 100) / 100,
        color
      };
    }).sort((a, b) => b.value - a.value).slice(0, 6);
    
    const finalDrivers = compiledDrivers.length > 0 ? compiledDrivers : [
      { label: 'Usage decline', value: 0.42, color: 'var(--r)' },
      { label: 'Support tickets', value: 0.31, color: 'var(--r)' },
      { label: 'Login frequency', value: 0.28, color: 'var(--o)' },
      { label: 'Contract age', value: 0.21, color: 'var(--o)' },
      { label: 'NPS score', value: 0.18, color: 'var(--p)' },
      { label: 'Plan downgrade', value: 0.14, color: 'var(--p)' }
    ];
    
    setChurnDrivers(finalDrivers);
  }, [supabase]);

  const loadSummaryStats = useCallback(async (dsId: string) => {
    // Optimized: Fetch from segments table which has pre-calculated aggregates
    const { data: segData, error: segErr } = await supabase
      .from('segments')
      .select('segment_label, total_customers, avg_churn_score, avg_revenue, pct_high_risk')
      .eq('dataset_id', dsId);

    if (segErr || !segData) {
      // Fallback to basic count if segments not ready
      const { count } = await supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dsId);
      setSummaryStats(prev => ({ ...prev, total: count || 0 }));
      return;
    }

    let total = 0;
    let totalScoreWeighted = 0;
    let hrCount = 0;
    let hrRev = 0;
    const options: {label: string, value: string}[] = [];

    segData.forEach(s => {
      if (s.segment_label) {
        options.push({ label: normalizeSegmentLabel(s.segment_label), value: s.segment_label });
      }
      const count = s.total_customers || 0;
      total += count;
      totalScoreWeighted += (s.avg_churn_score || 0) * count;
      
      // Calculate high risk and revenue at risk from segment metrics
      if (s.pct_high_risk > 0) {
        const highRiskInSegment = Math.round((s.pct_high_risk / 100) * count);
        hrCount += highRiskInSegment;
        hrRev += (s.avg_revenue || 0) * highRiskInSegment;
      }
    });

    setSummaryStats({
      total,
      avgScore: total > 0 ? totalScoreWeighted / total : 0,
      highRiskCount: hrCount,
      revenueAtRisk: hrRev,
      highRiskPct: total > 0 ? (hrCount / total) * 100 : 0
    });
    setSegmentOptions(options);
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
    currentPage: number, searchVal: string, planVal: string, riskVal: string, segmentVal: string, dsId: string, pageSizeVal: number
  ) => {
    setTableLoading(true);
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
    if (segmentVal !== 'all') query = query.eq('segment_label', segmentVal);
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
    setTableLoading(false);
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
          const params = new URLSearchParams(searchParams.toString());
          params.set('dataset_id', dsId);
          if (aid) params.set('analyze_id', aid);
          router.replace(`/dashboard/analytics?${params.toString()}`);
        } else {
          setLoading(false);
        }
      }
      findDefault();
    }
  }, [datasetId, workspace, router, searchParams]);

  // Sync search input with URL query 'q' on load or URL update
  useEffect(() => {
    setSearch(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    if (datasetId) {
      setLoading(true);
      loadCsvMetrics(datasetId);
      loadSummaryStats(datasetId);
      loadChartsData(datasetId);
    }
  }, [datasetId, loadSummaryStats, loadChartsData]);

  // 3. Load Page Data
  useEffect(() => {
    if (!datasetId) return;
    loadPage(page, search, plan, risk, segment, datasetId, pageSize);
  }, [page, search, plan, risk, segment, datasetId, pageSize, loadPage]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const handleSearch = (v: string) => { setSearch(v); updateQueryParams({ page: 1 }); };

  if (loading && !datasetId) {
    return (
      <DashboardLayout page="Customer Analytics">
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
      <div className="fade-in">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[var(--b)] pb-5">
          <div>
            <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.14em] mb-1">
              Workspace · {workspace?.name || 'Arkanalytics'}
            </p>
            <h1 className="font-display text-2xl font-black text-[var(--t)] leading-tight tracking-tight">
              Customer Analytics
            </h1>
            <p className="text-[12px] text-[var(--t3)] mt-1 max-w-xl">
              Deep-dive metrics on customer health, risk categorization, segment clusters, and dynamic machine learning predictions.
            </p>
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Customers analyzed"
          value={loading ? '...' : summaryStats.total.toLocaleString('en-US')}
          change="Total"
          changeSuffix="customer base"
          changePositive={true}
          accentColor="#3b82f6"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="High Risk"
          value={loading ? '...' : summaryStats.highRiskCount.toLocaleString('en-US')}
          change={`${summaryStats.highRiskPct.toFixed(1)}%`}
          changePositive={false}
          changeSuffix="of total"
          accentColor="var(--r)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--r)]">
               <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
               <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <StatCard
          label="Avg Churn Score"
          value={loading ? '...' : (summaryStats.avgScore / 100).toFixed(3)}
          change={`${summaryStats.avgScore > 50 ? 'Needs Attention' : 'Healthy'}`}
          changePositive={summaryStats.avgScore <= 50}
          changeSuffix="overall risk"
          accentColor="#a855f7"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          label="Revenue at Risk"
          value={loading ? '...' : `$${Math.round(summaryStats.revenueAtRisk).toLocaleString('en-US')}`}
          change="Estimated"
          changePositive={false}
          changeSuffix="high-risk MRR"
          accentColor="var(--o)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-7 flex flex-col">
          <Card className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--t)]">Churn score distribution</h3>
                <p className="text-[11px] text-[var(--t3)]">Probability bins · all customers</p>
              </div>
              <div className="flex gap-3 text-[10px] font-semibold text-[var(--t3)] uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-full bg-[var(--g)]"></span>Low</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-full bg-[var(--o)]"></span>Med</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-full bg-[var(--r)]"></span>High</span>
              </div>
            </div>
            {loading ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-[var(--t3)]">
                Loading distribution...
              </div>
            ) : (
              <BarChart data={churnDist} height={240} />
            )}
          </Card>
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <Card className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--t)]">Top churn drivers</h3>
                <p className="text-[11px] text-[var(--t3)]">Feature importance · SHAP</p>
              </div>
            </div>
            {loading ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-[var(--t3)]">
                Loading drivers...
              </div>
            ) : (
              <BarChart horizontal data={churnDrivers} height={240} />
            )}
          </Card>
        </div>
      </div>

      {/* ── Customer Roster Card ── */}
      <Card padding="none">
        {/* Card Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--b)]">
          <div>
            <div className="text-sm font-bold text-[var(--t)]">Customer roster</div>
            <div className="text-[11px] text-[var(--t3)] font-mono mt-0.5">
              {tableLoading ? 'Loading...' : `${totalCount} customer${totalCount !== 1 ? 's' : ''} found`}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-40">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search ID..."
                className="h-8 w-full pl-8 pr-3 text-[11px] font-medium text-[var(--t2)] bg-[var(--bg1)] border border-[var(--b)] rounded-lg outline-none focus:border-[var(--t)] hover:border-[var(--t3)] transition-colors placeholder-gray-400"
              />
            </div>
            {/* Risk dropdown */}
            <select
              value={risk}
              onChange={e => updateQueryParams({ risk: e.target.value })}
              className="h-8 px-2.5 pr-7 text-[11px] font-medium text-[var(--t2)] bg-[var(--bg1)] border border-[var(--b)] rounded-lg appearance-none cursor-pointer hover:border-[var(--t3)] focus:outline-none focus:border-[var(--t)] transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center' }}
            >
              <option value="all">All risks</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {/* Plan dropdown */}
            <select
              value={plan}
              onChange={e => updateQueryParams({ plan: e.target.value })}
              className="h-8 px-2.5 pr-7 text-[11px] font-medium text-[var(--t2)] bg-[var(--bg1)] border border-[var(--b)] rounded-lg appearance-none cursor-pointer hover:border-[var(--t3)] focus:outline-none focus:border-[var(--t)] transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center' }}
            >
              <option value="all">All plans</option>
              <option value="enterprise">Enterprise</option>
              <option value="professional">Professional</option>
              <option value="starter">Starter</option>
            </select>
            {/* Segment dropdown */}
            <select
              value={segment}
              onChange={e => updateQueryParams({ segment: e.target.value })}
              className="h-8 px-2.5 pr-7 text-[11px] font-medium text-[var(--t2)] bg-[var(--bg1)] border border-[var(--b)] rounded-lg appearance-none cursor-pointer hover:border-[var(--t3)] focus:outline-none focus:border-[var(--t)] transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center' }}
            >
              <option value="all">All segments</option>
              {segmentOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {tableLoading && (
              <svg className="animate-spin text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            )}
          </div>
        </div>

        {/* Selection bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--bg1)] border-b border-[var(--b)]">
            <span className="text-[11px] font-mono text-[var(--t2)]">{selectedIds.size} selected</span>
            <button
              onClick={() => handleSendToChat(rows.filter(r => selectedIds.has(r.customer_id)))}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold bg-[var(--bg2)] border border-[var(--b)] text-[var(--t)] hover:bg-[var(--bg3)] transition-colors"
            >
              <SendIcon size={11} /> Send to chat
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-[11px] text-[var(--t3)] hover:text-[var(--t)] font-medium">Clear</button>
          </div>
        )}

        {/* Table */}
        <div className="min-h-[400px] overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--b)]">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[var(--b)] accent-[var(--t)] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Customer</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Plan</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">MRR</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Usage hrs</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Score</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Risk</th>
                <th className="px-4 py-3 w-48 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Segment</th>
                <th className="px-4 py-3 w-28 text-left text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--b)]/50">
              {tableLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="w-4 h-4 rounded bg-[var(--bg2)] animate-pulse" /></td>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-[var(--bg3)] rounded animate-pulse" style={{ width: `${60 + ((i * 10 + j) % 4) * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-xs text-[var(--t3)]">No customer predictions found matching the filters.</td></tr>
              ) : (
                rows.map(c => (
                  <tr key={c.customer_id} className={`cursor-pointer transition-colors hover:bg-[var(--bg1)] ${selectedIds.has(c.customer_id) ? 'bg-[var(--bg1)]' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.customer_id)}
                        onChange={() => toggleSelectRow(c.customer_id)}
                        className="w-4 h-4 rounded border-[var(--b)] accent-[var(--t)] cursor-pointer align-middle"
                        style={{ accentColor: 'var(--t)' }}
                      />
                    </td>
                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, background: 'var(--bg2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--t)',
                          border: '1px solid var(--b)', flexShrink: 0
                        }}>
                          {c.customer_id.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-[12px] text-[var(--t)]">{c.customer_id}</div>
                          <div className="flex gap-1 mt-0.5">
                            {c.nlp_red_flag === 1 && <span title="Hidden Risk" className="w-1.5 h-1.5 rounded-full bg-[var(--o)] inline-block self-center" />}
                            {c.loyalty_risk_flag === 1 && <span title="Loyalty Risk" className="w-1.5 h-1.5 rounded-full bg-[var(--p)] inline-block self-center" />}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Plan */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-semibold border border-[var(--b)] bg-[var(--bg2)] text-[var(--t)]">
                          {c.plan_type ? c.plan_type.charAt(0).toUpperCase() + c.plan_type.slice(1).toLowerCase() : '—'}
                        </span>
                        <span className="text-[10px] text-[var(--t2)] font-mono capitalize leading-none">{c.contract_type || '—'}</span>
                      </div>
                    </td>
                    {/* MRR */}
                    <td className="px-4 py-3 font-mono text-xs text-[var(--t)]">${c.mrr?.toLocaleString('en-US') ?? '0'}</td>
                    {/* Usage */}
                    <td className="px-4 py-3 font-mono text-xs text-[var(--t)]">{c.usage_hrs?.toFixed(0) ?? '0'}h</td>
                    {/* Score */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 56, height: 4, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{
                            height: '100%',
                            width: `${c.churn_score}%`,
                            background: c.risk_level === 'High' ? 'var(--r)' : c.risk_level === 'Medium' ? 'var(--o)' : 'var(--g)',
                            borderRadius: 4
                          }} />
                        </div>
                        <span className="font-mono text-[11px] text-[var(--t)]">{(c.churn_score / 100).toFixed(2)}</span>
                      </div>
                    </td>
                    {/* Risk */}
                    <td className="px-4 py-3">
                      <Badge label={c.risk_level} variant={c.risk_level === 'Low' ? 'low' : c.risk_level === 'High' ? 'high' : 'med'} />
                    </td>
                    {/* Segment */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-[var(--t)]">{normalizeSegmentLabel(c.segment_label)}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-start gap-1.5">
                        <button
                          onClick={() => setAnalyzeId(c.customer_id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--t2)] hover:text-blue-500 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-all border border-transparent hover:border-blue-500/20"
                          title="Analyze Customer"
                        >
                          <AnalyzeIcon size={14} />
                        </button>
                        <button
                          onClick={() => handleSendToChat([c])}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--t2)] hover:text-purple-500 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 transition-all border border-transparent hover:border-purple-500/20"
                          title="Share to Chat"
                        >
                          <SendIcon size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Inline Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--b)] text-[11px] text-[var(--t3)] font-mono">
          <span>
            Showing {loading ? '...' : totalCount === 0 ? 0 : `${(page - 1) * pageSize + 1}–${Math.min(totalCount, page * pageSize)}`} of {loading ? '...' : totalCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1 || loading}
              onClick={() => updateQueryParams({ page: Math.max(1, page - 1) })}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeftIcon size={13} />
            </button>
            {!loading && (() => {
              const total = totalPages;
              const current = page;
              let pages: (number | string)[];
              if (total <= 5) {
                pages = Array.from({ length: total }, (_, i) => i + 1);
              } else if (current <= 3) {
                pages = [1, 2, 3, 4, '...', total];
              } else if (current >= total - 2) {
                pages = [1, '...', total - 3, total - 2, total - 1, total];
              } else {
                pages = [1, '...', current - 1, current, current + 1, '...', total];
              }
              return pages.map((p, idx) =>
                p === '...' ? (
                  <span key={idx} className="px-1.5 self-center">…</span>
                ) : (
                  <button
                    key={idx}
                    onClick={() => updateQueryParams({ page: p as number })}
                    className={`h-7 min-w-[28px] px-1.5 rounded-lg border text-[11px] transition-all ${
                      page === p
                        ? 'bg-[var(--t)] text-[var(--inv-t)] border-[var(--t)]'
                        : 'border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'
                    }`}
                  >
                    {p}
                  </button>
                )
              );
            })()}
            <button
              disabled={page === totalPages || loading}
              onClick={() => updateQueryParams({ page: Math.min(totalPages, page + 1) })}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRightIcon size={13} />
            </button>
          </div>
        </div>
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
      </div>
    </DashboardLayout>
  );
}

export default function AnalyticsPage() {
  return (
    <PermissionGate permission="view_analytics">
      <Suspense fallback={
        <DashboardLayout page="Customer Analytics">
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <svg className="animate-spin text-[var(--b3)]" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        </DashboardLayout>
      }>
        <AnalyticsPageContent />
      </Suspense>
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

function AnalyzeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── SVG Bar chart ────────────────────────────────────────────────────
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  color?: string;
  horizontal?: boolean;
}

function BarChart({ data, height = 220, color = "var(--p)", horizontal = false }: BarChartProps) {
  const w = 700;
  const pad = { l: horizontal ? 120 : 40, r: 16, t: 12, b: 28 };
  const max = Math.max(...data.map(d => d.value), 1);
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  if (horizontal) {
    const rowH = innerH / (data.length || 1);
    const barH = Math.min(rowH - 6, 22);
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} className="overflow-visible">
        {data.map((d, i) => {
          const y = pad.t + i * rowH + (rowH - barH) / 2;
          const bw = (d.value / max) * innerW;
          return (
            <g key={i}>
              <text x={pad.l - 8} y={y + barH/2 + 3} fontSize="10" fill="var(--t2)" textAnchor="end" fontFamily="var(--font-sans)" className="fill-[var(--t2)]">{d.label}</text>
              <rect x={pad.l} y={y} width={innerW} height={barH} fill="var(--bg2)" className="fill-[var(--b)]" rx="2" />
              <rect x={pad.l} y={y} width={bw} height={barH} fill={d.color || color} rx="2" />
              <text x={pad.l + bw + 6} y={y + barH/2 + 3} fontSize="10" fill="var(--t2)" fontFamily="var(--font-mono)" className="fill-[var(--t2)]">{d.value.toLocaleString()}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  const step = innerW / (data.length || 1);
  const barW = step * 0.6;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} className="overflow-visible">
      {[0, 0.5, 1].map((t, i) => (
        <line key={i} x1={pad.l} x2={w-pad.r} y1={pad.t + innerH - t * innerH} y2={pad.t + innerH - t * innerH} stroke="var(--b)" strokeDasharray={t === 0 ? "" : "2 4"} className="stroke-[var(--b)]" />
      ))}
      {data.map((d, i) => {
        const x = pad.l + i * step + (step - barW) / 2;
        const bh = (d.value / max) * innerH;
        const y = pad.t + innerH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={d.color || color} rx="2" />
            <text x={x + barW/2} y={pad.t + innerH + 14} fontSize="9" fill="var(--t4)" textAnchor="middle" fontFamily="var(--font-mono)" className="fill-[var(--t4)]">{d.label}</text>
            <text x={x + barW/2} y={y - 4} fontSize="9" fill="var(--t2)" textAnchor="middle" fontFamily="var(--font-mono)" className="fill-[var(--t2)]">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MoreIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function ChevronLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
