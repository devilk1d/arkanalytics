'use client';

import { useState } from 'react';
import Avatar from '../../ui/Avatar';
import { Emoji, EmojiStyle } from 'emoji-picker-react';
import { getInitials } from '../../context/DashboardContext';
import { ConversationItem, formatTime } from './chat-types';

type WorkspaceMember = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
};

interface ChatSidebarProps {
  conversations: ConversationItem[];
  filtered: ConversationItem[];
  activeConvo: string;
  onSelectConvo: (id: string) => void;
  onDeleteConvo?: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  chatFilter: string;
  onFilterChange: (v: string) => void;
  sidebarMode: 'list' | 'compose';
  onToggleSidebarMode: () => void;
  composeTab: 'direct' | 'group';
  onComposeTabChange: (tab: 'direct' | 'group') => void;
  groupName: string;
  onGroupNameChange: (v: string) => void;
  groupMemberIds: string[];
  onGroupMemberToggle: (userId: string, checked: boolean) => void;
  onCreateGroup: () => void;
  onCreateDirect: (peerId: string) => void;
  availableMembers: WorkspaceMember[];
  currentUserId: string;
  collapsed?: boolean;
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function RenderEmojiSnippet({ text }: { text: string }) {
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  if (!text) return null;
  const parts = text.split(emojiRegex);

  return (
    <>
      {parts.map((subPart, i) => {
        if (emojiRegex.test(subPart)) {
          return (
            <span key={i} className="inline-block mx-0.5 align-middle leading-none">
              <Emoji unified={unicodeToUnifiedSnippet(subPart)} size={12} emojiStyle={EmojiStyle.APPLE} />
            </span>
          );
        }
        return <span key={i}>{subPart}</span>;
      })}
    </>
  );
}

function unicodeToUnifiedSnippet(emoji: string) {
  return Array.from(emoji).map(char => char.codePointAt(0)!.toString(16)).join('-');
}

function ComposeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SearchIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'personal', label: 'DMs' },
  { key: 'groups', label: 'Channels' },
];

export default function ChatSidebar({
  filtered,
  activeConvo,
  onSelectConvo,
  onDeleteConvo,
  search,
  onSearchChange,
  chatFilter,
  onFilterChange,
  sidebarMode,
  onToggleSidebarMode,
  composeTab,
  onComposeTabChange,
  groupName,
  onGroupNameChange,
  groupMemberIds,
  onGroupMemberToggle,
  onCreateGroup,
  onCreateDirect,
  availableMembers,
  currentUserId,
  collapsed = false,
}: ChatSidebarProps) {
  const [deletingConvoId, setDeletingConvoId] = useState<string | null>(null);

  // ── Collapsed (icon-only) view ────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 gap-3 h-full bg-[var(--bg1)] border-r border-[var(--b)]">
        <button
          onClick={onToggleSidebarMode}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--t3)] hover:bg-[var(--bg2)] hover:text-[var(--t)] transition-all cursor-pointer"
          title={sidebarMode === 'list' ? 'New Chat' : 'Close'}
        >
          {sidebarMode === 'list' ? <ComposeIcon /> : <CloseIcon />}
        </button>

        <div className="w-6 h-px bg-[var(--b)]" />

        <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto w-full items-center">
          {filtered.map(c => {
            const isActive = activeConvo === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectConvo(c.id)}
                title={c.name}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${isActive ? 'ring-2 ring-[var(--accent)] ring-offset-1 bg-[var(--bg3)]' : 'hover:bg-[var(--bg2)]'}`}
              >
                <Avatar initials={getInitials(c.name)} size="sm" src={c.avatarUrl || undefined} />
                <div className="absolute -right-1 -top-1 flex flex-col gap-0.5">
                  {c.mentionCount > 0 && (
                    <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-600 text-[8px] font-black text-white ring-2 ring-[var(--bg1)]">
                      @
                    </div>
                  )}
                  {c.unreadCount > 0 && (
                    <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--accent)] text-[8px] font-black text-[var(--inv)] ring-2 ring-[var(--bg1)]">
                      {c.unreadCount}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const channels = filtered.filter(c => c.type === 'group');
  const dms = filtered.filter(c => c.type === 'direct');

  // ── Full view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[var(--bg1)] text-[var(--t)] border-r border-[var(--b)]">
      
      {/* ── Sidebar Title & Controls ── */}
      <div style={{ padding: '16px 16px 12px' }} className="border-b border-[var(--b)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-bold text-[var(--t3)] uppercase tracking-[0.12em] mb-0.5 font-mono">Workspace</div>
            <div className="text-sm font-bold text-[var(--t)] tracking-tight">Team Chat</div>
          </div>
          <button
            onClick={onToggleSidebarMode}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--t3)] hover:bg-[var(--bg2)] hover:text-[var(--t)] transition-all cursor-pointer"
            aria-label="Toggle compose panel"
          >
            {sidebarMode === 'list' ? <ComposeIcon /> : <CloseIcon />}
          </button>
        </div>
      </div>

      {/* ── Search & Filters ── */}
      {sidebarMode === 'list' && (
        <div className="px-4 pt-3 pb-2 flex flex-col gap-2 shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]">
              <SearchIcon size={12} />
            </span>
            <input
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg2)] text-[var(--t)] border border-[var(--b2)] rounded-lg outline-none focus:border-[var(--accent)] transition-all placeholder-[var(--t4)]"
            />
          </div>
          <div className="flex flex-row gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => onFilterChange(f.key)}
                className={`flex-1 min-w-0 px-2 py-1 text-[12px] font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${chatFilter === f.key ? 'bg-[var(--accent)] text-[var(--inv)]' : 'text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Compose Mode ── */}
      {sidebarMode === 'compose' && (
        <div className="p-4 flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex gap-1 rounded-xl border border-[var(--b2)] bg-[var(--bg2)] p-1 shrink-0">
            <button
              onClick={() => onComposeTabChange('direct')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${composeTab === 'direct' ? 'bg-[var(--accent)] text-[var(--inv)]' : 'text-[var(--t3)] hover:text-[var(--t2)]'}`}
            >
              Direct Message
            </button>
            <button
              onClick={() => onComposeTabChange('group')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${composeTab === 'group' ? 'bg-[var(--accent)] text-[var(--inv)]' : 'text-[var(--t3)] hover:text-[var(--t2)]'}`}
            >
              New Channel
            </button>
          </div>

          {composeTab === 'group' && (
            <>
              <input
                value={groupName}
                onChange={(e) => onGroupNameChange(e.target.value)}
                placeholder="Channel name..."
                className="w-full px-3 py-2 text-xs bg-[var(--bg2)] text-[var(--t)] border border-[var(--b2)] rounded-xl outline-none focus:border-[var(--accent)] transition-all placeholder-[var(--t4)] font-medium shrink-0"
              />
              <div className="overflow-hidden rounded-xl border border-[var(--b2)] bg-[var(--bg2)] flex-1 min-h-0 flex flex-col">
                <div className="border-b border-[var(--b)] px-3 py-2 shrink-0">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--t3)] font-mono">Select Members</p>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[var(--b)]">
                  {availableMembers.map((member) => (
                    <label
                      key={member.userId}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-[var(--bg3)] transition-colors"
                    >
                      <Avatar initials={getInitials(member.fullName)} src={member.avatarUrl || undefined} size="sm" />
                      <span className="flex-1 truncate text-xs font-bold text-[var(--t2)]">{member.fullName}</span>
                      <input
                        type="checkbox"
                        checked={groupMemberIds.includes(member.userId)}
                        onChange={(e) => onGroupMemberToggle(member.userId, e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-[var(--b3)] accent-[var(--accent)]"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={onCreateGroup}
                disabled={!groupName.trim()}
                className="w-full rounded-xl bg-[var(--accent)] py-2 text-xs font-bold text-[var(--inv)] hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all active:scale-[0.98] shrink-0"
              >
                Create Channel
              </button>
            </>
          )}

          {composeTab === 'direct' && (
            <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--t3)] px-1 mb-1 font-mono shrink-0">Workspace Members</p>
              {availableMembers.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => onCreateDirect(member.userId)}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-[var(--bg2)] transition-colors cursor-pointer w-full shrink-0"
                >
                  <Avatar initials={getInitials(member.fullName)} src={member.avatarUrl || undefined} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[var(--t)]">{member.fullName}</p>
                    <p className="text-[12px] text-[var(--t3)] font-semibold font-mono">Member</p>
                  </div>
                  <svg className="shrink-0 text-[var(--t3)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Conversation List ── */}
      {sidebarMode === 'list' && (
        <div className="flex-1 overflow-y-auto py-2">

          {/* ── Section: Channels (Groups) ── */}
          {channels.length > 0 && (
            <div className="mb-4">
              <div className="px-4 py-1 text-[12px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">
                Channels
              </div>
              <div className="flex flex-col">
                {channels.map(c => {
                  const isActive = activeConvo === c.id;
                  return (
                    <div
                      key={c.id}
                      className="relative group flex items-center w-full transition-colors"
                      style={{
                        background: isActive ? 'var(--bg3)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <button
                        onClick={() => onSelectConvo(c.id)}
                        className="flex-1 min-w-0 flex items-center gap-2.5 pl-4 pr-8 py-2 text-left cursor-pointer"
                      >
                        <div className="relative shrink-0">
                          <Avatar initials={getInitials(c.name)} size="sm" src={c.avatarUrl || undefined} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${isActive ? 'font-bold text-[var(--t)]' : 'font-medium text-[var(--t2)]'}`}>
                              {c.name}
                            </p>
                            <span className="text-[9px] text-[var(--t3)] font-mono shrink-0 ml-1">
                              {formatTime(c.lastAt)}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--t3)] truncate font-medium">
                            <RenderEmojiSnippet text={c.lastMessage} />
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {c.mentionCount > 0 && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-black leading-none">@</span>
                          )}
                          {c.unreadCount > 0 && (
                            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--inv)] px-1 py-0.5 text-[8px] font-black leading-none">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeletingConvoId(c.id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg text-[var(--t4)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete channel"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section: Direct Messages ── */}
          {dms.length > 0 && (
            <div>
              <div className="px-4 py-1 text-[12px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">
                Direct Messages
              </div>
              <div className="flex flex-col">
                {dms.map(c => {
                  const isActive = activeConvo === c.id;
                  return (
                    <div
                      key={c.id}
                      className="relative group flex items-center w-full transition-colors"
                      style={{
                        background: isActive ? 'var(--bg3)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <button
                        onClick={() => onSelectConvo(c.id)}
                        className="flex-1 min-w-0 flex items-center gap-2.5 pl-4 pr-8 py-2 text-left cursor-pointer"
                      >
                        <div className="relative shrink-0">
                          <Avatar initials={getInitials(c.name)} size="sm" src={c.avatarUrl || undefined} />
                          {(() => {
                            const peer = c.members.find(m => m.id !== currentUserId);
                            if (!peer?.isOnline) return null;
                            return <div className="absolute right-0 bottom-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-[var(--bg1)]" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${isActive ? 'font-bold text-[var(--t)]' : 'font-medium text-[var(--t2)]'}`}>
                              {c.name}
                            </p>
                            <span className="text-[9px] text-[var(--t3)] font-mono shrink-0 ml-1">
                              {formatTime(c.lastAt)}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--t3)] truncate font-medium">
                            <RenderEmojiSnippet text={c.lastMessage} />
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {c.mentionCount > 0 && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-black leading-none">@</span>
                          )}
                          {c.unreadCount > 0 && (
                            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--inv)] px-1 py-0.5 text-[8px] font-black leading-none">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeletingConvoId(c.id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg text-[var(--t4)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete conversation"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[var(--t3)] italic">
              No conversations found
            </div>
          )}
        </div>
      )}

      {/* ── Delete conversation modal ── */}
      {deletingConvoId && (() => {
        const target = filtered.find(c => c.id === deletingConvoId);
        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setDeletingConvoId(null)}
          >
            <div
              className="bg-[var(--bg1)] border border-[var(--b)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3.5 px-5 pt-5 pb-4">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--t)]">
                    Delete {target?.type === 'group' ? 'channel' : 'conversation'}?
                  </h3>
                  <p className="text-[11px] text-[var(--t3)] mt-0.5 font-medium">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Conversation preview */}
              {target && (
                <div className="mx-5 mb-4 px-3.5 py-2.5 bg-[var(--bg2)] border border-[var(--b)] rounded-xl flex items-center gap-2.5">
                  <Avatar initials={getInitials(target.name)} size="sm" src={target.avatarUrl || undefined} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--t)] truncate">{target.name}</p>
                    <p className="text-[10px] text-[var(--t3)] font-mono">
                      {target.type === 'group' ? `${target.memberCount} members` : 'Direct message'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2.5 px-5 pb-5">
                <button
                  onClick={() => setDeletingConvoId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--b)] bg-[var(--bg2)] text-xs font-bold text-[var(--t2)] hover:bg-[var(--bg3)] transition-all cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onDeleteConvo?.(deletingConvoId); setDeletingConvoId(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-all cursor-pointer active:scale-[0.98] shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}