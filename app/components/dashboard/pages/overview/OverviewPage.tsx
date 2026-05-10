'use client';

import DashboardLayout from '../../layout/DashboardLayout';
import StatCard from '../../ui/StatCard';
import Card from '../../ui/Card';
import ChurnTrendChart from '../../charts/ChurnTrendChart';
import CustomerFlowChart from '../../charts/CustomerFlowChart';
import DonutChart from '../../charts/DonutChart';
import Link from 'next/link';
import { getFallbackPalette, getSegmentIcon } from '../segmentation/SegmentationPage';

export type OverviewStats = {
  totalCustomers: number;
  safeCustomers: number;
  churnRisk: number;
  predictedChurn: number;
};

/* Quick-action items */
const quickActions = [
  { label: 'View At-Risk Customers', href: '/dashboard/analytics?risk=high', color: 'var(--d)', bg: 'var(--bg1)', icon: '✦' },
  { label: 'Explore Segmentation', href: '/dashboard/segmentation', color: 'var(--p)', bg: 'var(--bg1)', icon: '⬢' },
  { label: 'Upload New Dataset', href: '/dashboard/data-management', color: 'var(--t)', bg: 'var(--bg1)', icon: '↑' },
  { label: 'Open Team Chat', href: '/dashboard/chat', color: 'var(--p)', bg: 'var(--bg1)', icon: '●' },
];

export default function OverviewPage({
  stats, riskData, flowData, planData, segmentData,
}: {
  stats?: OverviewStats;
  riskData?: any[];
  flowData?: any;
  planData?: any[];
  segmentData?: any[];
}) {
  const data = stats || {
    totalCustomers: 0,
    safeCustomers: 0,
    churnRisk: 0,
    predictedChurn: 0,
  };

  const safeRate = data.totalCustomers > 0
    ? (data.safeCustomers / data.totalCustomers * 100).toFixed(1)
    : '0';

  /* Segment data from segments table */
  const segments = segmentData && segmentData.length > 0 ? segmentData : [];
  const hasSegments = segments.length > 0;

  /* Insight alerts — dynamic based on real data */
  const alerts = [
    ...(data.predictedChurn > 0
      ? [{ level: 'high', label: `${data.predictedChurn.toLocaleString('en-US')} customers flagged as high churn risk`, time: 'Latest dataset' }]
      : []),
    ...(data.churnRisk > 10
      ? [{ level: 'med', label: `Churn rate at ${data.churnRisk}% — above 10% recommended threshold`, time: 'Current' }]
      : []),
    { level: 'low', label: 'Customer flow and risk level data is up to date', time: 'Auto-refreshed' },
  ];

  return (
    <DashboardLayout page="Dashboard Overview">

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Total Customers"
          value={data.totalCustomers.toLocaleString('en-US')}
          accentColor="#3b82f6"
          change="Total"
          changeSuffix="customer base"
          changePositive={true}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Safe Customers"
          value={data.safeCustomers.toLocaleString('en-US')}
          accentColor="var(--g)"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--g)]">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
            </svg>
          }
          change={`${safeRate}%`}
          changeSuffix="retention rate"
          changePositive
        />
        <StatCard
          label="Churn Risk Rate"
          value={`${data.churnRisk}%`}
          accentColor="var(--r)"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--r)]">
              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
            </svg>
          }
          change={data.churnRisk > 10 ? 'High' : 'Healthy'}
          changeSuffix="risk threshold"
          changePositive={data.churnRisk <= 10}
        />
        <StatCard
          label="Predicted Churn"
          value={data.predictedChurn.toLocaleString('en-US')}
          accentColor="var(--o)"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--o)]">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
          change="High risk"
          changeSuffix="customers flagged"
          changePositive={false}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-12 gap-4">

        {/* ── Left column (8/12) ── */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="md:col-span-3">
              <ChurnTrendChart data={riskData} />
            </Card>
            <Card className="md:col-span-2">
              <CustomerFlowChart data={flowData} />
            </Card>
          </div>

          {/* Customer Segments — using real segments table data with same cards as SegmentationPage */}
          <Card className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[13px] font-bold text-gray-900">Customer Segments</h3>
                <div className="text-[11px] text-gray-400 mt-0.5">Behavioral cohort from latest prediction</div>
              </div>
              <Link href="/dashboard/segmentation" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                View All →
              </Link>
            </div>

            {hasSegments ? (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 flex-1">
                {segments.map((s: any) => {
                  const colorSet = getFallbackPalette(s.name);
                  return (
                    <div
                      key={s.name}
                      className="h-full rounded-xl border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-sm hover:border-gray-200 transition-all duration-200 cursor-default"
                    >
                      {/* Icon + high-risk badge */}
                      <div className="flex items-start justify-between">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorSet.iconBgClass}`}
                        >
                          {getSegmentIcon(s.name, colorSet.textClass)}
                        </div>
                        {s.pctHighRisk > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-500">
                            {s.pctHighRisk}% risk
                          </span>
                        )}
                      </div>

                      {/* Name & Hero Metric - Wrapped in flex-1 to push bottom part down */}
                      <div className="flex-1">
                        <p className="text-[11px] text-gray-400 font-medium leading-tight mb-0.5">Segment</p>
                        <p className="text-[12px] font-bold text-gray-800 leading-snug mb-2">{s.name}</p>
                        
                        <div className={`text-2xl font-black leading-none tracking-tight ${colorSet.textClass}`}>
                          {s.count.toLocaleString('en-US')}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">customers</div>
                      </div>

                      {/* Progress bar + percentage */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-400">Share</span>
                          <span className="text-[10px] font-bold" style={{ color: colorSet.hex }}>{s.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${s.pct}%`, backgroundColor: colorSet.hex }}
                          />
                        </div>
                      </div>

                      {/* Avg MRR */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                        <span className="text-[10px] text-[var(--t4)] font-bold uppercase tracking-wider">Avg MRR</span>
                        <span className={`text-[12px] font-black ${colorSet.textClass}`}>{s.avgMrr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg1)] border border-[var(--b)] flex items-center justify-center mb-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                </div>
                <p className="text-[12px] font-bold text-[var(--t2)] uppercase tracking-wider">No segment data yet</p>
                <p className="text-[11px] text-[var(--t4)] max-w-[220px] leading-relaxed">
                  Upload and process a dataset to see behavioral customer segments.
                </p>
                <Link href="/dashboard/data-management" className="mt-1 text-[11px] font-black text-[var(--t)] hover:opacity-70 transition-opacity">
                  Upload Dataset →
                </Link>
              </div>
            )}
          </Card>

        </div>

        {/* ── Right column (4/12) ── */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">

          {/* Distribution donut */}
          <Card>
            <DonutChart data={planData} />
          </Card>

          {/* Insights panel */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-bold text-[var(--t)]">Insights</h3>
              {alerts.some(a => a.level === 'high') && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--r)] text-[9px] font-black text-[var(--inv-t)]">
                  !
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-[var(--bg1)] border border-transparent hover:border-[var(--b)]">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: a.level === 'high' ? 'var(--r)' : a.level === 'med' ? 'var(--y)' : 'var(--g)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--t2)] leading-snug">{a.label}</div>
                    <div className="text-[10px] text-[var(--t4)] mt-0.5 font-bold uppercase tracking-wider">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick actions */}
          <Card className="flex-1 flex flex-col">
            <h3 className="text-[13px] font-bold text-[var(--t)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="h-full flex flex-col items-start gap-3 p-4 rounded-xl border border-[var(--b)] hover:border-[var(--b3)] hover:shadow-sm transition-all duration-300 group"
                  style={{ background: action.bg }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'var(--surf)', border: '1px solid var(--b)' }}>
                    <span className="text-[14px] font-bold" style={{ color: action.color }}>{action.icon}</span>
                  </div>
                  <span className="text-[11.5px] font-bold leading-tight" style={{ color: 'var(--t)' }}>
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
}
