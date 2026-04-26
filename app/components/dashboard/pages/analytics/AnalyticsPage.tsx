'use client';

import { useState } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import SearchBar from '../../ui/SearchBar';
import Select from '../../ui/Select';
import ProgressBar from '../../ui/ProgressBar';
import AnalyzeModal from './AnalyzeModal';
import { RetainModal, SendOfferModal } from './ActionModals';
import ViewProfileModal from './ViewProfileModal';

const customers = [
  { id: 'C-0001', name: 'Acme Corporation',  email: 'contact@acme.com',   plan: 'Enterprise',   contract: 'Annual',   activity: '2 hours ago',  usage: 89, churnRisk: 12, riskLevel: 'low'  as const, users: 10, mrr: '$4,200', since: 'Jan 2024', engagement: 92, platformUsage: 89 },
  { id: 'C-0002', name: 'TechStart Inc.',     email: 'hello@techstart.io', plan: 'Professional', contract: 'Monthly',  activity: '5 hours ago',  usage: 45, churnRisk: 87, riskLevel: 'high' as const, users: 8,  mrr: '$450',   since: 'Mar 2024', engagement: 42, platformUsage: 45 },
  { id: 'C-0003', name: 'Global Solutions',   email: 'info@globalsol.com', plan: 'Enterprise',   contract: 'Annual',   activity: '1 day ago',    usage: 92, churnRisk: 8,  riskLevel: 'low'  as const, users: 10, mrr: '$5,198', since: 'Nov 2023', engagement: 95, platformUsage: 92 },
  { id: 'C-0004', name: 'StartupHub',         email: 'team@starthub.co',  plan: 'Starter',      contract: 'Monthly',  activity: '3 hours ago',  usage: 51, churnRisk: 46, riskLevel: 'med'  as const, users: 7,  mrr: '$2,110', since: 'Jun 2024', engagement: 55, platformUsage: 51 },
  { id: 'C-0005', name: 'DataFlow Systems',   email: 'sup@dataflow.com',  plan: 'Professional', contract: 'Monthly',  activity: '15 hours ago', usage: 67, churnRisk: 24, riskLevel: 'low'  as const, users: 15, mrr: '$2,980', since: 'Feb 2024', engagement: 72, platformUsage: 67 },
  { id: 'C-0006', name: 'CloudVentures',      email: 'contact@cloudvn.io',plan: 'Enterprise',   contract: 'Monthly',  activity: '4 hours ago',  usage: 12, churnRisk: 98, riskLevel: 'high' as const, users: 5,  mrr: '$150',   since: 'Aug 2024', engagement: 10, platformUsage: 12 },
  { id: 'C-0007', name: 'InnovateLabs',       email: 'hello@inlabs.com',  plan: 'Starter',      contract: 'Monthly',  activity: '1 week ago',   usage: 85, churnRisk: 15, riskLevel: 'low'  as const, users: 11, mrr: '$2,499', since: 'Jan 2024', engagement: 88, platformUsage: 85 },
  { id: 'C-0008', name: 'Megacorp Ind.',      email: 'admin@mega.com',    plan: 'Enterprise',   contract: 'Annual',   activity: '6 hours ago',  usage: 34, churnRisk: 72, riskLevel: 'high' as const, users: 6,  mrr: '$1,450', since: 'Apr 2024', engagement: 38, platformUsage: 34 },
  { id: 'C-0009', name: 'Nora Co.',           email: 'contact@nora.com',  plan: 'Enterprise',   contract: 'Monthly',  activity: '8 hours ago',  usage: 52, churnRisk: 45, riskLevel: 'med'  as const, users: 9,  mrr: '$2,076', since: 'May 2024', engagement: 58, platformUsage: 52 },
];

const planColors: Record<string, string> = {
  Enterprise: 'bg-blue-100 text-blue-700',
  Professional: 'bg-purple-100 text-purple-700',
  Starter: 'bg-gray-100 text-gray-700',
};

export default function AnalyticsPage() {
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [contract, setContract] = useState('all');

  const [analyzeCustomer, setAnalyzeCustomer] = useState<typeof customers[0] | null>(null);
  const [retainCustomer, setRetainCustomer]   = useState<typeof customers[0] | null>(null);
  const [offerCustomer, setOfferCustomer]     = useState<typeof customers[0] | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<typeof customers[0] | null>(null);

  const filtered = customers.filter(c =>
    (plan === 'all' || c.plan.toLowerCase() === plan) &&
    (contract === 'all' || c.contract.toLowerCase() === contract) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search) || c.email.includes(search))
  );

  return (
    <DashboardLayout page="Customer Analytics">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ID, Customer, or Email..." className="w-72" />
        <Select value={plan} onChange={setPlan} prefix="filter"
          options={[{ label: 'All Plans', value: 'all' }, { label: 'Enterprise', value: 'enterprise' }, { label: 'Professional', value: 'professional' }, { label: 'Starter', value: 'starter' }]} />
        <Select value={contract} onChange={setContract} prefix="filter"
          options={[{ label: 'All Contract', value: 'all' }, { label: 'Annual', value: 'annual' }, { label: 'Monthly', value: 'monthly' }]} />
      </div>

      {/* Table */}
      <Card padding="none">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left"><input type="checkbox" className="rounded" /></th>
              {['ID', 'Customer', 'Plan', 'Contract', 'Last Activity', 'Usage', 'Churn Risk', 'Risk Level', 'Users', 'MRR', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><input type="checkbox" className="rounded" /></td>
                <td className="px-3 py-3 text-xs font-mono text-gray-500">{c.id}</td>
                <td className="px-3 py-3">
                  <p className="text-sm font-semibold text-black">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${planColors[c.plan]}`}>{c.plan}</span>
                </td>
                <td className="px-3 py-3 text-xs text-gray-600">{c.contract}</td>
                <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{c.activity}</td>
                <td className="px-3 py-3 w-28">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={c.usage} height="sm" />
                    <span className="text-xs text-gray-600 shrink-0">{c.usage}%</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-sm font-bold ${c.riskLevel === 'low' ? 'text-green-500' : c.riskLevel === 'high' ? 'text-red-500' : 'text-yellow-500'}`}>
                    {c.churnRisk}%
                  </span>
                </td>
                <td className="px-3 py-3"><Badge label={c.riskLevel.charAt(0).toUpperCase() + c.riskLevel.slice(1)} variant={c.riskLevel} /></td>
                <td className="px-3 py-3 text-xs text-gray-600">{c.users}</td>
                <td className="px-3 py-3 text-sm font-bold text-black">{c.mrr}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Button size="sm" onClick={() => setAnalyzeCustomer(c)}>Analyze</Button>
                    <button onClick={() => setProfileCustomer(c)} className="text-xs font-semibold text-gray-600 hover:text-black transition-colors">View Profile</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">Showing {filtered.length} of 13,000 results</p>
          <div className="flex items-center gap-2">
            <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black transition-colors disabled:opacity-40" disabled>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-xs text-gray-600 font-medium">1 / 600</span>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <Select value="9" onChange={() => {}} options={[{ label: '9', value: '9' }, { label: '25', value: '25' }, { label: '50', value: '50' }]} />
          </div>
        </div>
      </Card>

      {/* Modals */}
      <AnalyzeModal
        customer={analyzeCustomer}
        open={!!analyzeCustomer}
        onClose={() => setAnalyzeCustomer(null)}
        onRetain={() => { setRetainCustomer(analyzeCustomer); setAnalyzeCustomer(null); }}
        onSendOffer={() => { setOfferCustomer(analyzeCustomer); setAnalyzeCustomer(null); }}
      />
      <RetainModal customer={retainCustomer} open={!!retainCustomer} onClose={() => setRetainCustomer(null)} customerName={retainCustomer?.name || ''} />
      <SendOfferModal customer={offerCustomer} open={!!offerCustomer} onClose={() => setOfferCustomer(null)} customerName={offerCustomer?.name || ''} />
      <ViewProfileModal customer={profileCustomer} open={!!profileCustomer} onClose={() => setProfileCustomer(null)} />
    </DashboardLayout>
  );
}
