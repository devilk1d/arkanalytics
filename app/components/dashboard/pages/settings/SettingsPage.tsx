'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Avatar from '../../ui/Avatar';
import Badge from '../../ui/Badge';
import ActionConfirmation from '../../ui/ActionConfirmation';
import InviteMemberModal from '../../modals/InviteMemberModal';
import EditRoleModal from '../../modals/EditRoleModal';
import CreateCustomRoleModal from '../../modals/CreateCustomRoleModal';
import { toastError, toastInfo, toastSuccess, toastWarning } from '../../../ui/AppToast';
import {
  formatRoleLabel,
  formatRolePermission,
  getInitials,
  useDashboardContext,
} from '../../context/DashboardContext';

type DeleteTarget =
  | { type: 'member'; id: string; name: string }
  | { type: 'role'; id: string; name: string; users: number };

type RoleRow = {
  role: string;
  desc: string;
  perms: string;
  users: number;
  isCustom: boolean;
  roleId?: string;
};

function formatLastActive(lastActiveAt: string | null) {
  if (!lastActiveAt) return 'Offline';
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

const inputCls =
  'w-full border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--t2)] transition-all bg-[var(--surf)] text-[var(--t)] placeholder:text-[var(--t3)]';
const disabledInputCls =
  'w-full border border-[var(--b)] rounded-lg px-3 py-2 text-sm bg-[var(--bg1)] text-[var(--t3)] cursor-not-allowed font-mono text-xs';
const labelCls = 'block text-xs font-medium text-[var(--t2)] mb-1';

// Default roles (hardcoded)
const DEFAULT_ROLES = ['admin', 'members'];

type TabType = 'profile' | 'company' | 'appearance' | 'members';
const VALID_TABS: TabType[] = ['profile', 'company', 'appearance', 'members'];

export default function SettingsPage() {
  return (
    <DashboardLayout page="Settings">
      <SettingsContent />
    </DashboardLayout>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Ambil tab dari URL, default ke 'profile' jika tidak ada atau tidak valid
  const tabFromUrl = searchParams.get('tab');
  const getInitialTab = (): TabType => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl as TabType)) {
      return tabFromUrl as TabType;
    }
    return 'profile';
  };

  const {
    loading,
    actionLoading,
    profile,
    workspace,
    myRole,
    myPermissions,
    members,
    roleSummary,
    customRoles,
    error,
    saveCompanyInfo,
    uploadCompanyLogo,
    removeCompanyLogo,
    inviteMember,
    updateMemberRole,
    deleteMember,
    saveUserProfile,
    uploadUserAvatar,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
  } = useDashboardContext();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTheme = () => {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const initial = stored || (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
      setTheme(initial);
    };

    updateTheme();
    window.addEventListener('themechange', updateTheme);
    return () => {
      window.removeEventListener('themechange', updateTheme);
    };
  }, []);

  const normalizedMyRole = (myRole ?? '').trim().toLowerCase();
  const hasAdminRole = normalizedMyRole === 'admin';

  // isAdmin is only evaluated after client mount to avoid SSR/client hydration mismatch
  const isAdmin = mounted && hasAdminRole;
  // Permission flags derived from user's assigned role permissions
  const canManageMembers = mounted && (hasAdminRole || myPermissions.includes('manage_members'));
  const canManageSettings = mounted && (hasAdminRole || myPermissions.includes('manage_settings'));

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editingCustomRole, setEditingCustomRole] = useState<{
    id: string;
    name: string;
    description: string;
    permissions: string[];
  } | null>(null);

  // Edit role state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState('');

  // Company state
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [companyStatus, setCompanyStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setCompanyName(workspace.name || '');
    setWebsite(workspace.websiteUrl || '');
    setSupportEmail(workspace.supportEmail || '');
  }, [workspace]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName || '');
  }, [profile]);

  // Sinkronkan activeTab dengan URL jika URL berubah dari luar
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && VALID_TABS.includes(currentTab as TabType) && currentTab !== activeTab) {
      setActiveTab(currentTab as TabType);
    } else if (!currentTab && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [searchParams]);

  // Fungsi untuk mengganti tab dan update URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleThemeChange = (nextTheme: 'light' | 'dark') => {
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    window.dispatchEvent(new Event('themechange'));
  };

  const roleRows = useMemo<RoleRow[]>(
    () => {
      // Built-in roles from members
      const builtInRoles = DEFAULT_ROLES.map(role => {
        const count = members.filter(m => m.role.toLowerCase() === role.toLowerCase()).length;
        return {
          role: formatRoleLabel(role),
          desc: role.toLowerCase() === 'admin' ? 'Workspace administrators' : 'Workspace members',
          perms: formatRolePermission(role),
          users: count,
          isCustom: false,
        };
      });

      // Custom roles
      const customRoleRows = customRoles.map((role) => ({
        role: role.name,
        desc: role.description || '',
        perms: role.permissions.map(p => p.replace(/_/g, ' ')).join(', '),
        users: members.filter(m => m.role.toLowerCase() === role.name.toLowerCase()).length,
        isCustom: true,
        roleId: role.id,
      }));

      return [...builtInRoles, ...customRoleRows];
    },
    [roleSummary, customRoles, members],
  );

  const availableRoles = useMemo(() => {
    const builtIn = DEFAULT_ROLES;
    const custom = customRoles.map((r) => r.name);
    return [...builtIn, ...custom];
  }, [customRoles]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileStatus('');
    const result = await saveUserProfile({ fullName: fullName.trim() });
    setSavingProfile(false);
    if (result.error) {
      toastError('Failed to update profile', result.error);
    } else {
      toastSuccess('Profile updated');
    }
    setProfileStatus(result.error ?? 'Profile updated successfully.');
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfileStatus('');
    const result = await uploadUserAvatar(file);
    if (result.error) {
      toastError('Failed to update profile photo', result.error);
    } else {
      toastSuccess('Profile photo updated');
    }
    setProfileStatus(result.error ?? 'Profile photo updated.');
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    setCompanyStatus('');
    const result = await saveCompanyInfo({
      name: companyName.trim(),
      supportEmail: supportEmail.trim(),
      websiteUrl: website.trim(),
    });
    setSaving(false);
    if (result.error) {
      toastError('Failed to update company info', result.error);
    } else {
      toastSuccess('Company information updated');
    }
    setCompanyStatus(result.error ?? 'Company information updated.');
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCompanyStatus('');
    const result = await uploadCompanyLogo(file);
    if (result.error) {
      toastError('Failed to upload logo', result.error);
    } else {
      toastSuccess('Company logo updated');
    }
    setCompanyStatus(result.error ?? 'Company logo updated.');
  };

  const handleRemoveLogo = async () => {
    setCompanyStatus('');
    const result = await removeCompanyLogo();
    if (result.error) {
      toastError('Failed to remove logo', result.error);
    } else {
      toastInfo('Company logo removed');
    }
    setCompanyStatus(result.error ?? 'Company logo removed.');
  };

  const handleInviteMember = () => {
    setInviteModalOpen(true);
  };

  const handleSubmitInvite = async (email: string, role: string) => {
    const result = await inviteMember({ invitedEmail: email, roleToAssign: role });
    if (result.error) {
      toastError('Failed to send invitation', result.error);
      setCompanyStatus(result.error);
      throw new Error(result.error);
    }
    toastSuccess('Invitation sent', `${email} invited as ${formatRoleLabel(role)}`);
    setCompanyStatus('Invitation sent successfully.');
  };

  const handleEditMemberRole = async (memberUserId: string, currentRole: string) => {
    setEditingMemberId(memberUserId);
    setEditingMemberRole(currentRole);
    setEditRoleModalOpen(true);
  };

  const handleSubmitEditRole = async (newRole: string) => {
    if (!editingMemberId) return;
    const result = await updateMemberRole({ memberUserId: editingMemberId, newRole });
    if (result.error) {
      toastError('Failed to update member role', result.error);
      setCompanyStatus(result.error);
      throw new Error(result.error);
    }
    toastSuccess('Role updated');
    setCompanyStatus('Member role updated.');
    setEditingMemberId(null);
  };

  const handleDeleteMember = (memberUserId: string, memberName: string) => {
    if (profile?.id === memberUserId) {
      toastWarning('Action denied', 'You cannot delete your own account.');
      setCompanyStatus('You cannot delete your own account.');
      return;
    }
    setDeleteTarget({ type: 'member', id: memberUserId, name: memberName });
    setDeleteModalOpen(true);
  };

  const handleEditCustomRole = (roleId: string) => {
    const targetRole = customRoles.find((role) => role.id === roleId);
    if (!targetRole) {
      toastError('Role not found');
      return;
    }

    setEditingCustomRole({
      id: targetRole.id,
      name: targetRole.name,
      description: targetRole.description,
      permissions: targetRole.permissions,
    });
    setCreateRoleModalOpen(true);
  };

  const handleDeleteRole = (roleId: string, roleName: string, users: number) => {
    if (users > 0) {
      toastWarning('Role is still used', 'Move all members from this role before deleting.');
      return;
    }

    setDeleteTarget({ type: 'role', id: roleId, name: roleName, users });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'member') {
      const result = await deleteMember({ memberUserId: deleteTarget.id });
      if (result.error) {
        toastError('Failed to delete member', result.error);
        setCompanyStatus(result.error);
        throw new Error(result.error);
      }

      toastSuccess('Member deleted', `${deleteTarget.name} has been deleted from workspace.`);
      setCompanyStatus('Member deleted.');
    }

    if (deleteTarget.type === 'role') {
      const result = await deleteCustomRole({ roleId: deleteTarget.id });
      if (result.error) {
        toastError('Failed to delete role', result.error);
        setCompanyStatus(result.error);
        throw new Error(result.error);
      }

      toastSuccess('Role deleted', `${deleteTarget.name} has been deleted.`);
      setCompanyStatus('Role deleted.');
    }

    setDeleteTarget(null);
  };

  const handleSubmitCustomRole = async (roleData: { name: string; description: string; permissions: string[] }) => {
    const result = editingCustomRole
      ? await updateCustomRole({
        roleId: editingCustomRole.id,
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
      })
      : await createCustomRole({
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
      });

    if (result.error) {
      toastError(editingCustomRole ? 'Failed to update role' : 'Failed to create role', result.error);
      setCompanyStatus(result.error);
      throw new Error(result.error);
    }

    toastSuccess(
      editingCustomRole ? 'Permission updated' : 'Role created',
      roleData.name,
    );
    setCompanyStatus(editingCustomRole ? 'Permission updated' : 'Permission created');
    setEditingCustomRole(null);
    setCreateRoleModalOpen(false);
  };

  return (
    <div className="grid grid-cols-12 gap-5" suppressHydrationWarning>

      {/* ── LEFT NAV PANEL ── */}
      <div className="col-span-3 flex flex-col gap-3">

        {/* User identity card */}
        <div className="bg-[var(--surf)] rounded-2xl border border-[var(--b)] p-4 flex items-center gap-3">
          <div className="relative shrink-0">
            <label className="w-12 h-12 rounded-full bg-[var(--bg2)] flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-base font-bold text-[var(--t2)]">
                  {getInitials(profile?.fullName || 'U')}
                </span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[var(--t)] rounded-full flex items-center justify-center pointer-events-none">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--inv-t)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--t)] truncate">{profile?.fullName || '—'}</p>
            <p className="text-xs text-[var(--t3)] truncate">{profile?.email || '—'}</p>
          </div>
        </div>

        {/* Nav menu */}
        <div className="bg-[var(--surf)] rounded-2xl border border-[var(--b)] overflow-hidden">
          <div className="px-3 py-3 border-b border-[var(--b)]">
            <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-widest px-1">Account</p>
          </div>
          {[
            {
              key: 'profile' as TabType,
              label: 'My Profile',
              sub: 'Name, photo, Arka ID',
              show: true,
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ),
            },
            {
              key: 'company' as TabType,
              label: 'Company',
              sub: 'Name, logo, website',
              // Temporarily hidden until backend/RLS supports permission-based workspace updates.
              // Showing this tab to non-admin users leads to a save path that will be rejected.
              show: false,
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              ),
            },
            {
              key: 'appearance' as TabType,
              label: 'Appearance',
              sub: 'Light / dark mode',
              show: true,
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ),
            },
          ].filter(item => item.show).map(item => (
            <button
              key={item.key}
              onClick={() => handleTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 ${activeTab === item.key
                ? 'bg-[var(--bg1)] border-[var(--t)] text-[var(--t)]'
                : 'border-transparent text-[var(--t2)] hover:bg-[var(--bg2)]/60 hover:text-[var(--t)]'
                }`}
            >
              <span className={activeTab === item.key ? 'text-[var(--t)]' : 'text-[var(--t3)]'}>{item.icon}</span>
              <div>
                <p className="text-xs font-semibold leading-tight">{item.label}</p>
                <p className="text-[10px] text-[var(--t3)] mt-0.5 leading-tight">{item.sub}</p>
              </div>
            </button>
          ))}

          <div className="px-3 py-3 border-t border-b border-[var(--b)] mt-1">
            <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-widest px-1">Workspace</p>
          </div>
          {[
            {
              key: 'members' as TabType,
              label: 'Team Members',
              sub: `${members.length} member${members.length !== 1 ? 's' : ''}`,
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
            },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => handleTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 ${activeTab === item.key
                ? 'bg-[var(--bg1)] border-[var(--t)] text-[var(--t)]'
                : 'border-transparent text-[var(--t2)] hover:bg-[var(--bg2)]/60 hover:text-[var(--t)]'
                }`}
            >
              <span className={activeTab === item.key ? 'text-[var(--t)]' : 'text-[var(--t3)]'}>{item.icon}</span>
              <div>
                <p className="text-xs font-semibold leading-tight">{item.label}</p>
                <p className="text-[10px] text-[var(--t3)] mt-0.5 leading-tight">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="col-span-9 flex flex-col gap-4">

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <>
            <div className="bg-[var(--surf)] rounded-2xl border border-[var(--b)]">
              <div className="px-6 py-5 border-b border-[var(--b)]">
                <h2 className="text-sm font-semibold text-[var(--t)]">My Profile</h2>
                <p className="text-xs text-[var(--t3)] mt-0.5">Manage your personal information</p>
              </div>
              <div className="p-6">
                {/* Avatar section */}
                <div className="flex items-center gap-5 pb-6 border-b border-[var(--b)]">
                  <div className="relative">
                    <label className="w-20 h-20 rounded-2xl bg-[var(--bg2)] flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-[var(--t3)]">{getInitials(profile?.fullName || 'U')}</span>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--t)] rounded-full flex items-center justify-center pointer-events-none shadow-sm">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--inv-t)" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--t)]">{profile?.fullName || '—'}</p>
                    <p className="text-sm text-[var(--t3)] mt-0.5">{profile?.email || '—'}</p>
                    <p className="text-xs text-[var(--t3)] mt-1">Click photo to upload a new one</p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="pt-6 grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Full Name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className={inputCls} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Email <span className="text-[var(--t3)] font-normal">(read-only)</span></label>
                    <input value={profile?.email || ''} readOnly disabled className={disabledInputCls} />
                  </div>
                  {profile?.arkaId && (
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelCls}>Arka ID <span className="text-[var(--t3)] font-normal">(read-only)</span></label>
                      <input value={profile.arkaId} readOnly disabled className={disabledInputCls} />
                    </div>
                  )}
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Last Active</label>
                    <input value={formatLastActive(profile?.lastActiveAt ?? null)} readOnly disabled className={disabledInputCls} />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[var(--b)] bg-[var(--bg1)]/50 rounded-b-2xl flex items-center justify-between">
                {profileStatus ? (
                  <p className="text-xs text-[var(--t2)]">{profileStatus}</p>
                ) : <span />}
                <Button onClick={handleSaveProfile} isLoading={savingProfile}>
                  Save Profile
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Company tab */}
        {activeTab === 'company' && (
          <div className="bg-[var(--surf)] rounded-2xl border border-[var(--b)]">
            <div className="px-6 py-5 border-b border-[var(--b)]">
              <h2 className="text-sm font-semibold text-[var(--t)]">Company Information</h2>
              <p className="text-xs text-[var(--t3)] mt-0.5">Manage your workspace details</p>
            </div>
            <div className="p-6">
              {/* Logo section */}
              <div className="flex items-center gap-5 pb-6 border-b border-[var(--b)]">
                <label className="w-20 h-20 shrink-0 bg-[var(--bg2)] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-[var(--b2)] cursor-pointer hover:border-[var(--t3)] transition-colors overflow-hidden">
                  {workspace?.logoUrl ? (
                    <img src={workspace.logoUrl} alt="Company logo" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round">
                        <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                      </svg>
                      <p className="text-[9px] text-[var(--t3)] mt-1">Upload</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <div>
                  <p className="text-base font-semibold text-[var(--t)]">{workspace?.name || 'Your Company'}</p>
                  <p className="text-xs text-[var(--t3)] mt-0.5">{workspace?.websiteUrl || 'No website set'}</p>
                  <button onClick={handleRemoveLogo} className="text-xs text-[var(--d)] hover:underline mt-1.5">
                    Remove logo
                  </button>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Company Name</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your Company Name" className={inputCls} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Website</label>
                  <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://company.com" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Support Email</label>
                  <input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="support@company.com" className={inputCls} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--b)] bg-[var(--bg1)]/50 rounded-b-2xl flex items-center justify-between">
              {(companyStatus || error) ? (
                <p className="text-xs text-[var(--t2)]">{companyStatus || error}</p>
              ) : <span />}
              <Button onClick={handleSaveCompany} isLoading={saving}>
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Appearance tab */}
        {activeTab === 'appearance' && (
          <div className="bg-[var(--surf)] rounded-2xl border border-[var(--b)]">
            <div className="px-6 py-5 border-b border-[var(--b)]">
              <h2 className="text-sm font-semibold text-[var(--t)]">Appearance</h2>
              <p className="text-xs text-[var(--t3)] mt-0.5">Choose how the dashboard looks for you</p>
            </div>
            <div className="p-6">
              <p className={labelCls}>Theme</p>
              <div className="flex gap-3 mt-2">
                {[
                  { val: 'light' as const, label: 'Light', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg> },
                  { val: 'dark' as const, label: 'Dark', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg> },
                ].map(({ val, label, icon }) => (
                  <button
                    key={label}
                    onClick={() => handleThemeChange(val)}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${theme === val
                      ? 'border-[var(--t)] bg-[var(--t)] text-[var(--inv-t)] shadow-sm'
                      : 'border-[var(--b2)] text-[var(--t2)] hover:border-[var(--b3)] hover:text-[var(--t)] bg-[var(--surf)]'
                      }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Members tab (always shown, or via nav) */}
        {activeTab === 'members' && (
          <>
            <div className="bg-[var(--surf)] rounded-2xl border border-[var(--b)]">
              <div className="px-6 py-5 border-b border-[var(--b)] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--t)]">Team Members</h2>
                  <p className="text-xs text-[var(--t3)] mt-0.5">Manage user access and permissions</p>
                </div>
                {canManageMembers && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleInviteMember}
                    disabled={actionLoading}
                    icon={
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    }
                  >
                    Invite Member
                  </Button>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--b)] bg-[var(--bg1)]/60">
                    {['Member', 'Email', 'Role', 'Status', 'Last Active'].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-[var(--t3)] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                    {isAdmin && (
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-[var(--t3)] uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--b)]">
                  {members.map(m => (
                    <tr key={m.userId} className="hover:bg-[var(--bg2)]/60 transition-colors group">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={getInitials(m.fullName)} src={m.avatarUrl || undefined} size="sm" />
                          <span className="text-sm font-medium text-[var(--t)]">{m.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--t2)]">{m.email || <span className="text-[var(--t3)] italic text-xs">Hidden</span>}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-[var(--bg2)] text-xs font-medium text-[var(--t2)]">
                          {formatRoleLabel(m.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><Badge label="Active" variant="active" /></td>
                      <td className="px-5 py-3.5 text-xs text-[var(--t3)] whitespace-nowrap">{formatLastActive(m.lastActiveAt)}</td>
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <button className="text-xs font-medium text-[var(--t2)] hover:text-[var(--t)] transition-colors disabled:opacity-40"
                              onClick={() => { void handleEditMemberRole(m.userId, m.role); }} disabled={actionLoading}>
                              Edit role
                            </button>
                            <button className="text-[var(--d)] opacity-75 hover:opacity-100 transition-colors disabled:opacity-40"
                              onClick={() => handleDeleteMember(m.userId, m.fullName)} disabled={actionLoading}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!loading && members.length === 0 && (
                    <tr><td colSpan={isAdmin ? 6 : 5} className="px-5 py-10 text-sm text-[var(--t3)] text-center">No members found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Roles & Permissions */}
            {isAdmin && (
              <div className="bg-[var(--surf)] rounded-2xl border border-[var(--b)]">
                <div className="px-6 py-5 border-b border-[var(--b)] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--t)]">Roles & Permissions</h2>
                    <p className="text-xs text-[var(--t3)] mt-0.5">Access levels for each role in this workspace</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setCreateRoleModalOpen(true)}
                    icon={
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    }
                  >
                    Create Role
                  </Button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--b)] bg-[var(--bg1)]/60">
                      {['Role', 'Description', 'Permissions', 'Members', 'Actions'].map((h, i) => (
                        <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-[var(--t3)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--b)]">
                    {roleRows.map(r => (
                      <tr key={r.role} className="hover:bg-[var(--bg2)]/60 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--t)]">{r.role}</span>
                            {r.isCustom && <span className="inline-block px-1.5 py-0.5 text-xs font-medium text-[var(--p)] bg-[var(--p)]/10 rounded">Custom</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--t2)]">{r.desc || '-'}</td>
                        <td className="px-5 py-3.5 text-sm text-[var(--t2)] max-w-xs truncate">{r.perms || '-'}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium text-[var(--t2)] bg-[var(--bg2)] px-2 py-0.5 rounded-md">{r.users} users</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {!r.isCustom ? (
                              <button disabled className="text-xs font-medium text-[var(--t4)] cursor-not-allowed">Edit</button>
                            ) : (
                              <button
                                className="text-xs font-medium text-[var(--t2)] hover:text-[var(--t)] transition-colors disabled:opacity-40"
                                onClick={() => r.roleId && handleEditCustomRole(r.roleId)}
                                disabled={actionLoading}
                              >
                                Edit
                              </button>
                            )}
                            {r.isCustom && (
                              <button
                                className="text-[var(--d)] opacity-75 hover:opacity-100 transition-colors disabled:opacity-40"
                                onClick={() => r.roleId && handleDeleteRole(r.roleId, r.role, r.users)}
                                disabled={actionLoading}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && roleRows.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-10 text-sm text-[var(--t3)] text-center">No roles available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </div>

      {/* Modals */}
      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSubmit={handleSubmitInvite}
        isLoading={actionLoading}
        roles={availableRoles}
      />

      <EditRoleModal
        isOpen={editRoleModalOpen}
        onClose={() => setEditRoleModalOpen(false)}
        onSubmit={handleSubmitEditRole}
        currentRole={editingMemberRole}
        availableRoles={availableRoles}
        isLoading={actionLoading}
      />

      <CreateCustomRoleModal
        isOpen={createRoleModalOpen}
        onClose={() => {
          setCreateRoleModalOpen(false);
          setEditingCustomRole(null);
        }}
        onSubmit={handleSubmitCustomRole}
        existingRole={editingCustomRole}
        isLoading={actionLoading}
      />

      <ActionConfirmation
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
        }}
        title={deleteTarget?.type === 'role' ? 'Delete Role' : 'Delete Member'}
        description={
          deleteTarget?.type === 'role'
            ? `Are you sure you want to delete role ${deleteTarget.name}? This action cannot be undone.`
            : `Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`
        }
        actionLabel="Delete"
        isDangerous
        isLoading={actionLoading}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}