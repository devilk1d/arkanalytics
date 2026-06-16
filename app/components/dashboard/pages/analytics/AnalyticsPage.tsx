'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboardContext } from '../../context/DashboardContext';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import StatCard from '../../ui/StatCard';
import { SendToChatModal } from './ActionModals';
import { AnalyzeCustomerModal } from './AnalyzeCustomerModal';
import { createClient } from '@/lib/supabase/client';
import PermissionGate from '../../ui/PermissionGate';
import FilterDropdown from '../../ui/FilterDropdown';
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
  const displayParam = searchParams.get('d');
  const legacyUuid   = searchParams.get('dataset_id'); // backward compat for old links
  const { workspace, profile, members, activeDataset } = useDashboardContext();
  const supabase = createClient();

  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);

  // Transient state — local only, never reflected in the URL.
  // Keeping these out of the URL prevents router.replace from firing on every
  // keystroke / page click, which is what caused the full-page re-render and
  // the scroll-to-top on filter change.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Persistent filter state — lives in the URL so that sharing / back-nav works.
  const plan    = searchParams.get('plan')    || 'all';
  const risk    = searchParams.get('risk')    || 'all';
  const segment = searchParams.get('segment') || 'all';
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const [segmentOptions, setSegmentOptions] = useState<{label: string, value: string}[]>([]);
  const [csvMetrics, setCsvMetrics] = useState<Map<string, CsvMetrics>>(new Map());
  const [maxUsage, setMaxUsage] = useState(1);

  // Update only persistent URL filter params (plan / risk / segment / pageSize).
  // scroll:false prevents the browser from jumping to the top on every filter change.
  // Page is always reset to 1 locally — never written to the URL.
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

    setPage(1);
    router.replace(`/dashboard/analytics?${params.toString()}`, { scroll: false });
  }, [router, searchParams, datasetId]);

  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [shareCustomers, setShareCustomers] = useState<PredictionRow[] | null>(null);

  // ── Scroll-collapse for charts ────────────────────────────────────────────
  // Collapses after the user scrolls DOWN past 280 px.
  // Re-expands only after a continuous upward drag of ≥ 60 px,
  // preventing accidental flickers on small scroll jitter.
  const [chartsCollapsed, setChartsCollapsed] = useState(false);
  useEffect(() => {
    const COLLAPSE_AT_PX  = 280; // minimum scrollY before collapse is allowed
    const EXPAND_DRAG_PX  = 60;  // continuous upward scroll needed to re-expand
    let lastY = 0;
    let upAccum = 0;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      if (delta > 0) {
        // scrolling down — reset upward accumulator
        upAccum = 0;
        if (y > COLLAPSE_AT_PX) setChartsCollapsed(true);
      } else if (delta < 0) {
        // scrolling up — accumulate distance
        upAccum += Math.abs(delta);
        if (upAccum >= EXPAND_DRAG_PX) setChartsCollapsed(false);
      }

      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    
    // Fallback labels for technical ML terms that may exist in older stored predictions
    const LABEL_FALLBACK: Record<string, string> = {
      'Contract Enc':  'Contract Type',
      'Plan Enc':      'Subscription Plan',
      'Tenure Days':   'Account Tenure',
      'Topic 0':       'Feedback Topic Signal',
      'Topic 1':       'Feedback Topic Signal',
      'Topic 2':       'Feedback Topic Signal',
      'Topic 3':       'Feedback Topic Signal',
      'Topic 4':       'Feedback Topic Signal',
    };

    // Churn Score Distribution — histogram with 10 percentage-point bins
    const bins = [
      { label: '0–10%',   value: 0, color: 'var(--g)' },
      { label: '10–20%',  value: 0, color: 'var(--g)' },
      { label: '20–30%',  value: 0, color: 'var(--g)' },
      { label: '30–40%',  value: 0, color: 'var(--g)' },
      { label: '40–50%',  value: 0, color: 'var(--o)' },
      { label: '50–60%',  value: 0, color: 'var(--o)' },
      { label: '60–70%',  value: 0, color: 'var(--o)' },
      { label: '70–80%',  value: 0, color: 'var(--r)' },
      { label: '80–90%',  value: 0, color: 'var(--r)' },
      { label: '90–100%', value: 0, color: 'var(--r)' },
    ];

    // Track per-feature: total importance + how often it raises vs lowers risk
    const driversMap = new Map<string, { cumulativeImportance: number; count: number; raisesCount: number }>();

    data.forEach((p: any) => {
      const score = p.churn_score || 0;
      const binIndex = Math.min(9, Math.floor(score / 10));
      bins[binIndex].value++;

      const shap = p.shap_top5;
      if (Array.isArray(shap)) {
        shap.forEach((factor: any) => {
          const rawLabel = factor.feature_label || factor.feature;
          if (!rawLabel) return;
          const label = LABEL_FALLBACK[rawLabel] || rawLabel;
          const entry = driversMap.get(label) || { cumulativeImportance: 0, count: 0, raisesCount: 0 };
          // importance is always the absolute SHAP value
          entry.cumulativeImportance += factor.importance ?? Math.abs(factor.impact_score ?? 0);
          entry.count++;
          // direction from stored field, fallback to sign of impact_score
          const raises = factor.direction === 'raises_risk'
            || factor.direction === 'increases_churn'
            || (!factor.direction && (factor.impact_score ?? 0) > 0);
          if (raises) entry.raisesCount++;
          driversMap.set(label, entry);
        });
      }
    });

    setChurnDist(bins);

    const compiledDrivers = Array.from(driversMap.entries()).map(([label, dData]) => {
      const avgImportance = dData.cumulativeImportance / dData.count;
      // Color by predominant direction: red = mostly raises risk, green = mostly lowers risk
      const predominantlyRaises = dData.raisesCount >= dData.count * 0.5;
      const color = predominantlyRaises ? 'var(--r)' : 'var(--g)';
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

  // 1. Initial Redirect, UUID resolution & dataset list
  useEffect(() => {
    const aid = searchParams.get('analyze_id');
    if (aid) setAnalyzeId(aid);
    if (!workspace) return;

    async function init() {
      // Legacy URL: ?dataset_id=UUID → redirect to clean ?d=display_id
      if (!displayParam && legacyUuid) {
        const { data: ds } = await supabase.from('datasets')
          .select('id, display_id').eq('id', legacyUuid).single();
        if (ds) {
          const params = new URLSearchParams(searchParams.toString());
          params.set('d', ds.display_id ?? ds.id);
          params.delete('dataset_id');
          if (aid) params.set('analyze_id', aid);
          router.replace(`/dashboard/analytics?${params.toString()}`);
        } else {
          setLoading(false);
        }
        return;
      }

      if (!displayParam) {
        // Use context's active dataset if available (respects sidebar switcher selection)
        if (activeDataset?.displayId) {
          setLoading(true);
          const params = new URLSearchParams(searchParams.toString());
          params.set('d', activeDataset.displayId);
          if (aid) params.set('analyze_id', aid);
          router.replace(`/dashboard/analytics?${params.toString()}`);
          return;
        }
        // Fallback: query DB for latest
        const { data: all } = await supabase.from('datasets')
          .select('id, display_id')
          .eq('workspace_id', workspace!.id).eq('status', 'done')
          .order('created_at', { ascending: false }).limit(1);
        if (all && all.length > 0) {
          setLoading(true);
          const params = new URLSearchParams(searchParams.toString());
          params.set('d', all[0].display_id ?? all[0].id);
          if (aid) params.set('analyze_id', aid);
          router.replace(`/dashboard/analytics?${params.toString()}`);
        } else {
          setLoading(false);
        }
        return;
      }

      // Resolve display_id → internal UUID for all queries
      const { data: ds } = await supabase.from('datasets')
        .select('id').eq('display_id', displayParam).single();
      if (ds) {
        setDatasetId(ds.id);
      } else {
        setLoading(false);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayParam, legacyUuid, workspace?.id]);

  useEffect(() => {
    if (datasetId) {
      setLoading(true);
      loadCsvMetrics(datasetId);
      loadSummaryStats(datasetId);
      loadChartsData(datasetId);
    }
  }, [datasetId, loadSummaryStats, loadChartsData]);

  // Debounce search — fires 300 ms after the user stops typing so the table
  // doesn't reload on every keystroke. Page is reset inside the same batch.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // 3. Load Page Data — re-runs whenever any of the local/URL filter state changes.
  useEffect(() => {
    if (!datasetId) return;
    loadPage(page, debouncedSearch, plan, risk, segment, datasetId, pageSize);
  }, [page, debouncedSearch, plan, risk, segment, datasetId, pageSize, loadPage]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Search: update local state only — debounce effect handles the fetch.
  const handleSearch = (v: string) => setSearch(v);

  if (loading && !datasetId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <svg className="animate-spin text-[var(--b3)]" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
    );
  }

  if (!datasetId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg2)] border border-[var(--b)] flex items-center justify-center mb-2 shadow-sm">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-[var(--t)] mb-1">No Dataset Selected</h3>
          <p className="text-xs text-[var(--t3)] max-w-[250px] mx-auto leading-relaxed">
            Please select a dataset from the Data Management page to view customer analytics.
          </p>
        </div>
        <a href="/dashboard/data-management" className="mt-2 inline-flex items-center justify-center h-9 px-4 rounded-xl bg-[var(--t)] text-[var(--inv-t)] text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm">
          Go to Data Management
        </a>
      </div>
    );
  }

  return (
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
          changeNeutral={true}
        />
        <StatCard
          label="High Risk"
          value={loading ? '...' : summaryStats.highRiskCount.toLocaleString('en-US')}
          change={`${summaryStats.highRiskPct.toFixed(1)}%`}
          changePositive={false}
          changeSuffix="of total"
        />
        <StatCard
          label="Avg Churn Score"
          value={loading ? '...' : `${summaryStats.avgScore.toFixed(1)}%`}
          change={`${summaryStats.avgScore > 50 ? 'Needs Attention' : 'Healthy'}`}
          changePositive={summaryStats.avgScore <= 50}
          changeSuffix="overall risk"
        />
        <StatCard
          label="Revenue at Risk"
          value={loading ? '...' : `$${Math.round(summaryStats.revenueAtRisk).toLocaleString('en-US')}`}
          change="Estimated"
          changePositive={false}
          changeSuffix="high-risk MRR"
        />
      </div>

      {/* ── Charts Grid — collapses on scroll-down, expands on scroll-up ── */}
      <div
        className="overflow-hidden transition-[max-height,opacity,margin] duration-500 ease-in-out"
        style={{ maxHeight: chartsCollapsed ? 0 : 420, opacity: chartsCollapsed ? 0 : 1, marginBottom: chartsCollapsed ? 0 : 16 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ── Churn Score Distribution ── */}
          <div className="lg:col-span-7 flex flex-col">
            <Card className="flex-1 !p-0 overflow-hidden">
              {/* card header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--b)]">
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--t)] leading-tight">Churn score distribution</h3>
                  <p className="text-[11px] text-[var(--t3)] font-mono mt-0.5">% churn risk · customer count per band</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--g)' }} />Low
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--o)' }} />Med
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--r)' }} />High
                  </span>
                </div>
              </div>
              <div className="px-4 pt-3 pb-4">
                {loading ? (
                  <div className="h-[210px] flex items-center justify-center text-xs text-[var(--t3)] font-mono">
                    Loading distribution...
                  </div>
                ) : (
                  <BarChart data={churnDist} height={280} uid="dist" />
                )}
              </div>
            </Card>
          </div>

          {/* ── Top Churn Drivers ── */}
          <div className="lg:col-span-5 flex flex-col">
            <Card className="flex-1 !p-0 overflow-hidden">
              {/* card header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--b)]">
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--t)] leading-tight">Top churn drivers</h3>
                  <p className="text-[11px] text-[var(--t3)] font-mono mt-0.5">Signal strength · top 6 features</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--r)' }} />Risk ↑
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--g)' }} />Risk ↓
                  </span>
                </div>
              </div>
              <div className="px-4 pt-3 pb-4">
                {loading ? (
                  <div className="h-[210px] flex items-center justify-center text-xs text-[var(--t3)] font-mono">
                    Loading drivers...
                  </div>
                ) : (
                  <BarChart horizontal data={churnDrivers} height={280} uid="drv" />
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Collapsed strip ── */}
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{ maxHeight: chartsCollapsed ? 40 : 0, opacity: chartsCollapsed ? 1 : 0 }}
      >
        <button
          onClick={() => setChartsCollapsed(false)}
          className="w-full mb-4 flex items-center justify-center gap-2 py-2 text-[11px] font-mono font-bold text-[var(--t3)] bg-[var(--surf)] border border-[var(--b)] rounded-xl hover:text-[var(--t)] hover:border-[var(--b3)] transition-all"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          Charts collapsed · scroll up or click to expand
        </button>
      </div>

      {/* ── Customer Roster Card ── */}
      <Card padding="none">
        {/* Card Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--b)]">
          <div>
            <div className="text-sm font-bold text-[var(--t)]">Customer Data</div>
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
            <FilterDropdown
              options={[
                { label: 'All risks', value: 'all' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' }
              ]}
              value={risk}
              onChange={(value) => updateQueryParams({ risk: value })}
              placeholder="All risks"
              size="sm"
              showIcon={true}
            />
            {/* Plan dropdown */}
            <FilterDropdown
              options={[
                { label: 'All plans', value: 'all' },
                { label: 'Enterprise', value: 'enterprise' },
                { label: 'Professional', value: 'professional' },
                { label: 'Starter', value: 'starter' }
              ]}
              value={plan}
              onChange={(value) => updateQueryParams({ plan: value })}
              placeholder="All plans"
              size="sm"
              showIcon={true}
            />
            {/* Segment dropdown */}
            <FilterDropdown
              options={[
                { label: 'All segments', value: 'all' },
                ...segmentOptions
              ]}
              value={segment}
              onChange={(value) => updateQueryParams({ segment: value })}
              placeholder="All segments"
              size="sm"
              showIcon={true}
            />
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

        {/* Table — minHeight is locked to pageSize rows so the container never
            shrinks during search / filter / pagination loading. */}
        <div className="overflow-x-auto" style={{ minHeight: `${pageSize * 57 + 44}px` }}>
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
            {/* When rows already exist and we're reloading (search/filter/page),
                keep the current rows visible at reduced opacity instead of
                replacing them with skeletons — this prevents height jumps. */}
            <tbody className={`divide-y divide-[var(--b)]/50 transition-opacity duration-150 ${tableLoading && rows.length > 0 ? 'opacity-40 pointer-events-none' : ''}`}>
              {tableLoading && rows.length === 0 ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} style={{ height: 57 }}>
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
                        <Badge
                          label={c.plan_type ?? '—'}
                          variant="plan"
                        />
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
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg2)] border border-transparent hover:border-[var(--b2)] hover:shadow-sm hover:scale-105 active:scale-95 transition-all duration-200"
                          title="Analyze Customer"
                        >
                          <AnalyzeIcon size={14} />
                        </button>
                        <button
                          onClick={() => handleSendToChat([c])}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg2)] border border-transparent hover:border-[var(--b2)] hover:shadow-sm hover:scale-105 active:scale-95 transition-all duration-200"
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
            Showing {tableLoading ? '...' : totalCount === 0 ? 0 : `${(page - 1) * pageSize + 1}–${Math.min(totalCount, page * pageSize)}`} of {tableLoading ? '...' : totalCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1 || tableLoading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeftIcon size={13} />
            </button>
            {!tableLoading && (() => {
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
              return pages.map((pg, idx) =>
                pg === '...' ? (
                  <span key={idx} className="px-1.5 self-center">…</span>
                ) : (
                  <button
                    key={idx}
                    onClick={() => setPage(pg as number)}
                    className={`h-7 min-w-[28px] px-1.5 rounded-lg border text-[11px] transition-all ${
                      page === pg
                        ? 'bg-[var(--t)] text-[var(--inv-t)] border-[var(--t)]'
                        : 'border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'
                    }`}
                  >
                    {pg}
                  </button>
                )
              );
            })()}
            <button
              disabled={page === totalPages || tableLoading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
  );
}

export default function AnalyticsPage() {
  return (
    <PermissionGate permission="view_analytics">
      <Suspense fallback={
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <svg className="animate-spin text-[var(--b3)]" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
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
  uid?: string; // unique prefix for gradient IDs (prevents SVG ID conflicts between instances)
}

function BarChart({ data, height = 220, color = "var(--p)", horizontal = false, uid = 'c' }: BarChartProps) {
  // Measure the real container pixel width via ResizeObserver.
  // This makes viewBox = "0 0 W height" a 1:1 pixel mapping → no SVG scaling,
  // no letterboxing, no text distortion at any column width.
  const containerRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(700); // 700 = safe SSR/hydration fallback

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(entries =>
      setW(Math.round(entries[0].contentRect.width))
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(...data.map(d => d.value), 1);

  /* ── Horizontal ─────────────────────────────────────────────────── */
  let chart: React.ReactNode;

  if (horizontal) {
    // pad.l = 165 px — enough for "Days Since Last Payment" (~24 chars × ~6.5px at 11px font ≈ 156px)
    // Because W now equals the real container width, all values are in actual pixels.
    const pad = { l: 165, r: 12, t: 10, b: 42 };
    const innerW = W - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const rowH   = innerH / (data.length || 1);
    const barH   = Math.min(rowH - 14, 30);

    // Round max up to nearest 0.5 so bars never overflow the chart area
    const maxTick  = Math.max(Math.ceil(max / 0.5) * 0.5, 0.5);
    const tickStep = maxTick <= 1 ? 0.25 : 0.5;
    const ticks: number[] = [];
    for (let t = 0; t <= maxTick + 1e-9; t += tickStep) {
      ticks.push(parseFloat(t.toFixed(2)));
    }

    chart = (
      <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} style={{ display: 'block' }}>
        <defs>
          {data.map((d, i) => {
            const c = d.color || color;
            return (
              <linearGradient key={i} id={`${uid}-hg${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor={c} stopOpacity="1" />
                <stop offset="100%" stopColor={c} stopOpacity="0.72" />
              </linearGradient>
            );
          })}
        </defs>

        {/* ── Vertical grid lines at each tick ── */}
        {ticks.map((t, i) => {
          const x = pad.l + (t / maxTick) * innerW;
          return (
            <line key={i}
              x1={x} x2={x} y1={pad.t} y2={pad.t + innerH}
              stroke="var(--b)" strokeWidth="1"
              strokeDasharray={t === 0 ? '' : '3 6'}
              className="stroke-[var(--b)]"
            />
          );
        })}

        {/* ── X-axis baseline ── */}
        <line
          x1={pad.l} x2={W - pad.r}
          y1={pad.t + innerH} y2={pad.t + innerH}
          stroke="var(--b)" strokeWidth="1.5"
          className="stroke-[var(--b)]"
        />

        {/* ── X-axis tick marks + labels ── */}
        {ticks.map((t, i) => {
          const x = pad.l + (t / maxTick) * innerW;
          return (
            <g key={i}>
              <line
                x1={x} x2={x}
                y1={pad.t + innerH} y2={pad.t + innerH + 5}
                stroke="var(--b)" strokeWidth="1"
                className="stroke-[var(--b)]"
              />
              <text
                x={x} y={pad.t + innerH + 18}
                fontSize="10" textAnchor="middle"
                fill="var(--t3)" fontFamily="var(--font-mono)"
                className="fill-[var(--t3)]"
              >{t.toFixed(1)}</text>
            </g>
          );
        })}

        {/* ── Rows ── */}
        {data.map((d, i) => {
          const y  = pad.t + i * rowH + (rowH - barH) / 2;
          const bw = Math.max((d.value / maxTick) * innerW, 3);

          return (
            <g key={i}>
              {/* Feature label — full text, no truncation */}
              <text
                x={pad.l - 12} y={y + barH / 2 + 4}
                fontSize="11" textAnchor="end"
                fill="var(--t2)" fontFamily="var(--font-sans)"
                className="fill-[var(--t2)]"
              >{d.label}</text>

              {/* Track */}
              <rect
                x={pad.l} y={y} width={innerW} height={barH} rx="5"
                fill="var(--bg2)" className="fill-[var(--bg2)]"
              />

              {/* Filled bar */}
              <rect
                x={pad.l} y={y} width={bw} height={barH} rx="5"
                fill={`url(#${uid}-hg${i})`}
              />
            </g>
          );
        })}
      </svg>
    );
  } else {
    /* ── Vertical ─────────────────────────────────────────────────── */
    const pad    = { l: 24, r: 16, t: 24, b: 30 };
    const innerW = W - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const step   = innerW / (data.length || 1);
    const barW   = step * 0.56;

    // Grid y-positions: 25 / 50 / 75 / 100 %
    const gridTicks = [0.25, 0.5, 0.75, 1];

    chart = (
      <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`}
        style={{ display: 'block' }} className="overflow-visible">
        <defs>
          {data.map((d, i) => {
            const c = d.color || color;
            return (
              <linearGradient key={i} id={`${uid}-vg${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={c} stopOpacity="0.95" />
                <stop offset="100%" stopColor={c} stopOpacity="0.45" />
              </linearGradient>
            );
          })}
        </defs>

        {/* Grid lines */}
        {gridTicks.map((t, i) => {
          const gy = pad.t + innerH * (1 - t);
          const isBase = t === 1;
          return (
            <line key={i}
              x1={pad.l} x2={W - pad.r} y1={gy} y2={gy}
              stroke="var(--b)" strokeWidth={isBase ? 1.5 : 1}
              strokeDasharray={isBase ? '' : '4 7'}
              className="stroke-[var(--b)]"
            />
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x  = pad.l + i * step + (step - barW) / 2;
          const bh = Math.max((d.value / max) * innerH, 2);
          const y  = pad.t + innerH - bh;

          return (
            <g key={i}>
              {/* Value label — always shown; shifts below bar-top when bar is very short */}
              {d.value > 0 && (
                <text
                  x={x + barW / 2}
                  y={bh > 16 ? y - 4 : y - 8}
                  fontSize="9" textAnchor="middle"
                  fill={bh > 16 ? 'var(--t2)' : 'var(--t3)'}
                  fontFamily="var(--font-mono)"
                >{d.value}</text>
              )}

              {/* Bar with gradient + rounded top */}
              <rect x={x} y={y} width={barW} height={bh} rx="4"
                fill={`url(#${uid}-vg${i})`} />

              {/* Axis label */}
              <text
                x={x + barW / 2} y={pad.t + innerH + 16}
                fontSize="9" textAnchor="middle"
                fill="var(--t3)" fontFamily="var(--font-mono)"
                className="fill-[var(--t3)]"
              >{d.label}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {chart}
    </div>
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
