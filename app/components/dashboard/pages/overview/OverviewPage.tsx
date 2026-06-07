'use client';

import { useMemo, memo } from 'react';
import Link from 'next/link';
import CustomerFlowChart from '../../charts/CustomerFlowChart';
import DonutChart from '../../charts/DonutChart';
import SparklineChart from '../../charts/SparklineChart';
import { getFallbackPalette, normalizeSegmentLabel } from '../segmentation/SegmentationPage';
import { useDashboardContext } from '../../context/DashboardContext';


export type OverviewStats = {
  totalCustomers: number;
  safeCustomers: number;
  churnRisk: number;
  predictedChurn: number;
};

/* ─── KPI Card Component ─── */
function KpiCard({
  label,
  value,
  change,
  changeSuffix,
  changePositive,
  sparklineData,
  sparklineColor,
}: {
  label: string;
  value: string;
  change?: string;
  changeSuffix?: string;
  changePositive?: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  return (
    <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 flex flex-col justify-between min-h-[160px] transition-all duration-300 hover:shadow-sm">
      <div>
        <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em] mb-2">{label}</p>
        <p className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight">{value}</p>
      </div>
      
      {/* Description with Arrow - Above Sparkline */}
      {(change || changeSuffix) && (
        <div className="flex items-center gap-2 mt-2 mb-2">
          {change && change.trim() && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background: changePositive ? 'var(--accent-bg)' : 'rgba(240, 138, 122, 0.10)',
                color: changePositive ? 'var(--accent-d)' : 'var(--danger)',
              }}
            >
              {changePositive ? '↑' : '↓'} {change}
            </span>
          )}
          {changeSuffix && (
            <span className="text-[10px] font-medium text-[var(--t3)]">{changeSuffix}</span>
          )}
        </div>
      )}
      
      {/* Sparkline Chart */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-auto overflow-hidden">
          <SparklineChart
            data={sparklineData}
            color={sparklineColor || '#22c55e'}
            height={32}
            strokeWidth={2}
          />
        </div>
      )}
    </div>
  );
}



/* ─── Main OverviewPage Component ─── */
const OverviewPage = ({
  stats,
  riskData,
  flowData,
  planData,
  segmentData,
  sparklines,
  deltas,
  // trajectorySummary and trajectoryData are unused but kept in props type to match caller signature
}: {
  stats?: OverviewStats;
  riskData?: any[];
  flowData?: any;
  planData?: any[];
  segmentData?: any[];
  sparklines?: {
    totalCustomers: number[];
    safeCustomers: number[];
    churnRisk: number[];
    predictedChurn: number[];
  };
  deltas?: {
    totalCustomers: { change: string; positive: boolean };
    safeCustomers: { change: string; positive: boolean };
    churnRisk: { change: string; positive: boolean };
    predictedChurn: { change: string; positive: boolean };
  };
  trajectorySummary?: { avg: string; best: string; trend: string };
  trajectoryData?: { label: string; value: number }[];
}) => {
  const { workspace } = useDashboardContext();

  const data = useMemo(() => stats || {
    totalCustomers: 0,
    safeCustomers: 0,
    churnRisk: 0,
    predictedChurn: 0,
  }, [stats]);

  const safeRate = data.totalCustomers > 0
    ? (data.safeCustomers / data.totalCustomers * 100).toFixed(1)
    : '0';

  const segments = segmentData && segmentData.length > 0 ? segmentData : [];
  const hasSegments = segments.length > 0;



  // Alerts
  const alerts = useMemo(() => {
    const list = [];
    if (data.predictedChurn > 0) {
      list.push({
        level: 'high',
        label: `${data.predictedChurn.toLocaleString('en-US')} customers flagged at high churn risk`,
        time: 'Latest Run'
      });
    }
    if (data.churnRisk > 10) {
      list.push({
        level: 'med',
        label: `Churn rate of ${data.churnRisk}% exceeds the 10% threshold limit`,
        time: 'Active Alert'
      });
    }
    list.push({
      level: 'low',
      label: 'Workspace ingestion and analytical pipelines fully synced',
      time: 'Just Now'
    });
    return list;
  }, [data]);

  // Quick actions
  const quickActionsList = useMemo(() => [
    {
      label: 'Review at-risk customers',
      desc: `${data.predictedChurn.toLocaleString('en-US')} accounts flagged`,
      href: '/dashboard/analytics?risk=high',
    },
    {
      label: 'Explore segments',
      desc: 'Analyze customer cohorts',
      href: '/dashboard/segmentation',
    },
    {
      label: 'Upload dataset',
      desc: 'Import new client records',
      href: '/dashboard/data-management',
    },
    {
      label: 'Workspace Chat',
      desc: 'Collaborate with your team',
      href: '/dashboard/chat',
    }
  ], [data]);

  return (
    <div className="fade-in">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[var(--b)] pb-5">
          <div>
            <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.14em] mb-1">
              Workspace · {workspace?.name || 'Arkanalytics'}
            </p>
            <h1 className="font-display text-2xl font-black text-[var(--t)] leading-tight tracking-tight">
              Customer Overview
            </h1>
            <p className="text-[12px] text-[var(--t3)] mt-1 max-w-xl">
              A snapshot of customer health, retention performance, and churn signals across your latest prediction run.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/data-management" className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-[var(--t)] text-[var(--inv-t)] rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New analysis
            </Link>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Total Customers"
            value={data.totalCustomers.toLocaleString('en-US')}
            change={deltas?.totalCustomers.change}
            changeSuffix="vs. previous run"
            changePositive={deltas?.totalCustomers.positive}
            sparklineData={sparklines?.totalCustomers}
            sparklineColor="#22c55e"
          />
          <KpiCard
            label="Safe Customers"
            value={data.safeCustomers.toLocaleString('en-US')}
            change={deltas?.safeCustomers.change}
            changeSuffix={`${safeRate}% retention`}
            changePositive={deltas?.safeCustomers.positive}
            sparklineData={sparklines?.safeCustomers}
            sparklineColor="#22c55e"
          />
          <KpiCard
            label="Churn Risk Rate"
            value={`${data.churnRisk}%`}
            change={deltas?.churnRisk.change}
            changeSuffix="below 10% limit"
            changePositive={deltas?.churnRisk.positive}
            sparklineData={sparklines?.churnRisk}
            sparklineColor="#ef4444"
          />
          <KpiCard
            label="Predicted Churn"
            value={data.predictedChurn.toLocaleString('en-US')}
            change={deltas?.predictedChurn.change}
            changeSuffix="customers flagged"
            changePositive={deltas?.predictedChurn.positive}
            sparklineData={sparklines?.predictedChurn}
            sparklineColor="#f59e0b"
          />
        </div>

        {/* ── Main Layout Bento Grid ── */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* Left Column (8/12 span) */}
          <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
            


            {/* Customer flow */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 min-h-[340px]">
              <CustomerFlowChart data={flowData} />
            </div>

            {/* Customer segments */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--t)]">Customer segments</h3>
                  <p className="text-[11px] text-[var(--t3)] mt-0.5">Behavioral cohorts · latest prediction</p>
                </div>
                <Link
                  href="/dashboard/segmentation"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--t2)] border border-[var(--b2)] rounded-lg px-2.5 py-1.5 hover:bg-[var(--bg2)] hover:text-[var(--t)] transition-all"
                >
                  Open segmentation
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>

              {hasSegments ? (
                <div className="flex flex-col gap-3">
                  {/* First row of 2 segments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {segments.slice(0, 2).map((s: any, i: number) => {
                      const displayName = normalizeSegmentLabel(s.name);
                      const colorSet = getFallbackPalette(displayName, s.cluster);
                      return (
                        <div key={i} className="border border-[var(--b)] rounded-xl p-4 flex flex-col justify-between min-h-[140px] bg-[var(--bg1)]">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorSet.hex }}></span>
                              <span className="text-[12px] font-bold text-[var(--t)]">{displayName}</span>
                            </div>
                            <div className="font-mono text-2xl font-black text-[var(--t)] tracking-tight">
                              {s.count.toLocaleString('en-US')}
                            </div>
                            <div className="text-[12px] text-[var(--t3)] font-mono mt-1">
                              {s.pct}% share · {s.pctHighRisk}% risk
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="h-1 bg-[var(--bg3)] rounded-full overflow-hidden mb-3">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: colorSet.hex }}></div>
                            </div>
                            <div className="flex items-center justify-between text-[12px] pt-2 border-t border-[var(--b)] font-mono">
                              <span className="text-[var(--t3)] uppercase tracking-wider">Avg MRR</span>
                              <span className="text-[var(--t)] font-bold">{s.avgMrr}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                 {/* Second row of 2 segments */}
                  {segments.length > 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {segments.slice(2, 4).map((s: any, i: number) => {
                        const displayName = normalizeSegmentLabel(s.name);
                        const colorSet = getFallbackPalette(displayName, s.cluster);
                        return (
                          <div key={i} className="border border-[var(--b)] rounded-xl p-4 flex flex-col justify-between min-h-[140px] bg-[var(--bg1)]">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorSet.hex }}></span>
                                <span className="text-[12px] font-bold text-[var(--t)]">{displayName}</span>
                              </div>
                              <div className="font-mono text-2xl font-black text-[var(--t)] tracking-tight">
                                {s.count.toLocaleString('en-US')}
                              </div>
                              <div className="text-[12px] text-[var(--t3)] font-mono mt-1">
                                {s.pct}% share · {s.pctHighRisk}% risk
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="h-1 bg-[var(--bg3)] rounded-full overflow-hidden mb-3">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: colorSet.hex }}></div>
                              </div>
                              <div className="flex items-center justify-between text-[12px] pt-2 border-t border-[var(--b)] font-mono">
                                <span className="text-[var(--t3)] uppercase tracking-wider">Avg MRR</span>
                                <span className="text-[var(--t)] font-bold">{s.avgMrr}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg2)] border border-[var(--b)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--t2)]">No segment cohorts yet</p>
                    <p className="text-[11px] text-[var(--t3)] max-w-[240px] leading-relaxed mt-0.5">
                      Upload and compile dataset analysis to generate user behavioral segment cards.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/data-management"
                    className="mt-1 text-[11px] font-bold text-[var(--t)] border border-[var(--b2)] rounded-lg px-3 py-1.5 hover:bg-[var(--bg2)] transition-colors"
                  >
                    Upload Dataset
                  </Link>
                </div>
              )}
            </div>

          </div>

          {/* Right Column (4/12 span) */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
            
            {/* Risk Distribution Donut */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 h-64">
              <DonutChart data={riskData} />
            </div>

            {/* Signals & alerts */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--t)]">Signals & alerts</h3>
                  <p className="text-[11px] text-[var(--t3)] mt-0.5">Last 24 hours</p>
                </div>
              </div>
              
              <div className="flex flex-col">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 py-3 ${i < alerts.length - 1 ? 'border-b border-[var(--b)]' : ''}`}>

                    {/* dot badge */}
                    {a.level === 'high' && (
                      <span className="relative flex shrink-0 mt-[3px]">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--r)] opacity-60 animate-ping" />
                        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[var(--r)] ring-2 ring-[var(--r)]/25" />
                      </span>
                    )}
                    {a.level === 'med' && (
                      <span className="relative flex shrink-0 mt-[3px]">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--o)] opacity-40 animate-ping" style={{ animationDuration: '1.8s' }} />
                        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[var(--o)] ring-2 ring-[var(--o)]/25" />
                      </span>
                    )}
                    {a.level === 'low' && (
                      <span className="relative flex shrink-0 mt-[3px]">
                        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[var(--g)] ring-2 ring-[var(--g)]/20" />
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[var(--t)] leading-normal font-medium">{a.label}</div>
                      <div className="text-[10px] text-[var(--t3)] font-mono mt-1 uppercase tracking-wider">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5">
              <div className="mb-4">
                <h3 className="text-[13px] font-bold text-[var(--t)]">Quick actions</h3>
                <p className="text-[11px] text-[var(--t3)] mt-0.5">Suggested next steps</p>
              </div>
              
              <div className="flex flex-col gap-1.5">
                {quickActionsList.map((action, i) => (
                  <Link
                    key={i}
                    href={action.href}
                    className="flex items-center justify-between p-3 border border-[var(--b)] hover:border-[var(--b2)] hover:bg-[var(--bg1)] rounded-lg text-left transition-all duration-200 group"
                  >
                    <div>
                      <div className="text-[12px] font-bold text-[var(--t)] mb-0.5">{action.label}</div>
                      <div className="text-[10px] text-[var(--t3)] font-mono">{action.desc}</div>
                    </div>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-[var(--t3)] group-hover:text-[var(--t)] group-hover:translate-x-0.5 transition-all"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>
    </div>
  );
};

export default memo(OverviewPage);
