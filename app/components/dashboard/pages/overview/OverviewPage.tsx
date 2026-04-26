'use client';

import DashboardLayout from '../../layout/DashboardLayout';
import StatCard from '../../ui/StatCard';
import Card from '../../ui/Card';
import Avatar from '../../ui/Avatar';
import Button from '../../ui/Button';
import ChurnTrendChart from '../../charts/ChurnTrendChart';
import CustomerFlowChart from '../../charts/CustomerFlowChart';
import DonutChart from '../../charts/DonutChart';

const segments = [
  { name: 'Loyal Champions', pct: '17.1%', mrr: '$2,845', color: 'text-green-600', bg: 'bg-green-50', icon: '⭐' },
  { name: 'At Risk',         pct: '11.4%', mrr: '$456',   color: 'text-red-500',   bg: 'bg-red-50',   icon: '⚠️' },
  { name: 'New Adopters',    pct: '31.3%', mrr: '$187',   color: 'text-blue-600',  bg: 'bg-blue-50',  icon: '📈' },
  { name: 'High Value',      pct: '50.2%', mrr: '$1,268', color: 'text-purple-600',bg: 'bg-purple-50',icon: '👥' },
];

const chatMessages = [
  { initials: 'NP', name: 'Naufal Putra',      msg: "Got it! I'll reach out to them today.", time: '2h ago' },
  { initials: 'FA', name: 'Fawwaz Aiman',      msg: 'Can you check the latest analytics?',   time: '3h ago' },
  { initials: 'MM', name: 'Muhibuddin Muklish', msg: 'Can we schedule a quick sync?',         time: '3h ago' },
  { initials: 'RP', name: 'Rizqy Pratama',     msg: 'We should align on the Q3 goals.',       time: '4h ago' },
];

export default function OverviewPage() {
  return (
    <DashboardLayout page="Dashboard Overview">
      {/* Stat cards row */}
      <div className="flex gap-4 mb-4">
        <StatCard label="Total Customers" value="13,000" change="+12.5%" changePositive
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          iconBg="bg-blue-50"
        />
        <StatCard label="Active Customers" value="3,510" change="+8.5%" changePositive
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
          iconBg="bg-blue-50"
        />
        <StatCard label="Churn Rate" value="5.4%" change="-1.7%" changePositive={false}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>}
          iconBg="bg-blue-50"
        />
        <StatCard label="Predicted Churn" value="229" change="+3.4%" changePositive={false}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          iconBg="bg-blue-50"
        />
      </div>

      {/* Charts + Chat row */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Churn Trend */}
        <Card className="col-span-5"><ChurnTrendChart /></Card>
        {/* Customer Flow */}
        <Card className="col-span-4"><CustomerFlowChart /></Card>
        {/* Team Chat */}
        <Card className="col-span-3 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-black">Team Chat</h3>
          <Button variant="blue" className="w-full justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Group Chat
          </Button>
          <div className="flex flex-col gap-3 mt-1">
            {chatMessages.map(m => (
              <div key={m.initials} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 rounded-xl p-1.5 -mx-1.5 transition-colors">
                <Avatar initials={m.initials} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-black truncate">{m.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">{m.time}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">{m.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Distribution + Segments row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Donut */}
        <Card className="col-span-4"><DonutChart /></Card>

        {/* Customer Segments */}
        <Card className="col-span-8">
          <h3 className="text-sm font-bold text-black mb-4">Customer Segment</h3>
          <div className="grid grid-cols-4 gap-3">
            {segments.map(s => (
              <div key={s.name} className={`${s.bg} rounded-2xl p-4 flex flex-col gap-2`}>
                <div className="text-xl">{s.icon}</div>
                <p className="text-xs font-bold text-black">{s.name}</p>
                <div>
                  <p className="text-[10px] text-gray-500">Percentage</p>
                  <p className={`text-sm font-black ${s.color}`}>{s.pct}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Avg MRR</p>
                  <p className="text-sm font-black text-black">{s.mrr}</p>
                </div>
                <button className="text-[10px] font-semibold border border-current rounded-lg py-1 hover:bg-white/50 transition-colors">
                  View
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
