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
          <label className="block text-xs font-medium text-gray-600 mb-1">Role Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., CRM Team, Sales Lead"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Team members who manage CRM operations"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-3">Permissions</label>
          <p className="text-xs text-gray-400 mb-3">Select which features this role can access</p>
          <div className="space-y-2">
            {availablePermissions.map((perm) => (
              <label key={perm.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.includes(perm.id)}
                  onChange={() => togglePermission(perm.id)}
                  disabled={isLoading}
                  className="mt-0.5 w-4 h-4 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-medium text-gray-900">{perm.label}</p>
                  <p className="text-[11px] text-gray-400">{perm.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <Button type="submit" size="sm" disabled={isLoading}>
            {isLoading ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
