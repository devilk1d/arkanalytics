'use client';

import { useState } from 'react';
import Avatar from '../../ui/Avatar';
import { Emoji, EmojiStyle } from 'emoji-picker-react';
import { getInitials } from '../../context/DashboardContext';
import { ConversationItem, formatTime } from './chat-types';

// ─── Member type (from workspace context) ────────────────────────────────────
type WorkspaceMember = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
};

interface ChatSidebarProps {
  // Conversation list
  conversations: ConversationItem[];
  filtered: ConversationItem[];
  activeConvo: string;
  onSelectConvo: (id: string) => void;

  // Search & filter
  search: string;
  onSearchChange: (v: string) => void;
  chatFilter: string;
  onFilterChange: (v: string) => void;

  // Sidebar mode
  sidebarMode: 'list' | 'compose';
  onToggleSidebarMode: () => void;

  // Compose
  composeTab: 'direct' | 'group';
  onComposeTabChange: (tab: 'direct' | 'group') => void;

  // Group creation
  groupName: string;
  onGroupNameChange: (v: string) => void;
  groupMemberIds: string[];
  onGroupMemberToggle: (userId: string, checked: boolean) => void;
  onCreateGroup: () => void;

  // Direct
  onCreateDirect: (peerId: string) => void;

  // Available members (excludes self)
  availableMembers: WorkspaceMember[];

  // Collapsed state (icon-only when sidebar is narrow)
  collapsed?: boolean;
}

const COLLAPSED_WIDTH = 64; // px threshold to show icon-only

// Helper to render text with emojis as Apple style images
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
              <Emoji unified={unicodeToUnifiedSnippet(subPart)} size={14} emojiStyle={EmojiStyle.APPLE} />
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

// ── Icons ────────────────────────────────────────────────────────────────────

function ComposeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3h7v7" /><path d="M21 3 10 14" /><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SearchIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

// ── Filter button labels ──────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'personal', label: 'DM' },
  { key: 'groups', label: 'Groups' },
];

export default function ChatSidebar({
  filtered,
  activeConvo,
  onSelectConvo,
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
  collapsed = false,
}: ChatSidebarProps) {

  // ── Collapsed (icon-only) view ────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 gap-3 h-full">
        {/* Toggle compose */}
        <button
          onClick={onToggleSidebarMode}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-black transition-all"
          title={sidebarMode === 'list' ? 'New Chat' : 'Close'}
        >
          {sidebarMode === 'list' ? <ComposeIcon /> : <CloseIcon />}
        </button>

        <div className="w-6 h-px bg-gray-100" />

        {/* Conversation avatars */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto w-full items-center">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => onSelectConvo(c.id)}
              title={c.name}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${activeConvo === c.id ? 'ring-2 ring-black ring-offset-1' : ''}`}
            >
              {c.type === 'group' ? (
                <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
              ) : (
                <Avatar initials={getInitials(c.name)} size="sm" src={c.avatarUrl || undefined} />
              )}
              <div className="absolute -right-1 -top-1 flex flex-col gap-0.5">
                {c.mentionCount > 0 && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white ring-2 ring-white">
                    @
                  </div>
                )}
                {c.unreadCount > 0 && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[8px] font-bold text-white ring-2 ring-white">
                    {c.unreadCount}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Full view ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ── */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-black">Chats</h3>
          <button
            onClick={onToggleSidebarMode}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
            aria-label="Toggle compose panel"
          >
            {sidebarMode === 'list' ? <ComposeIcon /> : <CloseIcon />}
          </button>
        </div>

        {/* ── List mode: search + filter ── */}
        {sidebarMode === 'list' && (
          <>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-xl outline-none placeholder-gray-400"
              />
            </div>
            {/* Filter pills — always horizontal, shrink labels on small space */}
            <div className="flex flex-row gap-1">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => onFilterChange(f.key)}
                  className={`flex-1 min-w-0 px-2 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${chatFilter === f.key ? 'bg-black text-white' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Compose mode ── */}
        {sidebarMode === 'compose' && (
          <div className="flex flex-col gap-3">
            {/* Direct / Group toggle */}
            <div className="flex gap-1 rounded-xl border border-gray-200 p-1">
              <button
                onClick={() => onComposeTabChange('direct')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${composeTab === 'direct' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
              >
                Direct
              </button>
              <button
                onClick={() => onComposeTabChange('group')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${composeTab === 'group' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
              >
                Group
              </button>
            </div>

            {/* Group form */}
            {composeTab === 'group' && (
              <>
                <input
                  value={groupName}
                  onChange={(e) => onGroupNameChange(e.target.value)}
                  placeholder="Group name"
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-gray-400"
                />
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Add members</p>
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {availableMembers.map((member) => (
                      <label
                        key={member.userId}
                        className="flex cursor-pointer items-center gap-2.5 border-b border-gray-100 px-3 py-2.5 last:border-b-0 hover:bg-gray-50"
                      >
                        <Avatar initials={getInitials(member.fullName)} size="sm" />
                        <span className="flex-1 truncate text-xs font-medium text-gray-800">{member.fullName}</span>
                        <input
                          type="checkbox"
                          checked={groupMemberIds.includes(member.userId)}
                          onChange={(e) => onGroupMemberToggle(member.userId, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={onCreateGroup}
                  className="w-full rounded-xl bg-gray-900 py-2 text-xs font-semibold text-white hover:bg-black"
                >
                  Create group
                </button>
              </>
            )}

            {/* Direct list */}
            {composeTab === 'direct' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-100" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Select member</p>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                <div className="flex flex-col gap-0.5">
                  {availableMembers.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => onCreateDirect(member.userId)}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-gray-50"
                    >
                      <Avatar initials={getInitials(member.fullName)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-900">{member.fullName}</p>
                        <p className="text-[10px] text-gray-400">Member</p>
                      </div>
                      <svg className="shrink-0 text-gray-300" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Conversation list (list mode only) ── */}
      {sidebarMode === 'list' && (
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => onSelectConvo(c.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${activeConvo === c.id ? 'bg-gray-50' : ''}`}
            >
              {c.type === 'group' && !c.avatarUrl ? (
                <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
              ) : (
                <Avatar initials={getInitials(c.name)} size="md" src={c.avatarUrl || undefined} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-black truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-400 shrink-0 ml-1">{formatTime(c.lastAt)}</p>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500 truncate">
                    <RenderEmojiSnippet text={c.lastMessage} />
                  </p>
                  <div className="flex items-center gap-1.5 ml-2">
                    {c.mentionCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm ring-2 ring-white">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="25">@</text>
                        </svg>
                      </span>
                    )}
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}