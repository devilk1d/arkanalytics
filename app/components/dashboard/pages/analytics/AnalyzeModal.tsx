'use client';

import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Card from '../../ui/Card';

interface Customer {
  id: string; name: string; email: string; churnRisk: number; riskLevel: 'low' | 'med' | 'high';
  mrr: string; plan: string; since: string; engagement: number; platformUsage: number;
}

interface AnalyzeModalProps { customer: Customer | null; open: boolean; onClose: () => void; onRetain: () => void; onSendOffer: () => void; }

export default function AnalyzeModal({ customer, open, onClose, onRetain, onSendOffer }: AnalyzeModalProps) {
  if (!customer) return null;
  const isLow = customer.riskLevel === 'low';

  return (
    <Modal open={open} onClose={onClose} title="Customer Analysis" subtitle={`Detailed analysis and insights for ${customer.name}`}>
      {/* Customer header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-black">{customer.name}</h3>
          <p className="text-sm text-gray-400">{customer.email}</p>
          <p className="text-xs text-gray-400 mt-1">Customer since {customer.since}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 text-right">
          <p className="text-xs text-gray-500 mb-1">Churn Analysis</p>
          <p className={`text-3xl font-black ${isLow ? 'text-green-500' : customer.riskLevel === 'high' ? 'text-red-500' : 'text-yellow-500'}`}>
            {customer.churnRisk}%
          </p>
          <Badge label={customer.riskLevel.charAt(0).toUpperCase() + customer.riskLevel.slice(1)} variant={customer.riskLevel} className="mt-1" />
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 3.54 8.54L21 16l-1.41 1.41L14 11.87A5 5 0 1 1 12 2z"/>
          </svg>
          <span className="text-sm font-semibold text-blue-700">AI Insights</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {isLow
            ? 'This customer demonstrates strong engagement and low churn risk. They are well-retained with consistent usage patterns and high satisfaction indicators.'
            : 'This customer shows declining engagement patterns. Immediate outreach is recommended to prevent churn. Consider a personalized retention offer.'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button onClick={onRetain} className="justify-center">Retain Customer</Button>
        <Button onClick={onSendOffer} variant="secondary" className="justify-center">Send Offer</Button>
      </div>

      {/* Feature Importance */}
      <p className="text-sm font-bold text-black mb-3">Feature Importance</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Engagement Score', value: `${customer.engagement}%` },
          { label: 'Platform Usage',   value: `${customer.platformUsage}%` },
          { label: 'Monthly Revenue',  value: customer.mrr },
          { label: 'Plan Type',        value: customer.plan },
        ].map(item => (
          <Card key={item.label} className="bg-gray-50 border-0">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-500">{item.label}</p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <p className="text-2xl font-black text-green-500">{item.value}</p>
          </Card>
        ))}
      </div>
    </Modal>
  );
}
