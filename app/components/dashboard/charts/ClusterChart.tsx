'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { getFallbackPalette } from '../pages/segmentation/SegmentationPage';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-4 py-3 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95 min-w-[140px]">
        <p className="font-bold mb-2 opacity-70 uppercase tracking-widest text-[9px]" style={{ color: data.color }}>{data.name}</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="opacity-60">Avg. Engagement</span>
            <span className="font-black text-[var(--inv-t)]">{Math.round(data.x)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="opacity-60">Avg. Revenue</span>
            <span className="font-black text-[var(--inv-t)]">${Math.round(data.y).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-[var(--inv-t)]/10 text-[var(--inv-t)]">
            <span className="opacity-60 font-bold">Total Size</span>
            <span className="font-black">{data.z.toLocaleString()} customers</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ClusterChart({ segmentOrder, activeSegment }: { segmentOrder?: string[], activeSegment?: string }) {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('dataset_id');

  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    async function loadData() {
      if (!datasetId) return;
      setLoading(true);

      const supabase = createClient();
      // Fetch from pre-calculated segments table for 100% accuracy and better performance
      const { data, error } = await supabase
        .from('segments')
        .select('segment_label, avg_churn_score, avg_revenue, total_customers')
        .eq('dataset_id', datasetId);

      if (!error && data) {
        const newClusters = data.map((s: any) => {
          const colorSet = getFallbackPalette(s.segment_label);
          return {
            name: s.segment_label,
            x: Math.max(0, 100 - (s.avg_churn_score || 0)),
            y: s.avg_revenue || 0,
            z: s.total_customers || 0,
            color: colorSet.hex
          };
        });

        setClusters(newClusters);
      }
      setLoading(false);
    }
    loadData();
  }, [datasetId, segmentOrder?.join(',')]);

  const filteredData = activeSegment && activeSegment !== 'all'
    ? clusters.filter(c => c.name === activeSegment)
    : clusters;

  if (!isMounted) return <div className="h-full min-h-[220px]" />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--t)]">Customer Engagement Matrix</h3>
          <p className="text-[11px] text-[var(--t3)] mt-0.5 font-medium">Bubble size represents segment population</p>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-[220px] flex items-center justify-center bg-[var(--bg1)] rounded-2xl border border-[var(--b)] border-dashed">
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin text-[var(--b3)]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-[10px] font-bold text-[var(--t4)] uppercase tracking-widest">Aggregating clusters...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <ScatterChart margin={{ top: 20, right: 60, bottom: 20, left: 10 }}>
              <defs>
                {clusters.map((c, i) => (
                  <radialGradient key={`bubble-grad-${i}`} id={`bubbleGrad-${i}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor={c.color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={c.color} stopOpacity={0.4} />
                  </radialGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="var(--b)" vertical={false} opacity={0.5} />
              <XAxis 
                type="number" 
                dataKey="x" 
                domain={[0, 100]} 
                tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
                tickFormatter={(v) => `${v}%`} 
                axisLine={false} 
                tickLine={false}
                tickCount={5}
                label={{ value: 'Engagement', position: 'insideBottomRight', offset: -10, fontSize: 9, fontWeight: 700, fill: 'var(--t4)' }}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
                tickFormatter={(v) => v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v}`} 
                axisLine={false} 
                tickLine={false} 
                width={50}
                tickCount={5}
                label={{ value: 'Revenue', angle: -90, position: 'insideLeft', fontSize: 9, fontWeight: 700, fill: 'var(--t4)', offset: 10 }}
                padding={{ top: 20, bottom: 20 }}
              />
              <ZAxis type="number" dataKey="z" range={[500, 5000]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--b)' }} />
              
              <Scatter data={filteredData} animationDuration={1500} animationEasing="ease-out">
                {filteredData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#bubbleGrad-${index})`} 
                    stroke={entry.color} 
                    strokeWidth={2}
                    style={{ filter: `drop-shadow(0px 4px 12px ${entry.color}33)` }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 border-t border-[var(--b)] pt-4">
          {clusters.map(c => (
            <div key={c.name} className="flex items-center gap-2 group transition-all cursor-default">
              <span className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-transparent group-hover:ring-[var(--b2)]" style={{ backgroundColor: c.color }} />
              <span className="text-[10px] text-[var(--t2)] font-bold uppercase tracking-wider">{c.name}</span>
              <span className="text-[10px] text-[var(--t4)] font-mono">{c.z.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


