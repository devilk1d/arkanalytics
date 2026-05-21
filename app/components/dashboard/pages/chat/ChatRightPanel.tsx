import { ChangeEvent, JSX, useState, useRef, useEffect } from 'react';
import Card from '../../ui/Card';
import { AttachmentItem, ConversationItem, MessageItem, NoteItem, RightTab, TaskItem, formatTime } from './chat-types';
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
        className="w-full bg-[var(--bg2)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--t)] border border-[var(--b)] outline-none flex items-center justify-between cursor-pointer"
      >
        <span>{selectedDate ? selectedDate.toLocaleDateString('en-GB') : 'dd/mm/yyyy'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--t3)]"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[1002] bg-[var(--bg1)] rounded-3xl border border-[var(--b)] shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200 w-[260px]">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-sm font-extrabold text-[var(--t)]">{monthName} {viewDate.getFullYear()}</h5>
            <div className="flex gap-1">
              <button type="button" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1.5 hover:bg-[var(--bg2)] rounded-lg transition-colors cursor-pointer text-[var(--t2)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1.5 hover:bg-[var(--bg2)] rounded-lg transition-colors cursor-pointer text-[var(--t2)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`} className="text-[10px] font-black text-[var(--t3)] font-mono">{d}</span>)}
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
                  className={`aspect-square text-xs font-bold rounded-xl flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-[var(--accent)] text-[var(--inv)] shadow-md' : 'text-[var(--t2)] hover:bg-[var(--bg2)]'}`}
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  {
    label: 'Actions',
    value: 'actions',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
];

function RightPanelTabs({ active, onChange }: { active: RightTab; onChange: (v: RightTab) => void }) {
  return (
    <div className="rounded-2xl border border-[var(--b)] bg-[var(--bg2)] p-1.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-4 gap-0.5">
        {rightTabs.map(tab => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition-all cursor-pointer ${isActive ? 'bg-[var(--accent)] text-[var(--inv)]' : 'text-[var(--t3)] hover:text-[var(--t2)] hover:bg-[var(--bg3)]'}`}
            >
              <span className={isActive ? 'text-[var(--inv)]' : 'text-[var(--t3)]'}>{tab.icon}</span>
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
            <label className="absolute bottom-0 right-0 p-2 bg-[var(--bg1)] rounded-full shadow-xl border border-[var(--b)] cursor-pointer hover:bg-[var(--bg2)] transition-all opacity-0 group-hover/avatar:opacity-100 translate-y-1 group-hover/avatar:translate-y-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--t2)]"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarSelect} />
            </label>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-base font-bold text-[var(--t)] text-center tracking-tight">{convo.name}</h3>

      {/* Direct Info */}
      {convo.type === 'direct' && (
        <div className="w-full mt-5 space-y-3">
          <div className="flex items-start gap-3 rounded-xl bg-[var(--bg2)] border border-[var(--b)] px-4 py-3">
            <div className="mt-0.5 text-[var(--t3)] shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--t3)] mb-0.5 font-mono">Email</p>
              <p className="text-xs font-semibold text-[var(--t2)] truncate">{peer?.email || '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[var(--bg2)] border border-[var(--b)] px-4 py-3">
            <div className="mt-0.5 text-[var(--t3)] shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--t3)] mb-0.5 font-mono">Arka ID</p>
              <p className="text-xs font-bold text-[var(--t2)] font-mono truncate">{peer?.arkaId ? `@${peer.arkaId}` : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Group Info */}
      {convo.type === 'group' && (
        <div className="w-full mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">
              Members · {convo.memberCount}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--b)] overflow-hidden divide-y divide-[var(--b)] bg-[var(--bg2)]">
            {convo.members.length > 0 ? convo.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg3)] transition-colors">
                <Avatar size="sm" initials={getInitials(m.name)} src={m.avatarUrl || undefined} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--t)] truncate">{m.name}</p>
                  <p className="text-[10px] text-[var(--t3)] font-semibold font-mono">Member</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
              </div>
            )) : (
              <div className="px-4 py-6 text-center text-xs text-[var(--t3)] italic">
                No members found
              </div>
            )}
          </div>

          <div className="mt-5">
            <button
              onClick={() => setAddMemberOpen(prev => !prev)}
              className="w-full flex items-center justify-between rounded-2xl border border-dashed border-[var(--b3)] px-4 py-3 text-xs font-bold text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--t)] hover:bg-[var(--bg2)] transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg3)] text-[var(--t3)]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                Add Member
              </span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`transition-transform duration-200 ${addMemberOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {addMemberOpen && (
              <div className="mt-2 rounded-2xl border border-[var(--b)] overflow-hidden shadow-sm bg-[var(--bg2)]">
                <div className="px-3 py-2 border-b border-[var(--b)]">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--t3)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                    </span>
                    <input
                      autoFocus
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg1)] text-[var(--t)] border border-[var(--b2)] rounded-lg outline-none focus:border-[var(--accent)] transition-all placeholder-[var(--t4)] font-medium"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-[var(--b)]">
                  {filteredCandidates.length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs text-[var(--t3)] italic">
                      {memberSearch ? 'No results found' : 'All workspace members are in this channel'}
                    </div>
                  ) : (
                    filteredCandidates.map(m => (
                      <div key={m.userId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg3)] transition-colors">
                        <Avatar size="sm" initials={getInitials(m.fullName)} src={m.avatarUrl || undefined} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--t)] truncate">{m.fullName}</p>
                          {m.email && <p className="text-[10px] text-[var(--t3)] truncate font-mono">{m.email}</p>}
                        </div>
                        <button
                          onClick={() => void handleInvite(m.userId)}
                          disabled={inviting === m.userId}
                          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[10px] font-bold text-[var(--inv)] hover:opacity-90 disabled:opacity-50 transition-colors cursor-pointer"
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

// ─── Actions Panel ────────────────────────────────────────────────────────────

function ActionsPanel({
  tasks,
  notes,
  newNote,
  onNoteChange,
  onCreateTask,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
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
  onUpdateNote?: (id: string, title: string, content: string) => void;
  onDeleteNote?: (id: string) => void;
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
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteData, setEditNoteData] = useState({ title: '', content: '' });

  const resetModal = () => {
    setModalData({ title: '', priority: 'normal', dueAt: '', details: '' });
    setIsModalOpen(false);
  };

  const activeTasks = tasks.filter(t => t.taskStatus !== 'done' && t.taskStatus !== 'archived');
  const completedTasks = tasks.filter(t => t.taskStatus === 'done' || t.taskStatus === 'archived');

  const STICKY_COLORS = [
    { bg: 'bg-[#FEF08A]', border: 'border-[#FDE047]', text: 'text-[#713F12]', title: 'text-[#78350F]', darkBg: '#854D0E20', darkBorder: '#854D0E50', darkText: '#FDE68A', darkTitle: '#FEF3C7' },
    { bg: 'bg-[#BFDBFE]', border: 'border-[#93C5FD]', text: 'text-[#1E3A8A]', title: 'text-[#1E40AF]', darkBg: '#1E3A8A20', darkBorder: '#1E3A8A50', darkText: '#BFDBFE', darkTitle: '#DBEAFE' },
    { bg: 'bg-[#FBCFE8]', border: 'border-[#F9A8D4]', text: 'text-[#831843]', title: 'text-[#9D174D]', darkBg: '#83184320', darkBorder: '#83184350', darkText: '#FBCFE8', darkTitle: '#FCE7F3' },
    { bg: 'bg-[#BBF7D0]', border: 'border-[#86EFAC]', text: 'text-[#064E3B]', title: 'text-[#065F46]', darkBg: '#064E3B20', darkBorder: '#064E3B50', darkText: '#A7F3D0', darkTitle: '#D1FAE5' },
    { bg: 'bg-[#E9D5FF]', border: 'border-[#D8B4FE]', text: 'text-[#581C87]', title: 'text-[#6B21A8]', darkBg: '#581C8720', darkBorder: '#581C8750', darkText: '#E9D5FF', darkTitle: '#F3E8FF' },
  ];

  const getStickyStyle = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    const c = STICKY_COLORS[Math.abs(hash) % STICKY_COLORS.length];
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      bg: isDark ? `bg-[${c.darkBg}]` : c.bg,
      border: isDark ? `border-[${c.darkBorder}]` : c.border,
      text: isDark ? '' : c.text,
      title: isDark ? '' : c.title,
      textStyle: isDark ? { color: c.darkText } : {},
      titleStyle: isDark ? { color: c.darkTitle } : {},
    };
  };

  const renderTask = (t: TaskItem, isDone: boolean) => {
    const isExpanded = expandedTaskId === t.id;
    const creator = workspaceMembers.find(m => m.userId === t.createdByUserId);

    return (
      <div key={t.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-300">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggleTask(t)}
            className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-lg border-2 transition-all cursor-pointer ${isDone
                ? 'border-[var(--b)] bg-[var(--bg2)] text-[var(--accent)]'
                : 'border-[var(--b3)] bg-[var(--bg1)] hover:border-[var(--accent)]'
              }`}
          >
            {isDone && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <div 
            className="min-w-0 flex-1 cursor-pointer group"
            onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
          >
            <p className={`text-xs font-bold leading-tight mb-0.5 transition-all group-hover:text-[var(--accent)] ${isDone ? 'text-[var(--t3)] line-through' : 'text-[var(--t)]'}`}>
              {t.title}
            </p>
            <p className={`text-[10px] font-bold font-mono uppercase ${isDone ? 'text-[var(--t3)]' : 'text-[var(--t3)]'}`}>
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
          <div className="mt-2.5 ml-7.5 p-3 bg-[var(--bg2)] rounded-xl border border-[var(--b)] animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-[11px] text-[var(--t2)] leading-relaxed font-semibold">
              {t.details}
            </p>
            {t.priority && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'low' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--t3)] font-mono">{t.priority} priority</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="rounded-2xl border-[var(--b)] shadow-none bg-[var(--bg1)] p-5">
        <div className="mb-5 flex items-center justify-between">
          <h4 className="text-sm font-bold text-[var(--t)]">To-do List</h4>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold text-[var(--accent)] hover:underline transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="text-sm">+</span> Add task
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {activeTasks.map((t) => renderTask(t, false))}
          
          {activeTasks.length === 0 && (
            <div className="py-6 flex flex-col items-center justify-center text-center opacity-50 text-[var(--t3)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="mb-2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              <p className="text-xs font-bold italic">No active tasks</p>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--b)]">
              <button 
                onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                className="flex items-center justify-between w-full text-xs font-bold text-[var(--t3)] hover:text-[var(--t)] transition-colors mb-2.5 cursor-pointer"
              >
                <span>Completed ({completedTasks.length})</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showCompletedTasks ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {showCompletedTasks && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {completedTasks.map((t) => renderTask(t, true))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card padding="none" className="rounded-2xl border-[var(--b)] shadow-none bg-[var(--bg1)] p-5">
        <h4 className="text-sm font-bold text-[var(--t)] mb-4">Notes</h4>
        <div className="group relative overflow-hidden rounded-xl bg-[var(--bg2)] border border-[var(--b2)] focus-within:border-[var(--accent)] transition-all">
          <textarea
            value={newNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Write some notes..."
            className="w-full min-h-[120px] bg-transparent p-4 text-xs font-medium text-[var(--t)] outline-none placeholder-[var(--t4)]"
          />
          <div className="flex justify-end p-2 border-t border-[var(--b)] bg-[var(--bg1)]">
            <button
              onClick={onCreateNote}
              disabled={!newNote.trim()}
              className="px-4 py-1.5 bg-[var(--accent)] hover:opacity-90 disabled:opacity-30 text-[var(--inv)] text-[10px] font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            >
              Save Note
            </button>
          </div>
        </div>

        {notes.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {notes.map(note => {
              const color = getStickyStyle(note.id);
              const isEditing = editingNoteId === note.id;

              if (isEditing) {
                return (
                  <div key={note.id} className="p-4 rounded-xl border-2 border-[var(--accent)] bg-[var(--bg2)] shadow-lg transition-all animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={editNoteData.title}
                      onChange={(e) => setEditNoteData({ ...editNoteData, title: e.target.value })}
                      className="w-full bg-transparent text-xs font-bold text-[var(--t)] outline-none mb-2 placeholder-[var(--t4)]"
                      placeholder="Note Title"
                    />
                    <textarea
                      value={editNoteData.content}
                      onChange={(e) => setEditNoteData({ ...editNoteData, content: e.target.value })}
                      className="w-full min-h-[80px] bg-transparent text-xs font-medium text-[var(--t2)] outline-none resize-none placeholder-[var(--t4)]"
                      placeholder="Note content..."
                    />
                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[var(--b)]">
                      <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 text-[10px] font-bold text-[var(--t3)] hover:bg-[var(--bg3)] bg-[var(--bg1)] rounded-lg cursor-pointer">Cancel</button>
                      <button 
                        onClick={() => {
                          if (onUpdateNote) onUpdateNote(note.id, editNoteData.title, editNoteData.content);
                          setEditingNoteId(null);
                        }} 
                        disabled={!editNoteData.content.trim()}
                        className="px-3 py-1.5 text-[10px] font-bold text-[var(--inv)] bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={note.id} className={`relative p-4 rounded-xl border ${color.bg} ${color.border} shadow-sm group hover:-translate-y-0.5 hover:shadow-md transition-all`}>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setEditNoteData({ title: note.title, content: note.content });
                        setEditingNoteId(note.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-black/10 transition-colors cursor-pointer"
                      style={color.titleStyle}
                      title="Edit Note"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Delete this note?') && onDeleteNote) {
                          onDeleteNote(note.id);
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-black/10 transition-colors cursor-pointer text-red-500"
                      title="Delete Note"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                  
                  <div className="absolute top-0 right-0 w-4 h-4 rounded-bl-xl bg-black/5 border-l border-b border-black/5"></div>

                  <p className={`text-xs font-bold mb-1.5 pr-12 truncate leading-tight ${color.title}`} style={color.titleStyle}>{note.title || 'Untitled Note'}</p>
                  <p className={`text-[11px] whitespace-pre-wrap leading-relaxed font-semibold ${color.text}`} style={color.textStyle}>{note.content}</p>
                </div>
              );
            })}          </div>
        )}
      </Card>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="w-full max-w-sm bg-[var(--bg1)] rounded-3xl shadow-2xl border border-[var(--b)] animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[var(--t)]">New Task</h3>
                <button onClick={resetModal} className="text-[var(--t3)] hover:text-[var(--t)] transition-colors cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider mb-1.5 block font-mono">Title</label>
                  <input
                    autoFocus
                    value={modalData.title}
                    onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                    placeholder="Task title..."
                    className="w-full bg-[var(--bg2)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--t)] border border-[var(--b2)] focus:border-[var(--accent)] outline-none transition-all placeholder-[var(--t4)]"
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
                    <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider mb-1.5 block font-mono">Due Date</label>
                    <TaskDatePicker
                      value={modalData.dueAt}
                      onChange={(val) => setModalData({ ...modalData, dueAt: val })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider mb-1.5 block font-mono">Details</label>
                  <textarea
                    value={modalData.details}
                    onChange={(e) => setModalData({ ...modalData, details: e.target.value })}
                    placeholder="Add task details here..."
                    className="w-full bg-[var(--bg2)] rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--t)] border border-[var(--b2)] focus:border-[var(--accent)] outline-none transition-all min-h-[80px] placeholder-[var(--t4)]"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={resetModal}
                  className="flex-1 px-4 py-2.5 bg-[var(--bg2)] hover:bg-[var(--bg3)] text-[var(--t2)] text-xs font-bold rounded-2xl transition-all cursor-pointer border border-[var(--b)]"
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
                  className="flex-1 px-4 py-2.5 bg-[var(--accent)] hover:opacity-90 text-[var(--inv)] text-xs font-bold rounded-2xl transition-all shadow-md cursor-pointer"
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

// ─── Customers Panel ──────────────────────────────────────────────────────────

function CustomersPanel({ messages }: { messages: MessageItem[] }) {
  const customersMap = new Map<string, any>();
  let maxUsage = 1;

  messages.forEach(m => {
    if (m.body.startsWith('[CUSTOMER_PROFILE]:')) {
      try {
        const data = JSON.parse(m.body.replace('[CUSTOMER_PROFILE]:', ''));
        const msgMaxUsage = Number(data.maxUsage || 0);
        if (msgMaxUsage > maxUsage) maxUsage = msgMaxUsage;

        data.customers.forEach((c: any) => {
          const normUsage = Number(c.usage ?? c.usage_hrs ?? 0);
          customersMap.set(c.id, { 
            ...c, 
            usage: normUsage,
            datasetId: data.datasetId 
          });
          if (normUsage > maxUsage) maxUsage = normUsage;
        });
      } catch (e) {
        console.error('Failed to parse customer profile in sidebar:', e);
      }
    }
  });

  const customerList = Array.from(customersMap.values());

  if (customerList.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Card padding="none" className="rounded-2xl border-[var(--b)] shadow-none bg-[var(--bg1)] p-5">
          <h4 className="mb-4 text-sm font-bold text-[var(--t)]">Shared Customers</h4>
          <div className="py-8 flex flex-col items-center justify-center text-center text-[var(--t3)]">
            <div className="w-10 h-10 rounded-full bg-[var(--bg2)] flex items-center justify-center mb-3">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <p className="text-xs font-bold italic">No customers shared yet</p>
            <p className="text-[10px] font-semibold mt-1 max-w-[170px] leading-normal">Customer profiles shared in this conversation will be listed here.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-8">
      <Card padding="none" className="rounded-2xl border-[var(--b)] shadow-none bg-[var(--bg1)] p-5">
        <h4 className="text-sm font-bold text-[var(--t)] mb-5">Shared Customers</h4>
        
        <div className="flex flex-col gap-5">
          {customerList.map((c) => {
            const usageVal = c.usage || 0;
            const usagePercent = maxUsage > 0 ? Math.min(100, Math.round((usageVal / maxUsage) * 100)) : 0;
            
            const barColor = usagePercent > 70 ? 'bg-emerald-500' : usagePercent > 40 ? 'bg-amber-500' : 'bg-red-500';
            const riskColor = c.risk === 'High' 
              ? 'text-red-500 border-red-500/20 bg-red-500/10' 
              : c.risk === 'Medium' 
                ? 'text-amber-500 border-amber-500/20 bg-amber-500/10' 
                : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';

            return (
              <div key={c.id} className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
                <div className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center shrink-0 ${
                  c.id.charCodeAt(0) % 4 === 0 ? 'bg-blue-500/10 text-blue-500' : 
                  c.id.charCodeAt(0) % 4 === 1 ? 'bg-purple-500/10 text-purple-500' : 
                  c.id.charCodeAt(0) % 4 === 2 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                }`}>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" /></svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 cursor-pointer hover:opacity-75 transition-opacity" onClick={() => window.location.href = `/dashboard/analytics?dataset_id=${c.datasetId}&analyze_id=${c.id}`}>
                      <p className="text-xs font-bold text-[var(--t)] truncate tracking-tight font-mono">{c.id}</p>
                      <p className="text-[10px] text-[var(--t3)] font-bold truncate capitalize">{c.plan} Plan</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-tighter ${riskColor}`}>
                        {c.risk} Risk
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-bold text-[var(--t3)]">Usage</span>
                        <span className="text-[9px] font-bold text-[var(--t2)] font-mono">{usagePercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg2)] rounded-full overflow-hidden border border-[var(--b)]">
                        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${usagePercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => window.location.href = '/dashboard/analytics'}
          className="w-full mt-6 pt-5 border-t border-[var(--b)] flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--t2)] hover:text-[var(--accent)] transition-colors group cursor-pointer"
        >
          View all customers
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
      </Card>
    </div>
  );
}

// ─── Files Panel ──────────────────────────────────────────────────────────────

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
      <section className="bg-[var(--bg1)] rounded-2xl border border-[var(--b)] p-4">
        <h4 className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-wider mb-3 font-mono">Media Files</h4>
        <div className="space-y-4">
          {Object.entries(groupedMedia).map(([month, items]) => (
            <div key={month} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
              <p className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-widest mb-2 font-mono">{month}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="aspect-square rounded-lg bg-[var(--bg2)] overflow-hidden cursor-pointer hover:opacity-85 transition-all relative group ring-1 ring-black/5"
                    onClick={() => setPreviewMedia({ url: item.storagePath, type: item.mediaKind as any })}
                  >
                    {item.mediaKind === 'image' ? (
                      <img src={item.storagePath} className="w-full h-full object-cover" alt={item.fileName} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--bg3)] text-[var(--t2)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {mediaFiles.length === 0 && <p className="text-xs text-[var(--t3)] italic">No media shared yet</p>}
        </div>
      </section>

      {/* Docs Section */}
      <section className="bg-[var(--bg1)] rounded-2xl border border-[var(--b)] p-4">
        <h4 className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-wider mb-3 font-mono">Documents</h4>
        <div className="flex flex-col gap-3">
          {docFiles.map(file => (
            <div
              key={file.id}
              className="group flex flex-col rounded-xl border border-[var(--b2)] bg-[var(--bg2)] hover:border-[var(--accent)] transition-all cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-500"
              onClick={() => window.open(file.storagePath, '_blank')}
            >
              <div className="h-16 bg-[var(--bg3)] flex items-center justify-center relative overflow-hidden rounded-t-[inherit]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--t3)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>
              <div className="bg-[var(--accent)] p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white truncate leading-tight">{file.fileName}</p>
                  <p className="text-[8px] text-white/70 font-bold uppercase tracking-tight font-mono">{(file.fileSize / 1024).toFixed(0)} KB • {file.fileName.split('.').pop()}</p>
                </div>
              </div>
              <div className="px-3 py-1.5 flex justify-between items-center bg-[var(--bg1)] border-t border-[var(--b)]">
                <span className="text-[9px] font-bold text-[var(--t3)] font-mono">{new Date(file.createdAt).toLocaleDateString('en-GB')}</span>
                <div className="bg-[var(--bg2)] text-[var(--t2)] rounded-full p-0.5 border border-[var(--b2)]">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              </div>
            </div>
          ))}
          {docFiles.length === 0 && <p className="text-xs text-[var(--t3)] italic">No documents shared yet</p>}
        </div>
      </section>

      <MediaLightbox
        isOpen={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        url={previewMedia?.url || ''}
        type={previewMedia?.type || 'image'}
      />
    </div>
  );
}

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

  tasks: TaskItem[];
  notes: NoteItem[];
  newTask: string;
  newNote: string;
  onTaskChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onCreateTask: (task: Partial<TaskItem>) => void;
  onCreateNote: () => void;
  onUpdateNote?: (id: string, title: string, content: string) => void;
  onDeleteNote?: (id: string) => void;
  onToggleTask: (task: TaskItem) => void;

  files: AttachmentItem[];
  messages: MessageItem[];
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadLoading: boolean;

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
  messages,
  notes,
  newTask,
  newNote,
  onTaskChange,
  onNoteChange,
  onCreateTask,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
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
    customers: 'Select a conversation to view shared customers',
    files: 'Select a conversation to view shared files',
  };
  
  return (
    <div className="flex flex-col h-full bg-[var(--bg1)] text-[var(--t)] border-l border-[var(--b)]">
      
      {/* ── Tabs selector ── */}
      <div className="px-4 pt-3.5 pb-3 border-b border-[var(--b)] shrink-0">
        <RightPanelTabs active={activeTab} onChange={onTabChange} />
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {!convo ? (
          <div className="flex flex-col items-center justify-center h-40 text-center text-xs text-[var(--t3)] italic">
            {emptyMessages[activeTab]}
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
                onUpdateNote={onUpdateNote}
                onDeleteNote={onDeleteNote}
                onToggleTask={onToggleTask}
                workspaceMembers={workspaceMembers}
              />
            )}

            {activeTab === 'customers' && <CustomersPanel messages={messages} />}

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
    </div>
  );
}