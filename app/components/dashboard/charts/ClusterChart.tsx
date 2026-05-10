'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { PALETTE, getFallbackPalette } from '../pages/segmentation/SegmentationPage';

export default function ClusterChart({ segmentOrder, activeSegment }: { segmentOrder?: string[], activeSegment?: string }) {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('dataset_id');

  const [clusters, setClusters] = useState<{ name: string, color: string, data: any[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!datasetId) return;
      setLoading(true);

      const supabase = createClient();
      const { data, error } = await supabase
        .from('predictions')
        .select('segment_label, churn_score, segment_rfm_context')
        .eq('dataset_id', datasetId)
        .limit(1000);

      if (!error && data) {
        const grouped: Record<string, any[]> = {};
        data.forEach(d => {
          const seg = d.segment_label || 'Unknown';
          if (!grouped[seg]) grouped[seg] = [];

          // Use 100 - churn_score as Engagement Score (0-100)
          const engagement = Math.round(Math.max(0, 100 - (d.churn_score || 0)));
          const revenue = d.segment_rfm_context?.total_revenue?.customer || 0;

          grouped[seg].push({ x: engagement, y: Math.round(revenue) });
        });

        const newClusters = Object.keys(grouped).map((seg) => {
          const colorSet = getFallbackPalette(seg);

          return {
            name: seg,
            color: colorSet.hex,
            data: grouped[seg]
          };
        });
        setClusters(newClusters);
      }
      setLoading(false);
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, segmentOrder?.join(',')]);

  const filteredClusters = activeSegment && activeSegment !== 'all'
    ? clusters.filter(c => c.name === activeSegment)
    : clusters;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--t)]">Customer Cluster Visualization</h3>
          <p className="text-[11px] text-[var(--t3)] mt-0.5">Engagement score vs Monthly Revenue</p>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-[200px] flex items-center justify-center bg-[var(--bg1)] rounded-xl border border-[var(--b)]">
          <p className="text-[10px] font-medium text-[var(--t3)] animate-pulse">Loading clusters...</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 5, right: 30, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--b)" vertical={false} />
              <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
                tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="y" tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
                tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
                        <p className="opacity-90">Engagement: <span className="font-black text-[var(--inv-t)]">{payload[0]?.value}%</span></p>
                        <p className="opacity-90">Revenue: <span className="font-black text-[var(--inv-t)]">${payload[1]?.value}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {filteredClusters.map(c => (
                <Scatter key={c.name} name={c.name} data={c.data} fill={c.color} opacity={0.85} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          <div className="flex flex-wrap gap-4 mt-3">
            {filteredClusters.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-[11px] text-[var(--t3)] font-medium">{c.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
