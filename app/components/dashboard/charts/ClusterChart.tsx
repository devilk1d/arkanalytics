'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { getFallbackPalette, normalizeSegmentLabel } from '../pages/segmentation/SegmentationPage';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const name = payload[0].name || data.name;
    const color = payload[0].color || payload[0].fill;
    
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-4 py-3 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95 min-w-[140px]">
        <p className="font-bold mb-2 opacity-70 uppercase tracking-widest text-[9px]" style={{ color: color }}>{name}</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="opacity-60">Engagement</span>
            <span className="font-black text-[var(--inv-t)]">{Math.round(data.x)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="opacity-60">Revenue</span>
            <span className="font-black text-[var(--inv-t)]">${Math.round(data.y).toLocaleString('en-US')}</span>
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

  const [clusters, setClusters] = useState<{name: string, color: string, data: any[], count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [localSegment, setLocalSegment] = useState<string>('all');
  
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    setLocalSegment(activeSegment || 'all');
  }, [activeSegment]);

  useEffect(() => {
    async function loadData() {
      if (!datasetId) return;
      setLoading(true);

      const supabase = createClient();
      
      // 1. Fetch exact total customers from segments table
      const { data: segmentData } = await supabase
        .from('segments')
        .select('segment_label, total_customers')
        .eq('dataset_id', datasetId);
        
      const countsMap: Record<string, number> = {};
      if (segmentData) {
        segmentData.forEach((s: any) => {
          countsMap[s.segment_label] = s.total_customers;
        });
      }

      // 2. Fetch sample dots for visualization
      const { data, error } = await supabase
        .from('predictions')
        .select('segment_label, churn_score, segment_rfm_context')
        .eq('dataset_id', datasetId)
        .limit(2000); // sample for performance

      if (!error && data) {
        const grouped: Record<string, any[]> = {};
        data.forEach(d => {
          const rawSeg = d.segment_label || 'Unknown';
          const seg = normalizeSegmentLabel(rawSeg);
          if (!grouped[seg]) grouped[seg] = [];
          
          // Use 100 - churn_score as Engagement Score (0-100)
          const engagement = Math.round(Math.max(0, 100 - (d.churn_score || 0)));
          const revenue = d.segment_rfm_context?.total_revenue?.customer || 0;
          
          grouped[seg].push({ x: engagement, y: Math.round(revenue), name: seg });
        });

        // Normalize the countsMap keys too
        const normalizedCountsMap: Record<string, number> = {};
        Object.entries(countsMap).forEach(([rawKey, count]) => {
          const normalized = normalizeSegmentLabel(rawKey);
          normalizedCountsMap[normalized] = (normalizedCountsMap[normalized] || 0) + count;
        });

        // Order segments: use normalized segmentOrder if provided
        const segKeys = segmentOrder
          ? segmentOrder.filter(s => normalizedCountsMap[s] !== undefined || grouped[s])
          : Object.keys(normalizedCountsMap).length > 0 ? Object.keys(normalizedCountsMap) : Object.keys(grouped);
        
        // Add any remaining segments not in segmentOrder
        Object.keys(grouped).forEach(k => {
          if (!segKeys.includes(k)) segKeys.push(k);
        });

        const newClusters = segKeys.map(seg => {
          const colorSet = getFallbackPalette(seg);
          return {
            name: seg,
            color: colorSet.hex,
            data: grouped[seg] || [],
            count: normalizedCountsMap[seg] !== undefined ? normalizedCountsMap[seg] : (grouped[seg] ? grouped[seg].length : 0)
          };
        });

        setClusters(newClusters);
      }
      setLoading(false);
    }
    loadData();
  }, [datasetId, segmentOrder?.join(',')]);

  const filteredClusters = localSegment && localSegment !== 'all'
    ? clusters.filter(c => c.name === localSegment)
    : clusters;

  if (!isMounted) return <div className="h-full min-h-[300px]" />;

  return (
    <div className="h-full flex flex-col">
      {loading ? (
        <div className="flex-1 min-h-[300px] flex items-center justify-center bg-[var(--bg1)] rounded-2xl border border-[var(--b)] border-dashed">
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin text-[var(--b3)]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-[10px] font-bold text-[var(--t4)] uppercase tracking-widest">Loading points...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-[300px] overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={350}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
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
                padding={{ left: 10, right: 10 }}
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
                label={{ value: 'Revenue', angle: -90, position: 'insideLeft', fontSize: 9, fontWeight: 700, fill: 'var(--t4)', offset: 0, dx: -5 }}
                padding={{ top: 20, bottom: 20 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--b)' }} />
              
              {filteredClusters.map((c, idx) => (
                <Scatter 
                  key={`scatter-${c.name}-${idx}`} 
                  name={c.name} 
                  data={c.data} 
                  fill={c.color} 
                  isAnimationActive={false}
                >
                  {c.data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={c.color} 
                      opacity={0.8}
                    />
                  ))}
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-4 border-t border-[var(--b)] shrink-0">
          {clusters.map(c => (
            <div key={c.name} className="flex items-center gap-2 group transition-all cursor-default">
              <span className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-transparent group-hover:ring-[var(--b2)]" style={{ backgroundColor: c.color }} />
              <span className="text-[10px] text-[var(--t2)] font-bold uppercase tracking-wider">{c.name}</span>
              <span className="text-[10px] text-[var(--t4)] font-mono">{c.count.toLocaleString('en-US')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


