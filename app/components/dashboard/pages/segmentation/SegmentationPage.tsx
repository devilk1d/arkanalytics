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
  
  if (lower.includes('risk') || lower.includes('churn') || lower.includes('danger') || lower.includes('leave') || lower.includes('unhappy') || lower.includes('dissatisfied') || lower.includes('poor') || lower.includes('bad') || lower.includes('low') || lower.includes('critical') || lower.includes('warning') || lower.includes('at-risk') || lower.includes('lost') || lower.includes('attrition')) {
    return PALETTE[0]; // Red
  }
  if (lower.includes('champion') || lower.includes('satisfied') || lower.includes('best') || lower.includes('active')) {
    return PALETTE[3]; // Emerald
  }
  if (lower.includes('new') || lower.includes('adopter') || lower.includes('recent') || lower.includes('starter')) {
    return PALETTE[1]; // Blue
  }
  if (lower.includes('value') || lower.includes('high') || lower.includes('premium') || lower.includes('whale') || lower.includes('tier') || lower.includes('big') || lower.includes('loyal')) {
    return PALETTE[2]; // Purple
  }
  if (lower.includes('bill') || lower.includes('price') || lower.includes('cost') || lower.includes('usage') || lower.includes('intensive') || lower.includes('budget')) {
    return PALETTE[4]; // Amber
  }
  if (lower.includes('potential') || lower.includes('interest') || lower.includes('lead') || lower.includes('promising')) {
    return PALETTE[5]; // Cyan
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
    dsId: string
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

    setLoading(false);
  }, [segmentStats.length, supabase]);

  useEffect(() => {
    if (!datasetId) return;
    loadData(datasetId);
  }, [datasetId, loadData]);

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
