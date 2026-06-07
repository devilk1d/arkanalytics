'use client';

import { useState, useEffect, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2.5 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
        <p className="font-bold mb-1 opacity-70 uppercase tracking-widest text-[8px]">{d.payload.name}</p>
        <div className="flex items-center justify-between gap-4 mt-1">
          <span className="font-black text-[var(--inv-t)] text-xs">{d.value.toLocaleString('en-US')}</span>
          <span className="font-bold opacity-60">Customers</span>
        </div>
      </div>
    );
  }
  return null;
};

const SegmentDistributionChart = ({ data }: { data: any[] }) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const chartData = data && data.length > 0 ? data : [];

  if (!isMounted) return <div className="h-full min-h-[200px]" />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--t)]">Segment Distribution</h3>
          <p className="text-[11px] text-[var(--t3)] mt-0.5">Customer count by behavior cohort</p>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={350}>
          <BarChart 
            data={chartData} 
            layout="vertical" 
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }} 
            barSize={42}
            barCategoryGap="15%"
          >
            <defs>
              {chartData.map((d, i) => (
                <linearGradient key={`grad-${i}`} id={`gradSeg-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={d.fill} stopOpacity={0.9}/>
                  <stop offset="100%" stopColor={d.fill} stopOpacity={0.5}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="var(--b)" horizontal={false} vertical={true} opacity={0.3} />
            <XAxis 
              type="number" 
              tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 10, fill: 'var(--t2)', fontWeight: 700 }} 
              axisLine={false} 
              tickLine={false} 
              width={100}
              interval={0}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'var(--bg1)', opacity: 0.4, radius: 4 }} 
            />
            <Bar dataKey="count" radius={[6, 6, 6, 6]} isAnimationActive={false}>
              {chartData.map((entry, i) => (
                <Cell 
                  key={`cell-${i}`} 
                  fill={`url(#gradSeg-${i})`}
                  style={{ filter: `drop-shadow(2px 0px 4px ${entry.fill}22)` }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default memo(SegmentDistributionChart);
