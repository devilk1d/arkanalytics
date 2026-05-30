'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Card from '../../ui/Card';
import PermissionGate from '../../ui/PermissionGate';
import { useDashboardContext } from '../../context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import ClusterChart from '../../charts/ClusterChart';
import FilterDropdown from '../../ui/FilterDropdown';


export const PALETTE = [
  { hex: 'var(--c-red)', textClass: 'text-[var(--c-red)]', iconBgClass: 'bg-[var(--c-red-bg)]', badgeClass: 'bg-[var(--c-red-bg)] text-[var(--c-red)] border border-[var(--c-red-b)]' },
  { hex: 'var(--c-blue)', textClass: 'text-[var(--c-blue)]', iconBgClass: 'bg-[var(--c-blue-bg)]', badgeClass: 'bg-[var(--c-blue-bg)] text-[var(--c-blue)] border border-[var(--c-blue-b)]' },
  { hex: 'var(--c-purple)', textClass: 'text-[var(--c-purple)]', iconBgClass: 'bg-[var(--c-purple-bg)]', badgeClass: 'bg-[var(--c-purple-bg)] text-[var(--c-purple)] border border-[var(--c-purple-b)]' },
  { hex: 'var(--c-emerald)', textClass: 'text-[var(--c-emerald)]', iconBgClass: 'bg-[var(--c-emerald-bg)]', badgeClass: 'bg-[var(--c-emerald-bg)] text-[var(--c-emerald)] border border-[var(--c-emerald-b)]' },
  { hex: 'var(--c-amber)', textClass: 'text-[var(--c-amber)]', iconBgClass: 'bg-[var(--c-amber-bg)]', badgeClass: 'bg-[var(--c-amber-bg)] text-[var(--c-amber)] border border-[var(--c-amber-b)]' },
  { hex: 'var(--c-cyan)', textClass: 'text-[var(--c-cyan)]', iconBgClass: 'bg-[var(--c-cyan-bg)]', badgeClass: 'bg-[var(--c-cyan-bg)] text-[var(--c-cyan)] border border-[var(--c-cyan-b)]' }
];

/**
 * Returns the display label for a raw segment_label from the DB.
 */
export function normalizeSegmentLabel(rawLabel: string): string {
  if (!rawLabel) return '';
  return rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
}

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

  if (lower.includes('loyal') || lower.includes('satisfied') || lower.includes('best')) {
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

  if (lower.includes('champion') || lower.includes('value') || lower.includes('high') || lower.includes('premium') || lower.includes('whale') || lower.includes('tier')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }

  if (lower.includes('potential') || lower.includes('bill') || lower.includes('price') || lower.includes('cost') || lower.includes('usage') || lower.includes('intensive')) {
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

/**
 * Segment color assignment — always by label keyword, never by cluster index.
 *
 * WHY: k-means cluster numbers are arbitrary. The model might assign cluster 0
 * to any segment depending on initialization. Hardcoding cluster→color breaks
 * whenever the model is retrained. Label keywords are stable across model versions.
 *
 * Ground truth (verified from actual model output):
 *   At-Risk Actives   → amber  (PALETTE[4])
 *   Disengaged Payers → purple (PALETTE[2])
 *   Loyal Champions   → blue   (PALETTE[1])
 *   High-Value At-Risk→ red    (PALETTE[0])
 */
export function getSegmentColorway(label: string, _cluster?: number): typeof PALETTE[number] {
  const l = label.toLowerCase();
  // Priority order matters for overlapping keywords
  if ((l.includes('high') && l.includes('value')) || l === 'churned') return PALETTE[0]; // red
  if (l.includes('loyal') || l.includes('champion') || l === 'retained') return PALETTE[1]; // blue
  if (l.includes('disengage') || l.includes('payer') || l.includes('dormant')) return PALETTE[2]; // purple
  if (l.includes('at-risk') || l.includes('at risk') || l.includes('active') ||
      (l.includes('risk') && !l.includes('high'))) return PALETTE[4]; // amber
  if (l.includes('new') || l.includes('potential') || l.includes('prospect')) return PALETTE[3]; // emerald
  if (l.includes('high') && l.includes('risk')) return PALETTE[0]; // red for "High Risk"
  // Stable hash fallback for unknown labels
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function getFallbackPalette(label: string, _cluster?: number): typeof PALETTE[number] {
  return getSegmentColorway(label);
}

/* Horizontal Stacked share composition bar */
const StackedBar = ({ data, total }: { data: { label: string; value: number; color: string }[], total: number }) => {
  return (
    <div className="w-full">
      <div className="h-4 w-full bg-[var(--bg3)] rounded-full overflow-hidden flex shadow-inner border border-[var(--b)]">
        {data.map((item, idx) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          if (percentage === 0) return null;
          return (
            <div
              key={idx}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 hover:opacity-90 relative group cursor-pointer"
              style={{
                width: `${percentage}%`,
                backgroundColor: item.color,
              }}
              title={`${item.label}: ${item.value.toLocaleString()} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
    </div>
  );
};

const SegmentationPageContent = memo(() => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const datasetId = searchParams.get('dataset_id');
  const { workspace } = useDashboardContext();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<any>(null);
  const [segmentStats, setSegmentStats] = useState<any[]>([]);
  const [activeSegLabel, setActiveSegLabel] = useState<string>('');
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState('');

  // Campaign Drawer state
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignChannel, setCampaignChannel] = useState<'email' | 'push' | 'inapp'>('email');
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignSent, setCampaignSent] = useState(false);

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

  const loadData = useCallback(async (dsId: string) => {
    setLoading(true);

    // Fetch dataset details
    const { data: datasetData } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dsId)
      .single();
    if (datasetData) setDataset(datasetData);

    const { data: segData, error: segError } = await supabase
      .from('segments')
      .select('*')
      .eq('dataset_id', dsId)
      .order('avg_churn_score', { ascending: false });

    if (!segError && segData) {
      const totalCustomersAll = segData.reduce((acc: number, curr: any) => acc + curr.total_customers, 0);

      const stats = segData.map((s: any) => {
        const displayLabel = normalizeSegmentLabel(s.segment_label);
        const colorSet = getSegmentColorway(displayLabel, s.segment_cluster);
        const share = totalCustomersAll > 0 ? parseFloat(((s.total_customers / totalCustomersAll) * 100).toFixed(1)) : 0;

        const xai = s.xai_cohort;
        const hasXai = xai && typeof xai === 'object' && xai.narrative;
        const desc: string | null              = hasXai ? xai.narrative : null;
        const traits: string[]                 = hasXai && Array.isArray(xai.defining_traits) ? xai.defining_traits : [];
        const topPriorityAction: string | null = hasXai ? (xai.top_priority_action ?? null) : null;
        const riskSummary: string | null       = hasXai ? (xai.risk_summary ?? null) : null;
        const xaiGeneratedAt: string | null    = s.xai_cohort_generated_at ?? null;

        return {
          label: displayLabel,
          rawLabel: s.segment_label,
          count: s.total_customers,
          value: s.total_customers.toLocaleString('en-US'),
          share,
          badge: `${s.pct_high_risk}%`,
          avgMrrVal: s.avg_revenue,
          avgMrr: `$${Math.round(s.avg_revenue).toLocaleString('en-US')}`,
          totalMrr: `$${Math.round((s.avg_revenue * s.total_customers) / 1000).toLocaleString('en-US')}K`,
          metricColorClass: colorSet.textClass,
          iconBgClass: colorSet.iconBgClass,
          icon: getSegmentIcon(s.segment_label, colorSet.textClass),
          accentColor: colorSet.hex,
          colorSet,
          avgUsage: Math.round(s.avg_usage_hrs || 0),
          avgNps: s.avg_nps || 0,
          desc,
          traits,
          topPriorityAction,
          riskSummary,
          xaiGeneratedAt,
        };
      });
      
      setSegmentStats(stats);
      // Default to empty string to show 'All Segments' in Cluster Map
      setActiveSegLabel('');
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!datasetId) return;
    loadData(datasetId);
  }, [datasetId, loadData]);

  // Campaign modal triggering
  const openCampaignModal = (seg: any) => {
    setCampaignSubject(`[Action Required] Specialized Offer for ${seg.label} Cohort`);
    setCampaignBody(`Hello,\n\nWe noticed you are one of our key partners. We have prepared exclusive insights and optimization offers for you to get the absolute most out of your current subscription.\n\nBest Regards,\nCustomer Experience Team`);
    setCampaignChannel('email');
    setCampaignSent(false);
    setCampaignSending(false);
    setCampaignModalOpen(true);
  };

  const handleSendCampaign = () => {
    setCampaignSending(true);
    setTimeout(() => {
      setCampaignSending(false);
      setCampaignSent(true);
      setTimeout(() => {
        setCampaignModalOpen(false);
      }, 1500);
    }, 2000);
  };

  const handleRegenerateXai = async () => {
    if (!datasetId) return;
    setRegenerating(true);
    setRegenerateError('');
    try {
      const res = await fetch('/api/segments/regenerate-xai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setRegenerateError(err.error ?? 'Regeneration failed');
      } else {
        await loadData(datasetId);
      }
    } catch (e: any) {
      setRegenerateError(e.message ?? 'Network error');
    } finally {
      setRegenerating(false);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return '2h ago';
      const diffMs = Date.now() - parsed.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays}d ago`;
    } catch {
      return '2h ago';
    }
  };

  if (!isMounted) return <div className="h-screen bg-[var(--bg)] animate-pulse" />;

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
    );
  }

  const activeSegmentObj = segmentStats.find(s => s.label === activeSegLabel) || segmentStats[0];
  const totalCustomersAll = segmentStats.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="fade-in pb-10">
        
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[var(--b)] pb-5">
          <div>
            <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.14em] mb-1">
              Insights · Behavioral cohorts
            </p>
            <h1 className="font-display text-2xl font-black text-[var(--t)] leading-tight tracking-tight">
              Customer Segmentation
            </h1>
            <p className="text-[12px] text-[var(--t3)] mt-1 max-w-xl">
              Behavior-based customer cohorts derived from usage, billing, and engagement features using dynamic clustering models.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={handleRegenerateXai}
              disabled={regenerating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--b2)] text-[11px] font-bold text-[var(--t2)] hover:bg-[var(--bg2)] hover:text-[var(--t)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {regenerating ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Generating AI Insights...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Regenerate AI Insights
                </>
              )}
            </button>
            {regenerateError && (
              <p className="text-[10px] text-[var(--danger)] font-mono">{regenerateError}</p>
            )}
          </div>
        </div>

        {/* ── Cohort Selector Cards (replaces static KPI row) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {segmentStats.map((s, idx) => {
            const isActive = s.label === activeSegLabel;
            return (
              <button
                key={`top-card-${idx}`}
                onClick={() => setActiveSegLabel(s.label)}
                className={`text-left p-4 rounded-2xl border flex flex-col justify-between min-h-[130px] transition-all cursor-pointer ${
                  isActive
                    ? 'border-[var(--b3)] bg-[var(--bg2)] shadow-sm'
                    : 'border-[var(--b)] bg-[var(--surf)] hover:border-[var(--b2)] hover:bg-[var(--bg1)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.accentColor }} />
                  <span className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] truncate">{s.label}</span>
                </div>

                <div>
                  <p className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight mb-1">{s.value}</p>
                  <p className="text-[10px] font-mono text-[var(--t3)] mb-3">
                    {s.share}% share · {s.badge} high risk
                  </p>
                  <div className="h-1 bg-[var(--bg3)] w-full rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.share}%`, backgroundColor: s.accentColor }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Bento Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* Cluster Map & Customer Share (8/12 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 flex-1 min-h-[460px] flex flex-col">
              {/* header row */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--t)]">Cluster Map</h3>
                  <p className="text-[11px] text-[var(--t3)] font-mono mt-0.5">Engagement (x) × Monthly Revenue (y) · Projection</p>
                </div>
                <div className="flex-shrink-0 z-10 w-44">
                  <FilterDropdown
                    value={activeSegLabel || 'all'}
                    onChange={(val) => setActiveSegLabel(val === 'all' ? '' : val)}
                    placeholder="Filter Segment"
                    size="sm"
                    showIcon={true}
                    options={[
                      { label: 'All Segments', value: 'all' },
                      ...segmentStats.map(s => ({ label: s.label, value: s.label }))
                    ]}
                  />
                </div>
              </div>

              {/* chart — fills all remaining space */}
              <div className="flex-1 min-h-0">
                <ClusterChart segmentOrder={segmentStats.map(s => s.label)} activeSegment={activeSegLabel} />
              </div>

              {/* stacked bar — pinned below chart */}
              <div className="shrink-0 mt-4">
                <div className="h-px bg-[var(--b)] mb-4" />
                <div className="text-[10px] font-mono text-[var(--t3)] uppercase tracking-wider mb-2.5">
                  Composition · share of customer base
                </div>
                <StackedBar
                  data={segmentStats.map(s => ({ label: s.label, value: s.count, color: s.accentColor }))}
                  total={totalCustomersAll}
                />
                <div className="flex justify-between items-center text-[10px] text-[var(--t3)] font-mono mt-1.5">
                  <span>0</span>
                  <span>{totalCustomersAll.toLocaleString()} customers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Cohort Inspector (4/12 Columns) */}
          <div className="lg:col-span-4">
            {activeSegmentObj ? (
              <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-6 h-full flex flex-col justify-between min-h-[460px]">
                <div>
                  <div className="flex items-start justify-between border-b border-[var(--b)] pb-4 mb-4">
                    <div>
                      <h2 className="text-lg font-black text-[var(--t)] leading-tight tracking-tight">{activeSegmentObj.label}</h2>
                      <p className="text-[11px] text-[var(--t3)] font-medium mt-0.5 font-mono">
                        {activeSegmentObj.value} customers · {activeSegmentObj.share}% share
                      </p>
                    </div>
                    <span className="w-3.5 h-3.5 rounded-md flex-shrink-0" style={{ backgroundColor: activeSegmentObj.accentColor }} />
                  </div>

                  {/* ── AI narrative section ── */}
                  {regenerating ? (
                    /* skeleton while regenerating */
                    <div className="mb-6 space-y-2">
                      <div className="h-3 w-20 rounded bg-[var(--bg3)] animate-pulse mb-3" />
                      <div className="h-3 rounded bg-[var(--bg3)] animate-pulse w-full" />
                      <div className="h-3 rounded bg-[var(--bg3)] animate-pulse w-[92%]" />
                      <div className="h-3 rounded bg-[var(--bg3)] animate-pulse w-[78%]" />
                    </div>
                  ) : activeSegmentObj.desc ? (
                    /* XAI content */
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-md bg-[var(--accent-bg)] border border-[var(--accent-b)]">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="text-[9px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider">AI Generated</span>
                      </div>
                      <p className="text-[12px] text-[var(--t2)] leading-relaxed font-medium">
                        {activeSegmentObj.desc}
                      </p>
                    </div>
                  ) : (
                    /* empty state — no XAI yet */
                    <div className="mb-6 flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-dashed border-[var(--b2)] bg-[var(--bg1)]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <p className="text-[11px] text-[var(--t3)] text-center leading-relaxed max-w-[180px]">
                        AI insights not generated yet.<br />Click <span className="font-semibold text-[var(--t2)]">Regenerate AI Insights</span> to analyze this cohort.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="border border-[var(--b)] bg-[var(--bg1)] rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Avg MRR</span>
                      <span className="font-mono text-lg font-bold text-[var(--t)] mt-1">{activeSegmentObj.avgMrr}</span>
                    </div>

                    <div className="border border-[var(--b)] bg-[var(--bg1)] rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Avg Usage</span>
                      <span className="font-mono text-lg font-bold text-[var(--t)] mt-1">{activeSegmentObj.avgUsage}h</span>
                    </div>

                    <div className="border border-[var(--b)] bg-[var(--bg1)] rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Churn Risk</span>
                      <span className="font-mono text-lg font-bold mt-1" style={{ color: parseFloat(activeSegmentObj.badge) > 30 ? 'var(--danger)' : 'var(--accent)' }}>
                        {activeSegmentObj.badge}
                      </span>
                    </div>

                    <div className="border border-[var(--b)] bg-[var(--bg1)] rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Avg NPS</span>
                      <span className="font-mono text-lg font-bold text-[var(--t)] mt-1">{activeSegmentObj.avgNps.toFixed(1)}/10</span>
                    </div>
                  </div>

                  {/* ── Traits ── */}
                  <div className="mb-4">
                    <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono block mb-2">Defining traits</span>
                    {regenerating ? (
                      <div className="flex flex-wrap gap-1.5">
                        {[56, 72, 48, 64].map((w, i) => (
                          <div key={i} className="h-5 rounded-md bg-[var(--bg3)] animate-pulse" style={{ width: w }} />
                        ))}
                      </div>
                    ) : activeSegmentObj.traits.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {activeSegmentObj.traits.map((t: string) => (
                          <span key={t} className="inline-flex items-center py-0.5 px-2 bg-[var(--bg1)] border border-[var(--b2)] rounded-md text-[9px] font-mono font-semibold text-[var(--t2)] uppercase tracking-wider">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {[56, 72, 48, 64].map((w, i) => (
                          <div key={i} className="h-5 rounded-md border border-dashed border-[var(--b2)] bg-transparent" style={{ width: w }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Priority Action ── */}
                  {regenerating ? (
                    <div className="mb-4 p-3 rounded-xl bg-[var(--bg1)] border border-[var(--b)] space-y-1.5">
                      <div className="h-2.5 w-24 rounded bg-[var(--bg3)] animate-pulse" />
                      <div className="h-2.5 w-full rounded bg-[var(--bg3)] animate-pulse" />
                      <div className="h-2.5 w-3/4 rounded bg-[var(--bg3)] animate-pulse" />
                    </div>
                  ) : activeSegmentObj.topPriorityAction ? (
                    <div className="mb-4 p-3 rounded-xl bg-[var(--bg1)] border border-[var(--b)]">
                      <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono block mb-1">Priority Action</span>
                      <p className="text-[11px] text-[var(--t2)] leading-snug">{activeSegmentObj.topPriorityAction}</p>
                    </div>
                  ) : null}

                  {/* ── Risk Summary ── */}
                  {regenerating ? (
                    <div className="mb-4 p-3 rounded-xl bg-[var(--bg1)] border border-[var(--b)] space-y-1.5">
                      <div className="h-2.5 w-20 rounded bg-[var(--bg3)] animate-pulse" />
                      <div className="h-2.5 w-full rounded bg-[var(--bg3)] animate-pulse" />
                      <div className="h-2.5 w-2/3 rounded bg-[var(--bg3)] animate-pulse" />
                    </div>
                  ) : activeSegmentObj.riskSummary ? (
                    <div className="mb-4 p-3 rounded-xl bg-[var(--bg1)] border border-[var(--b)]">
                      <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono block mb-1">Risk Summary</span>
                      <p className="text-[11px] text-[var(--t2)] leading-snug">{activeSegmentObj.riskSummary}</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-3 pt-4 border-t border-[var(--b)]">
                  <button
                    onClick={() => router.push(`/dashboard/analytics?dataset_id=${datasetId}&segment=${encodeURIComponent(activeSegmentObj.rawLabel || activeSegmentObj.label)}`)}
                    className="flex-1 inline-flex justify-center items-center gap-1.5 text-[11px] font-bold text-[var(--t2)] border border-[var(--b2)] rounded-lg px-3 py-2 hover:bg-[var(--bg2)] hover:text-[var(--t)] transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    View customers
                  </button>

                  <button
                    onClick={() => openCampaignModal(activeSegmentObj)}
                    className="flex-1 inline-flex justify-center items-center gap-1.5 text-[11px] font-bold bg-[var(--t)] text-[var(--inv-t)] rounded-lg px-3 py-2 hover:opacity-95 transition-opacity"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Campaign
                  </button>
                </div>
              </div>
            ) : null}
          </div>

        </div>

      {/* ── Campaign Simulation Drawer / Modal ── */}
      {campaignModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surf)] border border-[var(--b3)] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-[var(--b)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--t)]">Launch Marketing Campaign</h3>
                <p className="text-[10px] font-mono text-[var(--t3)] uppercase mt-0.5">Segment: {activeSegmentObj?.label}</p>
              </div>
              <button 
                onClick={() => setCampaignModalOpen(false)}
                className="text-[var(--t3)] hover:text-[var(--t)] p-1 rounded"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {campaignSent ? (
              <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] mb-4 animate-bounce">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-[var(--t)] mb-1">Campaign Launched Successfully!</h4>
                <p className="text-xs text-[var(--t3)] max-w-sm">
                  The notification sequence has been compiled and dispatched to all {activeSegmentObj?.value} customers in the cohort.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-[var(--t3)] uppercase tracking-wider block mb-1.5">Channel</label>
                  <div className="flex gap-2">
                    {(['email', 'push', 'inapp'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setCampaignChannel(c)}
                        className={`flex-1 py-1.5 px-3 rounded-lg border text-[11px] font-bold capitalize transition-all ${
                          campaignChannel === c
                            ? 'bg-[var(--t)] text-[var(--inv-t)] border-[var(--t)]'
                            : 'border-[var(--b)] hover:border-[var(--b2)] text-[var(--t2)]'
                        }`}
                      >
                        {c === 'email' ? '📧 Email' : c === 'push' ? '📱 Push' : '💬 In-App'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[var(--t3)] uppercase tracking-wider block mb-1.5">Subject Line</label>
                  <input
                    type="text"
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                    className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-xl px-4 py-2 text-xs text-[var(--t)] outline-none focus:border-[var(--b3)] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[var(--t3)] uppercase tracking-wider block mb-1.5">Message Body</label>
                  <textarea
                    rows={4}
                    value={campaignBody}
                    onChange={(e) => setCampaignBody(e.target.value)}
                    className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-xl px-4 py-3 text-xs text-[var(--t)] outline-none focus:border-[var(--b3)] transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="bg-[var(--bg1)] border border-[var(--b)] rounded-xl p-3 flex items-center justify-between text-[11px] font-medium text-[var(--t3)]">
                  <span>Target base:</span>
                  <span className="font-bold text-[var(--t)]">{activeSegmentObj?.value} recipients</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCampaignModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-[var(--b2)] hover:bg-[var(--bg2)] text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendCampaign}
                    disabled={campaignSending}
                    className="flex-1 py-2 bg-[var(--t)] text-[var(--inv-t)] rounded-xl font-bold text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                  >
                    {campaignSending ? (
                      <>
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Dispatch Campaign'
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
});

export default function SegmentationPage() {
  return (
    <PermissionGate permission="view_analytics">
      <SegmentationPageContent />
    </PermissionGate>
  );
}
