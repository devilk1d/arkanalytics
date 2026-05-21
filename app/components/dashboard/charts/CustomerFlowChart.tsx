'use client';

import { useState, useEffect, memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Tabs from '../ui/Tabs';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
        <p className="font-bold mb-1">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 grayscale-[0.5]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="opacity-70">{p.name}</span>
              </span>
              <span className="font-black text-[var(--inv-t)]">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomerFlowChart = ({ data }: { data?: any }) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [period, setPeriod] = useState('Month');
  
  // If no data or empty, use a placeholder or empty state
  const chartData = data && data[period.toLowerCase()] ? data[period.toLowerCase()] : [];

  if (!isMounted) return <div className="h-full min-h-[220px]" />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--t)]">Customer Flow</h3>
          <p className="text-[11px] text-[var(--t3)] mt-0.5">Tracking acquisition vs churn</p>
        </div>
        <Tabs
          tabs={[
            { label: 'Week', value: 'Week' },
            { label: 'Month', value: 'Month' },
            { label: 'Year', value: 'Year' }
          ]}
          active={period}
          onChange={setPeriod}
          variant="pill"
        />
      </div>

      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e40af" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#1e40af" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="var(--b)" vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }} 
              axisLine={false} 
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }} 
              axisLine={false} 
              tickLine={false} 
              width={45}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--b)', strokeWidth: 1 }} />
            
            <Area 
              type="monotone" 
              dataKey="new" 
              name="New" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorNew)" 
              activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
            />
            <Area 
              type="monotone" 
              dataKey="churned" 
              name="Lost" 
              stroke="#60a5fa" 
              strokeWidth={1.5} 
              strokeDasharray="4 2"
              fillOpacity={1} 
              fill="url(#colorLost)" 
              activeDot={{ r: 4, strokeWidth: 0, fill: '#60a5fa' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-5 mt-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1 rounded-full bg-[#3b82f6]" />
          <span className="text-[11px] font-bold text-[var(--t2)] uppercase tracking-wider">New Acquisition</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1 rounded-full bg-[#60a5fa] opacity-60" />
          <span className="text-[11px] font-bold text-[var(--t2)] uppercase tracking-wider">Customer Lost</span>
        </div>
      </div>
    </div>
  );
};

export default memo(CustomerFlowChart);
