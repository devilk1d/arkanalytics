'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import FilterDropdown from '../ui/FilterDropdown';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, role: string) => Promise<void>;
  isLoading?: boolean;
  roles?: string[];
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  roles = ['member', 'admin', 'sales'],
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(roles[0]);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!role.trim()) {
      setError('Role is required');
      return;
    }

    try {
      await onSubmit(email.trim(), role.trim());
      setEmail('');
      setRole(roles[0]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole(roles[0]);
    setError('');
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title="Invite Team Member" width="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--t3)' }}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@company.com"
            disabled={isLoading}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all disabled:opacity-50"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--b2)',
              color: 'var(--t)',
            }}
          />
        </div>

        <div>
          <FilterDropdown
            label="Assign Role"
            placeholder="Select a role"
            size="md"
            value={role}
            onChange={setRole}
            disabled={isLoading}
            options={roles.map((r) => ({
              label: r.charAt(0).toUpperCase() + r.slice(1),
              value: r,
            }))}
          />
        </div>

        {error && <p className="text-xs text-red-500 px-3 py-2 rounded-lg" style={{ background: 'var(--d-bg)' }}>{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isLoading}
          >
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
