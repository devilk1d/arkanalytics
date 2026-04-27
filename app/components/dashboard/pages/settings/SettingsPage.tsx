'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Avatar from '../../ui/Avatar';
import Badge from '../../ui/Badge';
import {
  formatRoleLabel,
  formatRolePermission,
  getInitials,
  useDashboardContext,
} from '../../context/DashboardContext';

function formatLastActive(lastActiveAt: string | null) {
  if (!lastActiveAt) {
    return 'Belum aktif';
  }

  const date = new Date(lastActiveAt);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' WIB';
}

export default function SettingsPage() {
  return (
    <DashboardLayout page="Settings">
      <SettingsContent />
    </DashboardLayout>
  );
}

function SettingsContent() {
  const {
    loading,
    actionLoading,
    profile,
    workspace,
    members,
    roleSummary,
    error,
    saveCompanyInfo,
    uploadCompanyLogo,
    removeCompanyLogo,
    inviteMember,
    updateMemberRole,
    deleteMember,
  } = useDashboardContext();

  const [isDark, setIsDark] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspace) {
      return;
    }
    setCompanyName(workspace.name || '');
    setWebsite(workspace.websiteUrl || '');
    setSupportEmail(workspace.supportEmail || '');
  }, [workspace]);

  const roleRows = useMemo(
    () =>
      roleSummary.map((role) => ({
        role: formatRoleLabel(role.role),
        desc: role.role.toLowerCase() === 'admin' ? 'Workspace administrators' : 'Workspace members',
        perms: formatRolePermission(role.role),
        users: `${role.users} users`,
      })),
    [roleSummary],
  );

  const handleSaveCompany = async () => {
    setSaving(true);
    setStatusMessage('');
    const result = await saveCompanyInfo({
      name: companyName.trim(),
      supportEmail: supportEmail.trim(),
      websiteUrl: website.trim(),
    });
    setSaving(false);

    if (result.error) {
      setStatusMessage(result.error);
      return;
    }

    setStatusMessage('Company information updated.');
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setStatusMessage('');
    const result = await uploadCompanyLogo(file);
    if (result.error) {
      setStatusMessage(result.error);
      return;
    }
    setStatusMessage('Company logo updated.');
  };

  const handleRemoveLogo = async () => {
    setStatusMessage('');
    const result = await removeCompanyLogo();
    if (result.error) {
      setStatusMessage(result.error);
      return;
    }
    setStatusMessage('Company logo removed.');
  };

  const handleInviteMember = async () => {
    const invitedEmail = window.prompt('Masukkan email user yang ingin diundang:');
    if (!invitedEmail?.trim()) {
      return;
    }

    const roleToAssign = window.prompt('Masukkan role untuk user ini (contoh: member, admin, sales):', 'member');
    if (!roleToAssign?.trim()) {
      return;
    }

    setStatusMessage('');
    const result = await inviteMember({
      invitedEmail: invitedEmail.trim(),
      roleToAssign: roleToAssign.trim().toLowerCase(),
    });

    if (result.error) {
      setStatusMessage(result.error);
      return;
    }

    setStatusMessage('Invitation sent successfully.');
  };

  const handleEditMemberRole = async (memberUserId: string, currentRole: string) => {
    const newRole = window.prompt('Ubah role user:', currentRole);
    if (!newRole?.trim() || newRole.trim().toLowerCase() === currentRole.toLowerCase()) {
      return;
    }

    setStatusMessage('');
    const result = await updateMemberRole({
      memberUserId,
      newRole: newRole.trim().toLowerCase(),
    });

    if (result.error) {
      setStatusMessage(result.error);
      return;
    }

    setStatusMessage('Member role updated.');
  };

  const handleDeleteMember = async (memberUserId: string, memberName: string) => {
    const isSelf = profile?.id === memberUserId;
    if (isSelf) {
      setStatusMessage('Kamu tidak bisa menghapus akun sendiri.');
      return;
    }

    const confirmed = window.confirm(`Hapus member ${memberName}?`);
    if (!confirmed) {
      return;
    }

    setStatusMessage('');
    const result = await deleteMember({ memberUserId });

    if (result.error) {
      setStatusMessage(result.error);
      return;
    }

    setStatusMessage('Member deleted.');
  };

  return (
      <div className="grid grid-cols-3 gap-4">

        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Company Info */}
          <Card>
            <h3 className="text-sm font-bold text-black mb-4">Company Information</h3>
            <p className="text-xs text-gray-400 mb-4">Update your company details</p>

            {/* Logo upload */}
            <div className="flex gap-4 mb-4">
              <div className="flex flex-col items-center gap-2">
                <label className="w-16 h-16 bg-gray-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 cursor-pointer hover:border-gray-400 transition-colors overflow-hidden">
                  {workspace?.logoUrl ? (
                    <img src={workspace.logoUrl} alt="Company logo" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
                      <p className="text-[9px] text-gray-400 mt-0.5 text-center">Upload Logo</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <button onClick={handleRemoveLogo} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Company Name</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                    placeholder="Your Company Name"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Website</label>
                  <input value={website} onChange={e => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Support Email</label>
              <input value={supportEmail} onChange={e => setSupportEmail(e.target.value)}
                placeholder="support@company.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
            </div>

            <Button onClick={handleSaveCompany} className="w-full justify-center" size="sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            {(statusMessage || error) ? (
              <p className="mt-3 text-xs text-gray-500">{statusMessage || error}</p>
            ) : null}
          </Card>

          {/* Theme toggle */}
          <Card>
            <h3 className="text-sm font-bold text-black mb-1">Themes</h3>
            <p className="text-xs text-gray-400 mb-4">Light / Dark Mode</p>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setIsDark(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                  ${!isDark ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </button>
              <button
                onClick={() => setIsDark(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                  ${isDark ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </button>
            </div>
          </Card>
        </div>

        {/* Right column – team & roles */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Team Members */}
          <Card padding="none">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-black">Team Members</h3>
                <p className="text-xs text-gray-400">Manage user access and permissions</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void handleInviteMember();
                }}
                disabled={actionLoading}
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              >
                Invite User
              </Button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Name', 'Email', 'Role', 'Status', 'Last Active', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map(m => (
                  <tr key={m.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar initials={getInitials(m.fullName)} src={m.avatarUrl || undefined} size="sm" />
                        <span className="text-sm font-medium text-black">{m.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{m.email || 'Hidden by policy'}</td>
                    <td className="px-5 py-3 text-sm text-gray-700 font-medium">{formatRoleLabel(m.role)}</td>
                    <td className="px-5 py-3"><Badge label="Active" variant="active" /></td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatLastActive(m.lastActiveAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-xs font-semibold text-gray-600 hover:text-black transition-colors disabled:opacity-50"
                          onClick={() => {
                            void handleEditMemberRole(m.userId, m.role);
                          }}
                          disabled={actionLoading}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          onClick={() => {
                            void handleDeleteMember(m.userId, m.fullName);
                          }}
                          disabled={actionLoading}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && members.length === 0 ? (
                  <tr>
                    <td className="px-5 py-5 text-sm text-gray-500" colSpan={6}>No members found for this workspace.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>

          {/* Roles & Permissions */}
          <Card padding="none">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-black">Roles & Permissions</h3>
              <p className="text-xs text-gray-400">Define access levels for different user roles</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Role', 'Description', 'Permissions', 'Users', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roleRows.map(r => (
                  <tr key={r.role} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-bold text-black">{r.role}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{r.desc}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{r.perms}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{r.users}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button className="text-xs font-semibold text-gray-600 hover:text-black transition-colors">Edit</button>
                        <button className="text-red-400 hover:text-red-600 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && roleRows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-5 text-sm text-gray-500" colSpan={5}>No roles available in this workspace.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
  );
}
