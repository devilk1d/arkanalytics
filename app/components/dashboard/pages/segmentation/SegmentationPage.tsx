'use client';

import { useState } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import StatCard from '../../ui/StatCard';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import SearchBar from '../../ui/SearchBar';
import Select from '../../ui/Select';
import ProgressBar from '../../ui/ProgressBar';
import ClusterChart from '../../charts/ClusterChart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const segmentStats = [
  { label: 'Loyal Champions', value: '487',   badge: '17.1%', avgMrr: '$2,845', totalMrr: '$1388K', color: 'text-green-500',  iconBg: 'bg-green-50',  icon: '⭐', badgeBg: 'bg-green-100 text-green-700' },
  { label: 'At Risk',         value: '324',   badge: '11.4%', avgMrr: '$456',   totalMrr: '$148K',  color: 'text-red-500',    iconBg: 'bg-red-50',    icon: '⚠️', badgeBg: 'bg-red-100 text-red-700'   },
  { label: 'New Adopters',    value: '892',   badge: '31.3%', avgMrr: '$187',   totalMrr: '$167K',  color: 'text-blue-500',   iconBg: 'bg-blue-50',   icon: '📈', badgeBg: 'bg-blue-100 text-blue-700' },
  { label: 'High Value',      value: '1,144', badge: '40.3%', avgMrr: '$1,234', totalMrr: '$1412K', color: 'text-purple-500', iconBg: 'bg-purple-50', icon: '👥', badgeBg: 'bg-purple-100 text-purple-700' },
];

const customers = [
  { id: 'C-0001', name: 'Acme Corporation',  email: 'contact@acme.com',   plan: 'Enterprise',   mrr: '$4,200', segment: 'Loyal Champions', score: 96 },
  { id: 'C-0002', name: 'TechStart Inc.',     email: 'hello@techstart.io', plan: 'Professional', mrr: '$450',   segment: 'At Risk',         score: 58 },
  { id: 'C-0003', name: 'Global Solutions',   email: 'info@globalsol.com', plan: 'Enterprise',   mrr: '$5,198', segment: 'New Adopters',    score: 67 },
  { id: 'C-0004', name: 'StartupHub',         email: 'team@starthub.co',  plan: 'Starter',      mrr: '$2,110', segment: 'High Value',      score: 75 },
  { id: 'C-0005', name: 'DataFlow Systems',   email: 'sup@dataflow.com',  plan: 'Professional', mrr: '$2,980', segment: 'Loyal Champions', score: 89 },
  { id: 'C-0006', name: 'CloudVentures',      email: 'contact@cloudvn.io',plan: 'Enterprise',   mrr: '$150',   segment: 'New Adopters',    score: 65 },
];

const segmentColors: Record<string, string> = {
  'Loyal Champions': 'bg-green-100 text-green-700',
  'At Risk':         'bg-red-100 text-red-700',
  'New Adopters':    'bg-blue-100 text-blue-700',
  'High Value':      'bg-purple-100 text-purple-700',
};

const barData = [
  { name: 'At Risk',         count: 324,   fill: '#ef4444' },
  { name: 'New Adopters',    count: 892,   fill: '#3b82f6' },
  { name: 'High Value',      count: 1144,  fill: '#a855f7' },
  { name: 'Loyal Champions', count: 487,   fill: '#22c55e' },
];

export default function SegmentationPage() {
  const [search, setSearch] = useState('');
  const [seg, setSeg] = useState('all');

  return (
    <DashboardLayout page="Customer Segmentation">
      {/* Segment stat cards */}
      <div className="flex gap-4 mb-4">
        {segmentStats.map(s => (
          <Card key={s.label} className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.badgeBg}`}>{s.badge}</span>
            </div>
            <p className="text-xs text-gray-400">
              Avg MRR: <span className="text-blue-600 font-semibold">{s.avgMrr}</span>
              {' · '}Total MRR: <span className="text-blue-600 font-semibold">{s.totalMrr}</span>
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: Table */}
        <div className="col-span-7">
          <div className="flex items-center gap-3 mb-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by ID or Customer..." className="flex-1" />
            <Select value={seg} onChange={setSeg} prefix="filter"
              options={[{ label: 'All Segments', value: 'all' }, ...segmentStats.map(s => ({ label: s.label, value: s.label }))]} />
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-xl font-medium whitespace-nowrap">3,000 customers</span>
          </div>

          <Card padding="none">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['ID', 'Customer', 'Plan', 'MRR', 'Segment', 'Score'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.filter(c =>
                  (seg === 'all' || c.segment === seg) &&
                  (c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search))
                ).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-black">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.plan}</td>
                    <td className="px-4 py-3 text-sm font-bold text-black">{c.mrr}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${segmentColors[c.segment]}`}>{c.segment}</span>
                    </td>
                    <td className="px-4 py-3 w-28">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={c.score} color="blue" height="sm" />
                        <span className="text-xs text-gray-600 shrink-0">{c.score}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing 6 of 13,000 results</p>
              <div className="flex items-center gap-2">
                <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40" disabled>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span className="text-xs font-medium text-gray-600">1 / 600</span>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <Select value="9" onChange={() => {}} options={[{ label: '9', value: '9' }, { label: '25', value: '25' }]} />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Charts */}
        <div className="col-span-5 flex flex-col gap-4">
          <Card><ClusterChart /></Card>
          <Card>
            <h3 className="text-sm font-bold text-black mb-0.5">Segment Distribution</h3>
            <p className="text-xs text-gray-400 mb-4">Customer count by segment</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 10 }} barSize={14}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => [`${v} customers`]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
