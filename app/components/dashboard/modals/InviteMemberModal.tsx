'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import AuthDropdown from '../../auth/AuthDropdown';

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
          <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@company.com"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all disabled:bg-gray-50"
          />
        </div>

        <div>
          <AuthDropdown
            label="Assign Role"
            placeholder="Select a role"
            value={role}
            onChange={setRole}
            disabled={isLoading}
            options={roles.map((r) => ({
              label: r.charAt(0).toUpperCase() + r.slice(1),
              value: r,
            }))}
          />
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

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
