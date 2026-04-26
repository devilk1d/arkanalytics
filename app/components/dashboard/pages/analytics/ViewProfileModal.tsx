'use client';

import { useState } from 'react';
import Modal from '../../ui/Modal';
import Badge from '../../ui/Badge';
import Tabs from '../../ui/Tabs';
import Avatar from '../../ui/Avatar';
import Card from '../../ui/Card';

const contacts = [
  { initials: 'SJ', name: 'Sarah Jhonson',  role: 'CTO',            dept: 'Technology', email: 'sarah.j@acme.com',   phone: '+1 (555) 123-4567' },
  { initials: 'MC', name: 'Michael Chen',   role: 'VP Operations',  dept: 'Operations', email: 'michael.c@acme.com', phone: '+1 (555) 123-4568' },
  { initials: 'ED', name: 'Emily Davis',    role: 'Product Manager', dept: 'Product',    email: 'emily.d@acme.com',   phone: '+1 (555) 123-4569' },
];

interface Customer { name: string; email: string; plan: string; mrr: string; platformUsage: number; since: string; }
interface ViewProfileModalProps { customer: Customer | null; open: boolean; onClose: () => void; }

export default function ViewProfileModal({ customer, open, onClose }: ViewProfileModalProps) {
  const [tab, setTab] = useState('overview');
  if (!customer) return null;

  return (
    <Modal open={open} onClose={onClose} title="Company Profile" subtitle={`Complete profile information for ${customer.name}`}>
      <Tabs
        tabs={[{ label: 'Overview', value: 'overview' }, { label: 'Contacts', value: 'contacts' }]}
        active={tab}
        onChange={setTab}
        variant="segment"
      />

      {tab === 'overview' ? (
        <div className="mt-5">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-black">{customer.name}</h3>
              <p className="text-sm text-gray-500">{customer.email}</p>
              <Badge label={customer.plan} variant="default" className="mt-1" />
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Industry',          value: 'Technology',         icon: '🏢' },
              { label: 'Customer since',    value: customer.since,       icon: '📅' },
              { label: 'Company Size',      value: '500 - 1000 employees', icon: '👥' },
              { label: 'Contract End Date', value: 'Dec 2026',           icon: '📅' },
              { label: 'Location',          value: 'San Francisco, CA',  icon: '📍' },
              { label: 'Latest Activity',   value: '2 hours ago',        icon: '🕐' },
            ].map(info => (
              <div key={info.label}>
                <p className="text-xs text-gray-400 mb-0.5">{info.label}</p>
                <p className="text-sm font-semibold text-black">{info.value}</p>
              </div>
            ))}
          </div>

          {/* Key metrics */}
          <p className="text-sm font-bold text-black mb-3">Key Metrics</p>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gray-50 border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Platform Usage</p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <p className="text-3xl font-black text-green-500">{customer.platformUsage}%</p>
            </Card>
            <Card className="bg-gray-50 border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Monthly Revenue</p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <p className="text-3xl font-black text-green-500">{customer.mrr}</p>
            </Card>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-black">Team Members</h3>
            <span className="text-xs text-gray-400">{contacts.length} contacts</span>
          </div>
          <div className="flex flex-col gap-3">
            {contacts.map(c => (
              <Card key={c.name} className="bg-gray-50 border-0">
                <div className="flex items-start gap-3">
                  <Avatar initials={c.initials} size="md" />
                  <div>
                    <p className="text-sm font-bold text-black">{c.name}</p>
                    <p className="text-xs text-blue-600 font-medium">{c.role} • {c.dept}</p>
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        {c.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {c.phone}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
