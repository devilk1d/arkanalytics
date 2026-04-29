'use client';

import { ChangeEvent, JSX, useState } from 'react';
import Card from '../../ui/Card';
import { AttachmentItem, ConversationItem, NoteItem, RightTab, TaskItem, formatTime } from './chat-types';
import { getInitials, type WorkspaceMember } from '../../context/DashboardContext';
import Avatar from '../../ui/Avatar';


// ─── Tab config ──────────────────────────────────────────────────────────────

const rightTabs: Array<{ label: string; value: RightTab; icon: JSX.Element }> = [
  {
    label: 'Info',
    value: 'info',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  {
    label: 'Actions',
    value: 'actions',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="14 3 14 9 20 9" />
        <path d="M8 13h8" /><path d="M8 17h8" />
      </svg>
    ),
  },
  {
    label: 'Customers',
    value: 'customers',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Files',
    value: 'files',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
];

// ─── Helper: translate tab index ──────────────────────────────────────────────
function tabIndex(tab: RightTab): number {
  return rightTabs.findIndex(t => t.value === tab);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RightPanelTabs({ active, onChange }: { active: RightTab; onChange: (v: RightTab) => void }) {
  const idx = tabIndex(active);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-4 gap-0.5">
        {rightTabs.map(tab => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-all ${isActive ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <span className={isActive ? 'text-white' : 'text-gray-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function InfoPanel({
  convo,
  currentUserId,
  onInvite,
  onAvatarChange,
  groupInviteCandidates,
  workspaceMembers,
}: {
  convo: ConversationItem;
  currentUserId?: string;
  onInvite: (userId: string) => void;
  onAvatarChange?: (file: File) => void;
  groupInviteCandidates: WorkspaceMember[];
  workspaceMembers: WorkspaceMember[];
}) {
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [inviting, setInviting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Group avatar change integration
  const handleAvatarSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAvatarChange) return;
    onAvatarChange(file);
  };

  const filteredCandidates = groupInviteCandidates.filter(m =>
    m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  async function handleInvite(userId: string) {
    setInviting(userId);
    await onInvite(userId);
    setInviting(null);
  }

  // For direct conversations, identify the person we're talking to
  const peerId = convo.type === 'direct'
    ? (convo.members.find(m => m.id !== currentUserId)?.id || convo.members.find(m => m.id === currentUserId)?.id)
    : null;
  
  const peer = peerId ? workspaceMembers.find(m => m.userId === peerId) : null;

  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div className="mb-6 mt-4 relative group/avatar">
        <div className="relative">
          <Avatar 
            initials={getInitials(convo.name)} 
            size="xl" 
            src={convo.avatarUrl || undefined} 
          />
          {convo.type === 'group' && onAvatarChange && (
            <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all opacity-0 group-hover/avatar:opacity-100 translate-y-1 group-hover/avatar:translate-y-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-600"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarSelect} />
            </label>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-lg font-bold text-gray-900 text-center">{convo.name}</h3>

      {/* Direct conversation info */}
      {convo.type === 'direct' && (
        <div className="w-full mt-5 space-y-3">
          {/* Email field */}
          <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div className="mt-0.5 text-gray-400 shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Email</p>
              <p className="text-sm text-gray-700 truncate">
                {peer?.email || '—'}
              </p>
            </div>
          </div>

          {/* Arka ID field */}
          <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div className="mt-0.5 text-gray-400 shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Arka ID</p>
              <p className="text-sm text-gray-700 font-mono truncate">
                {peer?.arkaId ? `@${peer.arkaId}` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Group conversation info */}
      {convo.type === 'group' && (
        <div className="w-full mt-6">
          {/* Members list */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Members · {convo.memberCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {convo.members.length > 0 ? convo.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                <Avatar size="sm" initials={getInitials(m.name)} src={m.avatarUrl || undefined} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">Member</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" title="Online" />
              </div>
            )) : (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                No members found
              </div>
            )}
          </div>

          {/* Add Member section */}
          <div className="mt-5">
            <button
              onClick={() => setAddMemberOpen(prev => !prev)}
              className="w-full flex items-center justify-between rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-all"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                Add Member
              </span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`transition-transform ${addMemberOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {addMemberOpen && (
              <div className="mt-2 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Search */}
                <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                    </span>
                    <input
                      autoFocus
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-gray-200 outline-none focus:border-gray-400 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Candidates list */}
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {filteredCandidates.length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs text-gray-400">
                      {memberSearch ? 'No results found' : 'All workspace members are already in this group'}
                    </div>
                  ) : (
                    filteredCandidates.map(m => (
                      <div key={m.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                        <Avatar size="sm" initials={getInitials(m.fullName)} src={m.avatarUrl || undefined} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{m.fullName}</p>
                          {m.email && <p className="text-[11px] text-gray-400 truncate">{m.email}</p>}
                        </div>
                        <button
                          onClick={() => void handleInvite(m.userId)}
                          disabled={inviting === m.userId}
                          className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black disabled:bg-gray-300 transition-colors"
                        >
                          {inviting === m.userId ? '...' : 'Add'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionsPanel({
  tasks, notes, newTask, newNote,
  onTaskChange, onNoteChange, onCreateTask, onCreateNote, onToggleTask,
}: {
  tasks: TaskItem[];
  notes: NoteItem[];
  newTask: string;
  newNote: string;
  onTaskChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
  onToggleTask: (task: TaskItem) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Card padding="sm" className="rounded-[20px] border-gray-200 shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">To-do List</h4>
          <button onClick={onCreateTask} className="text-xs font-medium text-blue-600 hover:text-blue-700">
            + Add task
          </button>
        </div>
        <div className="mb-3">
          <input
            value={newTask}
            onChange={(e) => onTaskChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCreateTask(); }}
            placeholder="Task title..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-col gap-3">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-start gap-3">
              <button
                onClick={() => onToggleTask(t)}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${t.taskStatus === 'done' ? 'border-gray-900 bg-white' : 'border-gray-300 bg-white hover:border-gray-500'}`}
              >
                {t.taskStatus === 'done' && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium leading-5 ${t.taskStatus === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {t.title}
                </p>
                <p className={`text-[11px] leading-4 ${t.taskStatus === 'done' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t.taskStatus}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden rounded-[20px] border-gray-200 shadow-none">
        <div className="border-b border-gray-100 p-3">
          <textarea
            value={newNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Write some notes..."
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
          />
          <button
            onClick={onCreateNote}
            className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Save note
          </button>
        </div>
        <div className="max-h-56 overflow-y-auto p-3">
          {notes.map((n) => (
            <div key={n.id} className="mb-2 rounded-xl bg-gray-50 p-3 last:mb-0">
              <p className="text-xs font-semibold text-gray-800">{n.title}</p>
              <p className="mt-1 text-xs text-gray-600">{n.content}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CustomersPanel() {
  return (
    <div className="flex flex-col gap-3">
      <Card padding="sm" className="rounded-[20px] border-gray-200 shadow-none">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Customers</h4>
        <p className="text-xs text-gray-500">
          Customer insights panel belum dihubungkan ke data chat. Fokus tahap ini adalah conversation, message, notes, tasks, dan files.
        </p>
      </Card>
    </div>
  );
}

function FilesPanel({
  files, onUpload, uploadLoading,
}: {
  files: AttachmentItem[];
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Card padding="sm" className="rounded-[20px] border-gray-200 shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Media & Docs</h4>
          <label className="cursor-pointer rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700">
            {uploadLoading ? 'Uploading...' : 'Upload'}
            <input type="file" className="hidden" onChange={onUpload} disabled={uploadLoading} />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          {files.map((file) => (
            <div key={file.id} className="rounded-xl border border-gray-200 px-3 py-2">
              <p className="truncate text-xs font-semibold text-gray-900">{file.fileName}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{file.mediaKind} • {formatTime(file.createdAt)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface ChatRightPanelProps {
  currentUserId?: string;
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;

  // Actions tab
  tasks: TaskItem[];
  notes: NoteItem[];
  newTask: string;
  newNote: string;
  onTaskChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
  onToggleTask: (task: TaskItem) => void;

  // Files tab
  files: AttachmentItem[];
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadLoading: boolean;

  // Info tab
  convo: ConversationItem | undefined;
  inviteUserId: string;
  onInviteUserChange: (v: string) => void;
  onInvite: () => void;
  onInviteUser: (userId: string) => void;
  onAvatarChange?: (file: File) => void;
  groupInviteCandidates: WorkspaceMember[];
  workspaceMembers: WorkspaceMember[];
}

export default function ChatRightPanel({
  currentUserId,
  activeTab,
  onTabChange,
  tasks,
  notes,
  newTask,
  newNote,
  onTaskChange,
  onNoteChange,
  onCreateTask,
  onCreateNote,
  onToggleTask,
  files,
  onUpload,
  uploadLoading,
  convo,
  onInviteUser,
  groupInviteCandidates,
  workspaceMembers,
  onAvatarChange,
}: ChatRightPanelProps) {

  const emptyMessages: Record<RightTab, string> = {
    info: 'Select a conversation to view info',
    actions: 'Select a conversation to manage tasks & notes',
    customers: 'Select a conversation to view customers',
    files: 'Select a conversation to view files',
  };
  return (
    <>
      <div className="px-4 pt-3.5 pb-3 border-b border-gray-100">
        <RightPanelTabs active={activeTab} onChange={onTabChange} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {!convo ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm text-gray-400">
              {emptyMessages[activeTab]}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'info' && (
              <InfoPanel
                convo={convo}
                currentUserId={currentUserId}
                onInvite={(userId: string) => onInviteUser?.(userId)}
                onAvatarChange={onAvatarChange}
                groupInviteCandidates={groupInviteCandidates}
                workspaceMembers={workspaceMembers}
              />
            )}

            {activeTab === 'actions' && (
              <ActionsPanel
                tasks={tasks}
                notes={notes}
                newTask={newTask}
                newNote={newNote}
                onTaskChange={onTaskChange}
                onNoteChange={onNoteChange}
                onCreateTask={onCreateTask}
                onCreateNote={onCreateNote}
                onToggleTask={onToggleTask}
              />
            )}

            {activeTab === 'customers' && <CustomersPanel />}

            {activeTab === 'files' && (
              <FilesPanel
                files={files}
                onUpload={onUpload}
                uploadLoading={uploadLoading}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}