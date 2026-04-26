'use client';

import { useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';

/* ─── Retain Modal ─── */
const retainActions = [
  { icon: '📞', label: 'Schedule Call',  value: 'call' },
  { icon: '✉️', label: 'Send Email',     value: 'email' },
  { icon: '🎥', label: 'Video Meeting', value: 'video' },
  { icon: '🎁', label: 'Free Training', value: 'training' },
];

interface RetainModalProps { open: boolean; onClose: () => void; customerName: string; }

export function RetainModal({ open, onClose, customerName }: RetainModalProps) {
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Retain Customer" subtitle={`Choose a retention action for ${customerName}`} width="sm">
      <p className="text-sm font-semibold text-black mb-3">Select Action</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {retainActions.map(a => (
          <button
            key={a.value}
            onClick={() => setSelected(a.value)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-medium transition-all duration-200
              ${selected === a.value ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-black hover:border-gray-400'}`}
          >
            <span>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold text-black mb-2">Custom Message (Optional)</p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Add a personalized message..."
        rows={4}
        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-black transition-colors resize-none mb-5"
      />

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={onClose}>Confirm Action</Button>
      </div>
    </Modal>
  );
}

/* ─── Send Offer Modal ─── */
const offerTypes = [
  { icon: '🏷️', label: '20% Discount',    desc: 'Save 20% on next 3 months',         value: 'discount' },
  { icon: '🎁', label: 'Free Month',       desc: '1 month free with annual upgrade',   value: 'free-month' },
  { icon: '⬆️', label: 'Free Plan Upgrade',desc: 'Upgrade to next tier for 2 months', value: 'upgrade' },
  { icon: '✉️', label: 'Custom Offer',     desc: 'Create a personalized offer',        value: 'custom' },
];

interface SendOfferModalProps { open: boolean; onClose: () => void; customerName: string; }

export function SendOfferModal({ open, onClose, customerName }: SendOfferModalProps) {
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Send Special Offer" subtitle={`Create a special offer for ${customerName}`} width="sm">
      <p className="text-sm font-semibold text-black mb-3">Select Offer Type</p>
      <div className="flex flex-col gap-2 mb-5">
        {offerTypes.map(o => (
          <button
            key={o.value}
            onClick={() => setSelected(o.value)}
            className={`flex items-start gap-3 px-4 py-3 border rounded-xl text-left transition-all duration-200 w-full
              ${selected === o.value ? 'border-black bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <span className="text-lg mt-0.5">{o.icon}</span>
            <div>
              <p className="text-sm font-semibold text-black">{o.label}</p>
              <p className="text-xs text-gray-500">{o.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold text-black mb-2">Custom Message (Optional)</p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Add a personalized message..."
        rows={3}
        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-black transition-colors resize-none mb-5"
      />

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={onClose}>Send Offer</Button>
      </div>
    </Modal>
  );
}
