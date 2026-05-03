'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { RetainModal, SendOfferModal } from './ActionModals';
import { createClient } from '@/lib/supabase/client';
import type { CustomerPrediction } from '@/types/churn';

// ── Types for table row (lightweight — from DB) ───────────────────────────────
interface PredictionRow {
  customer_id: string;
  plan_type: string;
  contract_type: string;
  churn_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  segment_label: string;
}

const planColors: Record<string, string> = {
  Enterprise: 'bg-blue-100 text-blue-700',
  Professional: 'bg-purple-100 text-purple-700',
  Starter: 'bg-gray-100 text-gray-700',
};

const riskColors = {
  Low: 'text-green-500',
  Medium: 'text-yellow-500',
  High: 'text-red-500',
};

const PAGE_SIZE = 9;

// ── Analyze Modal (real data from Railway) ────────────────────────────────────
function AnalyzeModal({
  customerId, datasetId, open, onClose, onRetain, onSendOffer,
}: {
  customerId: string; datasetId: string;
  open: boolean; onClose: () => void;
  onRetain: (c: CustomerPrediction) => void;
  onSendOffer: (c: CustomerPrediction) => void;
}) {
  const [data, setData] = useState<CustomerPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!open || !customerId) return;
    setLoading(true); setError('');

    async function fetch() {
      // 1. Try Supabase first
      const { data: existing } = await supabase
        .from('predictions')
        .select('*')
        .eq('dataset_id', datasetId)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (existing && existing.xai_churn_explanation) {
        setData(existing as unknown as CustomerPrediction);
        setLoading(false);
        return;
      }

      // 2. Need to call Railway — fetch CSVs from storage first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated'); setLoading(false); return; }

      const { data: ds } = await supabase
        .from('datasets')
        .select('storage_path')
        .eq('id', datasetId)
        .single();
      if (!ds) { setError('Dataset not found'); setLoading(false); return; }

      const fileKeys = ['customer_accounts', 'monthly_usage_metrics', 'billing_data', 'support_tickets', 'nps_surveys_with_feedback'];
      const form = new FormData();
      for (const key of fileKeys) {
        const { data: blob, error: dlErr } = await supabase.storage
          .from('files')
          .download(`${ds.storage_path}/${key}.csv`);
        if (dlErr || !blob) { setError(`Failed to load ${key}`); setLoading(false); return; }
        form.append(key, new File([blob], `${key}.csv`, { type: 'text/csv' }));
      }

      // 3. Call Next.js API route (proxies to Railway)
      const res = await window.fetch(
        `/api/predict-single?customer_id=${encodeURIComponent(customerId)}&dataset_id=${datasetId}`,
        { method: 'POST', body: form }
      );
      if (!res.ok) { setError('Prediction failed'); setLoading(false); return; }
      const result: CustomerPrediction = await res.json();
      setData(result);
      setLoading(false);
    }

    fetch();
  }, [open, customerId, datasetId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-black">Customer Analysis</h2>
            <p className="text-xs text-gray-400">Detailed analysis and insights for {customerId}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="animate-spin text-gray-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <p className="text-xs text-gray-400">Running prediction model…</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 border border-red-200 rounded-xl bg-red-50">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Score header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-black">{data.customer_id}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{data.plan_type} · {data.contract_type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Segment: <span className="font-semibold text-black">{data.segment_label}</span></p>
                </div>
                <div className="border border-gray-200 rounded-2xl p-4 text-right min-w-28">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Churn Score</p>
                  <p className={`text-3xl font-black ${data.risk_level === 'Low' ? 'text-green-500'
                    : data.risk_level === 'High' ? 'text-red-500' : 'text-yellow-500'
                    }`}>{data.churn_score}</p>
                  <div className="mt-1">
                    <Badge
                      label={data.risk_level}
                      variant={data.risk_level === 'Low' ? 'low' : data.risk_level === 'High' ? 'high' : 'med'}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    ML: {(data.tabular_proba * 100).toFixed(0)}% · NLP: {(data.nlp_proba * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* XAI Narrative */}
              {data.xai_churn_explanation && (
                <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="text-xs font-semibold text-blue-700">AI Explanation (Qwen)</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                    {data.xai_churn_explanation}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <Button onClick={() => onRetain(data)} className="justify-center">Retain Customer</Button>
                <Button onClick={() => onSendOffer(data)} variant="secondary" className="justify-center">Send Offer</Button>
              </div>

              {/* SHAP top 5 */}
              <p className="text-sm font-bold text-black mb-3">Top Churn Factors (SHAP)</p>
              <div className="flex flex-col gap-2 mb-5">
                {data.shap_top5?.map((factor, i) => {
                  const isIncrease = factor.direction === 'increases_churn';
                  const maxVal = Math.max(...data.shap_top5.map(f => f.importance));
                  const pct = (factor.importance / maxVal) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 w-4 text-right">{i + 1}</span>
                      <span className="text-xs text-gray-700 w-40 shrink-0">{factor.feature_label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${isIncrease ? 'bg-red-400' : 'bg-green-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-semibold w-14 text-right shrink-0 ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                        {isIncrease ? '▲' : '▼'} {factor.shap_value > 0 ? '+' : ''}{factor.shap_value.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Sentiment */}
              {data.sentiment && (
                <>
                  <p className="text-sm font-bold text-black mb-3">Sentiment Analysis</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="border border-gray-200 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 mb-1">Overall Sentiment</p>
                      <p className={`text-sm font-bold capitalize ${data.sentiment.label === 'negative' ? 'text-red-500'
                        : data.sentiment.label === 'positive' ? 'text-green-500' : 'text-yellow-500'
                        }`}>{data.sentiment.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">VADER: {data.sentiment.vader_compound.toFixed(3)}</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 mb-1">Urgency Level</p>
                      <p className={`text-sm font-bold capitalize ${data.sentiment.urgency_level === 'high' ? 'text-red-500'
                        : data.sentiment.urgency_level === 'medium' ? 'text-yellow-500' : 'text-green-500'
                        }`}>{data.sentiment.urgency_level}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Score: {data.sentiment.urgency_score}</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 mb-1">Main Topic</p>
                      <p className="text-xs font-bold text-black leading-tight">{data.sentiment.dominant_topic}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{(data.sentiment.pct_negative_sent).toFixed(0)}% neg sentences</p>
                    </div>
                  </div>
                  {data.sentiment.feedback_preview && (
                    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                      <p className="text-[10px] text-gray-400 mb-1">Feedback Preview</p>
                      <p className="text-xs text-gray-600 leading-relaxed italic">"{data.sentiment.feedback_preview.slice(0, 200)}{data.sentiment.feedback_preview.length > 200 ? '…' : ''}"</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const datasetId = searchParams.get('dataset_id');
  const { workspace } = useDashboardContext();
  const supabase = createClient();

  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [risk, setRisk] = useState('all');
  const [page, setPage] = useState(1);

  // Modal state
  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [retainCustomer, setRetain] = useState<CustomerPrediction | null>(null);
  const [offerCustomer, setOffer] = useState<CustomerPrediction | null>(null);

  // ── Server-side pagination + filtering ──────────────────────────────────────
  const loadPage = useCallback(async (
    currentPage: number,
    searchVal: string,
    planVal: string,
    riskVal: string,
    dsId: string,
  ) => {
    setLoading(true);

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('predictions')
      .select('customer_id,plan_type,contract_type,churn_score,risk_level,segment_label', { count: 'exact' })
      .eq('dataset_id', dsId)
      .order('churn_score', { ascending: false })
      .range(from, to);

    // Apply server-side filters
    if (planVal !== 'all') {
      // Use ilike for case-insensitive match
      query = query.ilike('plan_type', planVal);
    }
    if (riskVal !== 'all') {
      // risk_level is stored as 'Low'|'Medium'|'High' — match case-insensitively
      query = query.ilike('risk_level', riskVal);
    }
    if (searchVal.trim() !== '') {
      // Filter by customer_id or plan_type containing the search term
      query = query.or(
        `customer_id.ilike.%${searchVal.trim()}%,plan_type.ilike.%${searchVal.trim()}%`
      );
    }

    const { data, count, error } = await query;

    if (!error && data) {
      setRows(data as PredictionRow[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [supabase]);

  // Load predictions from Supabase
  useEffect(() => {
    async function init() {
      if (!datasetId) {
        if (!workspace) return;
        setLoading(true);
        // Auto-select the latest done dataset
        const { data } = await supabase
          .from('datasets')
          .select('id')
          .eq('workspace_id', workspace.id)
          .eq('status', 'done')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          router.replace(`/dashboard/analytics?dataset_id=${data[0].id}`);
        } else {
          setLoading(false);
        }
        return;
      }

      await loadPage(page, search, plan, risk, datasetId);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, workspace, router]);

  // Re-fetch whenever filter/page changes
  useEffect(() => {
    if (!datasetId) return;
    loadPage(page, search, plan, risk, datasetId);
  }, [page, search, plan, risk, datasetId, loadPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Helper: reset page and trigger fetch
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handlePlan = (v: string) => { setPlan(v); setPage(1); };
  const handleRisk = (v: string) => { setRisk(v); setPage(1); };

  // No dataset selected
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
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search by customer ID or plan..."
          className="w-72"
        />
        <Select
          value={plan}
          onChange={handlePlan}
          prefix="filter"
          options={[
            { label: 'All Plans', value: 'all' },
            { label: 'Enterprise', value: 'enterprise' },
            { label: 'Professional', value: 'professional' },
            { label: 'Starter', value: 'starter' },
          ]}
        />
        <Select
          value={risk}
          onChange={handleRisk}
          prefix="filter"
          options={[
            { label: 'All Risk', value: 'all' },
            { label: 'High', value: 'high' },
            { label: 'Medium', value: 'medium' },
            { label: 'Low', value: 'low' },
          ]}
        />
        {loading && (
          <svg className="animate-spin text-gray-400 ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        )}
      </div>

      {/* Table */}
      <Card padding="none">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Customer ID', 'Plan', 'Contract', 'Churn Score', 'Risk Level', 'Segment', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + ((i * 7 + j) % 4) * 10}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                  No customers found
                </td>
              </tr>
            ) : (
              rows.map(c => (
                <tr key={c.customer_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{c.customer_id}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${planColors[c.plan_type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.plan_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.contract_type}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <ProgressBar
                          value={c.churn_score}
                          height="sm"
                          color={c.risk_level === 'High' ? 'red' : c.risk_level === 'Low' ? 'green' : 'yellow'}
                        />
                      </div>
                      <span className={`text-sm font-bold ${riskColors[c.risk_level]}`}>
                        {c.churn_score}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={c.risk_level}
                      variant={c.risk_level === 'Low' ? 'low' : c.risk_level === 'High' ? 'high' : 'med'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{c.segment_label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Button size="sm" onClick={() => setAnalyzeId(c.customer_id)}>
                        Analyze
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </Card>

      {/* Analyze Modal */}
      {analyzeId && (
        <AnalyzeModal
          customerId={analyzeId}
          datasetId={datasetId}
          open={!!analyzeId}
          onClose={() => setAnalyzeId(null)}
          onRetain={c => { setRetain(c); setAnalyzeId(null); }}
          onSendOffer={c => { setOffer(c); setAnalyzeId(null); }}
        />
      )}

      {/* Retain / Offer Modals — pass customer name from prediction data */}
      <RetainModal
        customer={retainCustomer as any}
        open={!!retainCustomer}
        onClose={() => setRetain(null)}
        customerName={retainCustomer?.customer_id ?? ''}
      />
      <SendOfferModal
        customer={offerCustomer as any}
        open={!!offerCustomer}
        onClose={() => setOffer(null)}
        customerName={offerCustomer?.customer_id ?? ''}
      />
    </DashboardLayout>
  );
}