'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const clusters = [
  { name: 'At Risk',         color: '#ef4444', data: [{ x: 20, y: 300 }, { x: 35, y: 450 }, { x: 15, y: 200 }, { x: 25, y: 600 }] },
  { name: 'New Adopters',    color: '#3b82f6', data: [{ x: 50, y: 180 }, { x: 60, y: 250 }, { x: 45, y: 320 }, { x: 70, y: 150 }] },
  { name: 'High Value',      color: '#a855f7', data: [{ x: 75, y: 1200 }, { x: 80, y: 2100 }, { x: 85, y: 1800 }, { x: 90, y: 2700 }] },
  { name: 'Loyal Champions', color: '#22c55e', data: [{ x: 88, y: 2900 }, { x: 92, y: 3400 }, { x: 95, y: 3100 }, { x: 98, y: 3600 }] },
];

export default function ClusterChart() {
  return (
    <div>
      <h3 className="text-sm font-bold text-black mb-0.5">Customer Cluster Visualization</h3>
      <p className="text-xs text-gray-400 mb-4">Engagement score vs Monthly Revenue</p>

      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
          <YAxis type="number" dataKey="y" tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
                    <p>Engagement: {payload[0]?.value}%</p>
                    <p>Revenue: ${payload[1]?.value}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          {clusters.map(c => (
            <Scatter key={c.name} name={c.name} data={c.data} fill={c.color} opacity={0.85} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-3 mt-2">
        {clusters.map(c => (
          <div key={c.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-xs text-gray-500">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
