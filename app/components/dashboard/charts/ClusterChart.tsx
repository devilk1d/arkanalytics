'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { getSegmentColorway } from '../pages/segmentation/SegmentationPage';

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
          const colorSet = getSegmentColorway(seg);

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
      <h3 className="text-lg font-bold text-black mb-0.5">Customer Cluster Visualization</h3>
      <p className="text-sm text-gray-400 mb-4">Engagement score vs Monthly Revenue</p>

      {loading ? (
        <div className="w-full h-[200px] flex items-center justify-center bg-gray-50/50 rounded-xl">
          <p className="text-xs text-gray-400 animate-pulse">Loading clusters...</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 5, right: 30, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="y" tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl border border-gray-800">
                        <p>Engagement: {payload[0]?.value}%</p>
                        <p>Revenue: ${payload[1]?.value}</p>
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

          <div className="flex flex-wrap gap-3 mt-2">
            {filteredClusters.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-xs text-gray-500">{c.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
