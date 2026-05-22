'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import AuthDropdown from '../../auth/AuthDropdown';

interface CustomRoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

interface CreateCustomRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roleData: CustomRoleFormData) => Promise<void>;
  existingRole?: CustomRoleFormData | null;
  isLoading?: boolean;
}

const availablePermissions = [
  { id: 'view_analytics', label: 'View Analytics', description: 'View analytics and reports' },
  { id: 'manage_data', label: 'Manage Data', description: 'Create, edit, delete customer data' },
  { id: 'export_reports', label: 'Export Reports', description: 'Export reports and data' },
  { id: 'manage_members', label: 'Manage Members', description: 'Invite and manage team members' },
  { id: 'manage_settings', label: 'Manage Settings', description: 'Change workspace settings' },
];

export default function CreateCustomRoleModal({
  isOpen,
  onClose,
  onSubmit,
  existingRole = null,
  isLoading = false,
}: CreateCustomRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingRole) {
        setName(existingRole.name);
        setDescription(existingRole.description);
        setPermissions(existingRole.permissions);
      } else {
        setName('');
        setDescription('');
        setPermissions([]);
      }
      setError('');
    }
  }, [isOpen, existingRole]);

  const togglePermission = (permissionId: string) => {
    setPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((p) => p !== permissionId) : [...prev, permissionId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Role name is required');
      return;
    }

    if (permissions.length === 0) {
      setError('Select at least one permission');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        permissions,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    }
  };

  const title = existingRole ? 'Edit Role & Permissions' : 'Create Custom Role';
  const submitLabel = existingRole ? 'Update Role' : 'Create Role';

  return (
    <Modal open={isOpen} onClose={onClose} title={title} width="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--t3)' }}>Role Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., CRM Team, Sales Lead"
            disabled={isLoading}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all disabled:opacity-50"
            style={{ background: 'var(--bg2)', border: '1px solid var(--b2)', color: 'var(--t)' }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--t3)' }}>
            Description <span className="font-normal" style={{ color: 'var(--t4)' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Team members who manage CRM operations"
            disabled={isLoading}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all disabled:opacity-50"
            style={{ background: 'var(--bg2)', border: '1px solid var(--b2)', color: 'var(--t)' }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--t2)' }}>Permissions</label>
          <p className="text-xs mb-3" style={{ color: 'var(--t4)' }}>Select which features this role can access</p>
          <div className="space-y-2">
            {availablePermissions.map((perm) => (
              <label
                key={perm.id}
                className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                style={{ border: '1px solid var(--b)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(perm.id)}
                  onChange={() => togglePermission(perm.id)}
                  disabled={isLoading}
                  className="mt-0.5 w-4 h-4 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--t)' }}>{perm.label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--t4)' }}>{perm.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 px-3 py-2 rounded-lg" style={{ background: 'var(--d-bg)' }}>{error}</p>}

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
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
