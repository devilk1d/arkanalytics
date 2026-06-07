'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import AuthDropdown from '../../auth/AuthDropdown';

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newRole: string) => Promise<void>;
  currentRole: string;
  availableRoles: string[];
  isLoading?: boolean;
}

export default function EditRoleModal({
  isOpen,
  onClose,
  onSubmit,
  currentRole,
  availableRoles,
  isLoading = false,
}: EditRoleModalProps) {
  const [role, setRole] = useState(currentRole);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRole(currentRole);
      setError('');
    }
  }, [isOpen, currentRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role.toLowerCase() === currentRole.toLowerCase()) {
      setError('Please select a different role');
      return;
    }

    try {
      await onSubmit(role.toLowerCase());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Change Member Role" width="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <AuthDropdown
            label="Select New Role"
            placeholder="Select a role"
            value={role}
            onChange={setRole}
            disabled={isLoading}
            options={availableRoles.map((r) => ({
              label: r.charAt(0).toUpperCase() + r.slice(1),
              value: r,
            }))}
          />
          <p className="text-xs text-gray-400 mt-2">Current: <span className="font-medium text-gray-600">{currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}</span></p>
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isLoading}
          >
            Update Role
          </Button>
        </div>
      </form>
    </Modal>
  );
}
