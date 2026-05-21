'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Link from 'next/link';
import CustomerFlowChart from '../../charts/CustomerFlowChart';
import DonutChart from '../../charts/DonutChart';
import { getFallbackPalette } from '../segmentation/SegmentationPage';
import { useDashboardContext } from '../../context/DashboardContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
}: {
  label: string;
  value: string;
  change?: string;
  changeSuffix?: string;
  changePositive?: boolean;
}) {
  return (
    <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em] mb-1">{label}</p>
          <p className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight">{value}</p>
        </div>
      </div>
      {(change || changeSuffix) && (
        <div className="flex items-center gap-1.5 pt-3 border-t border-[var(--b)] mt-4">
          {change && (
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
    </div>
  );
}

/* ─── Churn Trajectory Area Chart ─── */
function ChurnTrajectoryChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-[11px] text-[var(--t3)] font-mono">
        No trajectory data available
      </div>
    );
  }
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
          <defs>
            <linearGradient id="colorTrajectory" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--p)" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="var(--p)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="var(--b)" vertical={false} opacity={0.5} />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 9, fill: 'var(--t3)', fontWeight: 500 }} 
            axisLine={false} 
            tickLine={false}
            dy={10}
          />
          <YAxis 
            tick={{ fontSize: 9, fill: 'var(--t3)', fontWeight: 500 }} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0];
                return (
                  <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
                    <p className="font-bold mb-0.5">{d.payload.label}</p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="opacity-70">Rate</span>
                      <span className="font-black text-[var(--inv-t)]">{d.value}%</span>
                    </div>
                  </div>
                );
              }
              return null;
            }} 
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="var(--p)" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorTrajectory)" 
            activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--p)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
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
  trajectorySummary,
  trajectoryData,
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
  const [isMounted, setIsMounted] = useState(false);
  const { workspace } = useDashboardContext();

  const [trajectoryMode, setTrajectoryMode] = useState<'churn' | 'retention' | 'net'>('churn');

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Process Trajectory Data & Mode Client-side
  const transformedTrajectoryData = useMemo(() => {
    if (!trajectoryData || trajectoryData.length === 0) return [];
    
    const mapped = trajectoryData.map(d => {
      let val = d.value;
      if (trajectoryMode === 'retention') val = 100 - d.value;
      if (trajectoryMode === 'net') val = 100 - 2 * d.value;
      return {
        label: d.label,
        value: parseFloat(val.toFixed(1))
      };
    });

    if (mapped.length === 1) {
      // Duplicate to draw horizontal line if only 1 data point
      return [
        { label: 'PREV', value: mapped[0].value },
        mapped[0]
      ];
    }
    return mapped;
  }, [trajectoryData, trajectoryMode]);

  // Client-side calculate Avg, Best, Trend based on transformedTrajectoryData
  const trajectoryStats = useMemo(() => {
    if (!transformedTrajectoryData || transformedTrajectoryData.length === 0) {
      return { avg: '0%', best: '0%', trend: '0 pts', trendColor: 'var(--accent)' };
    }
    
    // If it was duplicated for length=1, remove the duplicated one for calculation
    const actualData = trajectoryData && trajectoryData.length === 1 
      ? [transformedTrajectoryData[1]] 
      : transformedTrajectoryData;

    const values = actualData.map(d => d.value);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    
    let best = values[0];
    let bestLabel = actualData[0]?.label || '';
    
    if (trajectoryMode === 'churn') {
      // Best is lowest churn rate
      actualData.forEach(d => {
        if (d.value < best) {
          best = d.value;
          bestLabel = d.label;
        }
      });
    } else {
      // Best is highest retention / net score
      actualData.forEach(d => {
        if (d.value > best) {
          best = d.value;
          bestLabel = d.label;
        }
      });
    }

    const latest = values[values.length - 1] || 0;
    const oldest = values[0] || 0;
    const diff = latest - oldest;

    // Trend positive indicator (lower churn is positive, higher retention/net is positive)
    const isPositive = trajectoryMode === 'churn' ? diff <= 0 : diff >= 0;

    return {
      avg: `${avg.toFixed(1)}%`,
      best: `${best.toFixed(1)}% · ${bestLabel}`,
      trend: `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)} pts`,
      trendColor: isPositive ? 'var(--accent)' : 'var(--danger)'
    };
  }, [transformedTrajectoryData, trajectoryMode, trajectoryData]);

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

  if (!isMounted) {
    return (
      <DashboardLayout page="Overview">
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-[var(--bg2)] rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-[var(--bg2)] rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-8 h-96 bg-[var(--bg2)] rounded-2xl" />
            <div className="col-span-12 xl:col-span-4 h-96 bg-[var(--bg2)] rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout page="Overview">
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
            <button className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--t2)] border border-[var(--b2)] rounded-lg px-3 py-1.5 hover:bg-[var(--bg2)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
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
          />
          <KpiCard
            label="Safe Customers"
            value={data.safeCustomers.toLocaleString('en-US')}
            change={deltas?.safeCustomers.change}
            changeSuffix={`${safeRate}% retention`}
            changePositive={deltas?.safeCustomers.positive}
          />
          <KpiCard
            label="Churn Risk Rate"
            value={`${data.churnRisk}%`}
            change={deltas?.churnRisk.change}
            changeSuffix="below 10% limit"
            changePositive={deltas?.churnRisk.positive}
          />
          <KpiCard
            label="Predicted Churn"
            value={data.predictedChurn.toLocaleString('en-US')}
            change={deltas?.predictedChurn.change}
            changeSuffix="customers flagged"
            changePositive={deltas?.predictedChurn.positive}
          />
        </div>

        {/* ── Main Layout Bento Grid ── */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* Left Column (8/12 span) */}
          <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
            
            {/* Churn rate trajectory */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--t)]">Churn rate trajectory</h3>
                  <p className="text-[11px] text-[var(--t3)] mt-0.5">12 months · monthly aggregate</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTrajectoryMode('churn')}
                    className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                      trajectoryMode === 'churn'
                        ? 'bg-[var(--t)] text-[var(--inv-t)]'
                        : 'border border-[var(--b)] text-[var(--t3)] hover:bg-[var(--bg2)]'
                    }`}
                  >
                    Churn
                  </button>
                  <button
                    onClick={() => setTrajectoryMode('retention')}
                    className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                      trajectoryMode === 'retention'
                        ? 'bg-[var(--t)] text-[var(--inv-t)]'
                        : 'border border-[var(--b)] text-[var(--t3)] hover:bg-[var(--bg2)]'
                    }`}
                  >
                    Retention
                  </button>
                  <button
                    onClick={() => setTrajectoryMode('net')}
                    className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                      trajectoryMode === 'net'
                        ? 'bg-[var(--t)] text-[var(--inv-t)]'
                        : 'border border-[var(--b)] text-[var(--t3)] hover:bg-[var(--bg2)]'
                    }`}
                  >
                    Net
                  </button>
                </div>
              </div>
              
              <ChurnTrajectoryChart data={transformedTrajectoryData} />
              
              <div className="h-px bg-[var(--b)] my-4" />
              
              <div className="flex flex-wrap items-center gap-6 text-[11px] text-[var(--t3)]">
                <div>
                  <div className="font-mono uppercase tracking-[0.08em] text-[10px]">Avg</div>
                  <div className="text-base font-black text-[var(--t)] font-mono mt-0.5">
                    {trajectoryStats.avg}
                  </div>
                </div>
                <div className="w-px h-6 bg-[var(--b)] self-center" />
                <div>
                  <div className="font-mono uppercase tracking-[0.08em] text-[10px]">Best</div>
                  <div className="text-base font-black text-[var(--t)] font-mono mt-0.5">
                    {trajectoryStats.best}
                  </div>
                </div>
                <div className="w-px h-6 bg-[var(--b)] self-center" />
                <div>
                  <div className="font-mono uppercase tracking-[0.08em] text-[10px]">Trend</div>
                  <div className="text-base font-black font-mono mt-0.5" style={{ color: trajectoryStats.trendColor }}>
                    {trajectoryStats.trend}
                  </div>
                </div>
                <div className="ml-auto text-[10px] self-end font-mono">
                  Live database sync active
                </div>
              </div>
            </div>

            {/* Customer flow */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5">
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
                  {/* First row of 3 segments */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {segments.slice(0, 3).map((s: any, i: number) => {
                      const colorSet = getFallbackPalette(s.name);
                      return (
                        <div key={i} className="border border-[var(--b)] rounded-xl p-4 flex flex-col justify-between min-h-[140px] bg-[var(--bg1)]">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorSet.hex }}></span>
                              <span className="text-[12px] font-bold text-[var(--t)]">{s.name}</span>
                            </div>
                            <div className="font-mono text-2xl font-black text-[var(--t)] tracking-tight">
                              {s.count.toLocaleString('en-US')}
                            </div>
                            <div className="text-[10px] text-[var(--t3)] font-mono mt-1">
                              {s.pct}% share · {s.pctHighRisk}% risk
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="h-1 bg-[var(--bg3)] rounded-full overflow-hidden mb-3">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: colorSet.hex }}></div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-2 border-t border-[var(--b)] font-mono">
                              <span className="text-[var(--t3)] uppercase tracking-wider">Avg MRR</span>
                              <span className="text-[var(--t)] font-bold">{s.avgMrr}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Second row of segments (if remaining) */}
                  {segments.length > 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {segments.slice(3, 5).map((s: any, i: number) => {
                        const colorSet = getFallbackPalette(s.name);
                        return (
                          <div key={i} className="border border-[var(--b)] rounded-xl p-4 flex flex-col justify-between min-h-[140px] bg-[var(--bg1)]">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorSet.hex }}></span>
                                <span className="text-[12px] font-bold text-[var(--t)]">{s.name}</span>
                              </div>
                              <div className="font-mono text-2xl font-black text-[var(--t)] tracking-tight">
                                {s.count.toLocaleString('en-US')}
                              </div>
                              <div className="text-[10px] text-[var(--t3)] font-mono mt-1">
                                {s.pct}% share · {s.pctHighRisk}% risk
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="h-1 bg-[var(--bg3)] rounded-full overflow-hidden mb-3">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: colorSet.hex }}></div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] pt-2 border-t border-[var(--b)] font-mono">
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
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5">
              <DonutChart data={riskData} />
            </div>

            {/* Signals & alerts */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--t)]">Signals & alerts</h3>
                  <p className="text-[11px] text-[var(--t3)] mt-0.5">Last 24 hours</p>
                </div>
                <button className="text-[11px] font-bold text-[var(--t2)] hover:bg-[var(--bg2)] hover:text-[var(--t)] px-2.5 py-1.5 rounded-lg transition-colors">
                  All
                </button>
              </div>
              
              <div className="flex flex-col">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex gap-3 py-3 ${i < alerts.length - 1 ? 'border-b border-[var(--b)]' : ''}`}>
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        backgroundColor: a.level === 'high' ? 'var(--danger)' : a.level === 'med' ? 'var(--warn)' : 'var(--accent)'
                      }}
                    />
                    <div className="flex-1">
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
    </DashboardLayout>
  );
};

export default memo(OverviewPage);
