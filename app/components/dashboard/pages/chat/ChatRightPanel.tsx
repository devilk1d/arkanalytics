import { ChangeEvent, JSX, useState, useRef, useEffect } from 'react';
import Card from '../../ui/Card';
import { AttachmentItem, ConversationItem, NoteItem, RightTab, TaskItem, formatTime } from './chat-types';
import { getInitials, type WorkspaceMember } from '../../context/DashboardContext';
import Avatar from '../../ui/Avatar';
import MediaLightbox from '../../../ui/MediaLightbox';
import AuthDropdown from '../../../auth/AuthDropdown';


// ─── Internal Components for Modal ──────────────────────────────────────────

function TaskDatePicker({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const handleSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate.toISOString().split('T')[0]);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 border border-transparent outline-none flex items-center justify-between"
      >
        <span>{selectedDate ? selectedDate.toLocaleDateString('en-GB') : 'dd/mm/yyyy'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[1002] bg-white rounded-3xl border border-gray-100 shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200 w-[260px]">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-sm font-extrabold text-gray-900">{monthName} {viewDate.getFullYear()}</h5>
            <div className="flex gap-1">
              <button type="button" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`} className="text-[10px] font-black text-gray-400">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === viewDate.getMonth() && selectedDate?.getFullYear() === viewDate.getFullYear();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={`aspect-square text-xs font-bold rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-600"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
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
  tasks,
  notes,
  newNote,
  onNoteChange,
  onCreateTask,
  onCreateNote,
  onToggleTask,
  workspaceMembers,
}: {
  tasks: TaskItem[];
  notes: NoteItem[];
  newTask: string;
  newNote: string;
  onTaskChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onCreateTask: (task: Partial<TaskItem>) => void;
  onCreateNote: () => void;
  onToggleTask: (task: TaskItem) => void;
  workspaceMembers: WorkspaceMember[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    priority: 'normal' | 'low' | 'high';
    dueAt: string;
    details: string;
  }>({ title: '', priority: 'normal', dueAt: '', details: '' });
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const resetModal = () => {
    setModalData({ title: '', priority: 'normal', dueAt: '', details: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="rounded-2xl border-gray-200 shadow-none bg-white p-5">
        <div className="mb-6 flex items-center justify-between">
          <h4 className="text-base font-bold text-gray-900">To-do List</h4>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            <span className="text-sm">+</span> Add task
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {tasks.map((t) => {
            const isExpanded = expandedTaskId === t.id;
            const creator = workspaceMembers.find(m => m.userId === t.createdByUserId);
            const isDone = t.taskStatus === 'done';

            return (
              <div key={t.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-300">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => onToggleTask(t)}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${isDone
                        ? 'border-gray-200 bg-gray-50 text-gray-400'
                        : 'border-gray-300 bg-white hover:border-blue-500'
                      }`}
                  >
                    {isDone && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  <div 
                    className="min-w-0 flex-1 cursor-pointer group"
                    onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                  >
                    <p className={`text-sm font-bold leading-tight mb-1 transition-all group-hover:text-blue-600 ${isDone ? 'text-gray-400 line-through' : 'text-gray-900 text-opacity-90'}`}>
                      {t.title}
                    </p>
                    <p className={`text-[11px] font-medium transition-all ${isDone ? 'text-gray-400' : 'text-gray-500 text-opacity-70'}`}>
                      {(() => {
                        if (isDone) return 'Completed';
                        if (!t.dueAt) return 'No due date';
                        const d = new Date(t.dueAt);
                        const today = new Date();
                        const tomorrow = new Date(today);
                        tomorrow.setDate(today.getDate() + 1);

                        if (d.toDateString() === today.toDateString()) return 'Due today';
                        if (d.toDateString() === tomorrow.toDateString()) return 'Due tomorrow';

                        return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                      })()}
                    </p>
                  </div>

                  {creator && (
                    <div className="shrink-0 scale-90">
                      <Avatar
                        initials={getInitials(creator.fullName)}
                        size="sm"
                        src={creator.avatarUrl || undefined}
                      />
                    </div>
                  )}
                </div>

                {isExpanded && t.details && (
                  <div className="mt-3 ml-9 p-3 bg-gray-50/50 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[11px] text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                      {t.details}
                    </p>
                    {t.priority && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'low' ? 'bg-green-500' : 'bg-blue-500'}`} />
                        <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400">{t.priority} priority</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div className="py-6 flex flex-col items-center justify-center text-center opacity-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mb-2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              <p className="text-xs font-medium italic">No tasks active</p>
            </div>
          )}
        </div>
      </Card>

      <Card padding="none" className="rounded-2xl border-gray-200 shadow-none bg-white p-5">
        <h4 className="text-base font-bold text-gray-900 mb-4">Notes</h4>
        <div className="group relative overflow-hidden rounded-xl bg-gray-50/50 border border-gray-100 focus-within:border-blue-200 transition-all">
          <textarea
            value={newNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Write some notes..."
            className="w-full min-h-[160px] bg-transparent p-4 text-sm font-medium text-gray-600 outline-none placeholder:text-gray-400"
          />
          <div className="flex justify-end p-2 border-t border-gray-100 bg-white">
            <button
              onClick={onCreateNote}
              disabled={!newNote.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm"
            >
              Save Note
            </button>
          </div>
        </div>

        {notes.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {notes.map(note => (
              <div key={note.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-all cursor-pointer">
                <p className="text-[11px] font-bold text-gray-900 mb-0.5 truncate">{note.title || 'Untitled Note'}</p>
                <p className="text-[10px] text-gray-500 line-clamp-1">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">New Task</h3>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Title</label>
                  <input
                    autoFocus
                    value={modalData.title}
                    onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                    placeholder="Task title..."
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 border border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <AuthDropdown
                      label="Priority"
                      options={[
                        { label: 'Normal', value: 'normal' },
                        { label: 'High', value: 'high' },
                        { label: 'Low', value: 'low' }
                      ]}
                      value={modalData.priority}
                      onChange={(val) => setModalData({ ...modalData, priority: val as any })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Due Date</label>
                    <TaskDatePicker
                      value={modalData.dueAt}
                      onChange={(val) => setModalData({ ...modalData, dueAt: val })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Details</label>
                  <textarea
                    value={modalData.details}
                    onChange={(e) => setModalData({ ...modalData, details: e.target.value })}
                    placeholder="Add more information here..."
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 border border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all min-h-[100px]"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={resetModal}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (modalData.title.trim()) {
                      onCreateTask(modalData);
                      resetModal();
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomersPanel() {
  return (
    <div className="flex flex-col gap-3">
      <Card padding="sm" className="rounded-2xl border-gray-200 shadow-none">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Customers</h4>
        <p className="text-xs text-gray-500">
          Customer insights panel belum dihubungkan ke data chat. Fokus tahap ini adalah conversation, message, notes, tasks, dan files.
        </p>
      </Card>
    </div>
  );
}

function FilesPanel({
  files,
}: {
  files: AttachmentItem[];
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadLoading: boolean;
}) {
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const mediaFiles = files.filter(f => f.mediaKind === 'image' || f.mediaKind === 'video');
  const docFiles = files.filter(f => f.mediaKind === 'document' || f.mediaKind === 'other');

  const groupedMedia = groupFilesByMonth(mediaFiles);

  return (
    <div className="flex flex-col gap-3">
      {/* Media Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4">
        <h4 className="text-xs font-extrabold text-gray-900 mb-4 tracking-tight opacity-70">Media</h4>
        <div className="space-y-4">
          {Object.entries(groupedMedia).map(([month, items]) => (
            <div key={month} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">{month}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="aspect-square rounded-lg bg-gray-50 overflow-hidden cursor-pointer hover:opacity-80 transition-all relative group ring-1 ring-black/5"
                    onClick={() => setPreviewMedia({ url: item.storagePath, type: item.mediaKind as any })}
                  >
                    {item.mediaKind === 'image' ? (
                      <img src={item.storagePath} className="w-full h-full object-cover" alt={item.fileName} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {mediaFiles.length === 0 && <p className="text-[10px] text-gray-400 italic opacity-60">No media yet</p>}
        </div>
      </section>

      {/* Docs Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4">
        <h4 className="text-xs font-extrabold text-gray-900 mb-4 tracking-tight opacity-70">Docs</h4>
        <div className="flex flex-col gap-3">
          {docFiles.map(file => (
            <div
              key={file.id}
              className="group flex flex-col rounded-xl border border-blue-500/20 bg-white cursor-pointer animate-in fade-in slide-in-from-bottom-1 duration-500"
              onClick={() => window.open(file.storagePath, '_blank')}
            >
              <div className="h-20 bg-gray-50/50 flex items-center justify-center relative overflow-hidden rounded-t-[inherit]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.2" className="relative z-10"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>
              <div className="bg-blue-600 p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white truncate leading-tight">{file.fileName}</p>
                  <p className="text-[8px] text-white/70 font-semibold uppercase tracking-tight">{(file.fileSize / 1024).toFixed(0)} KB • {file.fileName.split('.').pop()}</p>
                </div>
              </div>
              <div className="px-3 py-1.5 flex justify-between items-center bg-blue-500/90 backdrop-blur-sm rounded-b-[inherit]">
                <span className="text-[9px] font-bold text-white/90">{new Date(file.createdAt).toLocaleDateString('en-GB')}</span>
                <div className="bg-white/20 rounded-full p-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              </div>
            </div>
          ))}
          {docFiles.length === 0 && <p className="text-[10px] text-gray-400 italic opacity-60">No documents yet</p>}
        </div>
      </section>

      {/* Reusable Lightbox */}
      <MediaLightbox
        isOpen={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        url={previewMedia?.url || ''}
        type={previewMedia?.type || 'image'}
      />
    </div>
  );
}

// Grouping helper
function groupFilesByMonth(files: AttachmentItem[]) {
  const groups: Record<string, AttachmentItem[]> = {};
  files.forEach(f => {
    const d = new Date(f.createdAt);
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    const now = new Date();
    const isThisMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const label = isThisMonth ? 'THIS MONTH' : `${month.toUpperCase()} ${year}`;
    if (!groups[label]) groups[label] = [];
    groups[label].push(f);
  });
  return groups;
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
  onCreateTask: (task: Partial<TaskItem>) => void;
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
                workspaceMembers={workspaceMembers}
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