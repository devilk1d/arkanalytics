'use client';

import { useState, useEffect, useMemo } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import Avatar from '../../ui/Avatar';
import { createClient } from '@/lib/supabase/client';
import { getInitials, type WorkspaceMember } from '../../context/DashboardContext';
import { useRouter } from 'next/navigation';

/* ─── Send To Chat Modal ─── */
interface SendToChatModalProps {
  open: boolean;
  onClose: () => void;
  customers: any[];
  workspaceId: string;
  userId: string;
  members: WorkspaceMember[];
  maxUsage: number;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatarUrl?: string;
  lastMessage?: string;
  lastAt?: string;
}

export function SendToChatModal({ open, onClose, customers, workspaceId, userId, members, maxUsage }: SendToChatModalProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'personal' | 'groups'>('all');
  const [rawRooms, setRawRooms] = useState<any[]>([]);
  const [latestMessages, setLatestMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize supabase client so it doesn't change on every render
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!open) return;
    let active = true;

    async function load() {
      setLoading(true);
      const { data: memberships } = await supabase
        .from('workspace_conversation_members')
        .select(`
          conversation_id,
          workspace_conversations (
            id,
            conversation_type,
            name,
            avatar_url,
            last_message_at,
            workspace_conversation_members (
              user_id
            )
          )
        `)
        .eq('user_id', userId);

      if (!active) return;

      if (memberships) {
        setRawRooms(memberships);

        const convIds = memberships.map((m: any) => m.conversation_id);
        const { data: messages } = await supabase
          .from('workspace_messages')
          .select('conversation_id, body')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });

        if (!active) return;
        setLatestMessages(messages || []);
      }
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [open, userId, supabase]);

  const rooms = useMemo<ChatRoom[]>(() => {
    return rawRooms
      .map((m: any) => {
        const c = m.workspace_conversations;
        if (!c) return null;

        const latest = latestMessages?.find((lm: any) => lm.conversation_id === c.id);

        let displayName = c.name;
        let peerAvatar = c.avatar_url;
        if (c.conversation_type === 'direct') {
          const membersList = c.workspace_conversation_members || [];
          const other = membersList.find((mem: any) => mem.user_id !== userId);
          if (other) {
            const memberInfo = members.find(wm => wm.userId === other.user_id);
            if (memberInfo) {
              displayName = memberInfo.fullName;
              peerAvatar = memberInfo.avatarUrl;
            }
          }
          if (!displayName) displayName = 'Direct Chat';
        }

        return {
          id: c.id,
          name: displayName || 'Chat Room',
          type: c.conversation_type,
          avatarUrl: peerAvatar,
          lastMessage: latest?.body || 'No messages yet',
          lastAt: c.last_message_at
        } as ChatRoom;
      })
      .filter(Boolean) as ChatRoom[];
  }, [rawRooms, latestMessages, userId, members]);

  const filtered = useMemo(() => {
    return rooms.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' ||
        (filter === 'personal' && r.type === 'direct') ||
        (filter === 'groups' && r.type === 'group');
      return matchSearch && matchFilter;
    });
  }, [rooms, search, filter]);

  const handleShare = (room: ChatRoom) => {
    // We send a structured string that will be rendered as a card in ChatMessages
    // Get datasetId from searchParams if not passed (though we might want to pass it explicitly)
    const urlParams = new URLSearchParams(window.location.search);
    const dsId = urlParams.get('dataset_id');

    const shareData = {
      customers: customers.map(c => ({
        id: c.customer_id,
        plan: c.plan_type,
        risk: c.risk_level,
        score: c.churn_score,
        usage: c.usage_hrs ?? c.usage ?? 0,
        segment: c.segment_label ?? c.segment ?? ''
      })),
      datasetId: dsId,
      maxUsage: maxUsage,
      timestamp: new Date().toISOString()
    };
    const prefill = `[CUSTOMER_PROFILE]:${JSON.stringify(shareData)}`;

    router.push(`/dashboard/chat?convo_id=${room.id}&prefill=${encodeURIComponent(prefill)}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Send to Chat" width="sm" padding="none">
      <div className="p-4 border-b border-[var(--b)]">
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg1)] text-[var(--t)] border border-[var(--b)] rounded-xl outline-none focus:border-[var(--t3)] transition-colors placeholder-gray-400 dark:placeholder-zinc-500"
          />
        </div>

        <div className="flex gap-1">
          {(['all', 'personal', 'groups'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${filter === k ? 'bg-[var(--t)] text-[var(--inv-t)]' : 'text-[var(--t3)] hover:bg-[var(--bg2)]'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="p-8 text-center">
            <svg className="animate-spin text-[var(--t3)] mx-auto" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--t3)] font-medium">No chat rooms found</div>
        ) : (
          filtered.map(r => (
            <button
              key={r.id}
              onClick={() => handleShare(r)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg2)] transition-colors border-b border-[var(--b)] last:border-0"
            >
              <div className="relative">
                <Avatar initials={getInitials(r.name)} size="md" src={r.avatarUrl} />
                {r.type === 'group' && (
                  <div className="absolute -right-1 -bottom-1 bg-[var(--t)] rounded-full p-0.5 ring-2 ring-[var(--surf)]">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--inv-t)" strokeWidth="3">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-bold text-[var(--t)] truncate">{r.name}</p>
                  {r.lastAt && (
                    <p className="text-[10px] text-[var(--t3)]">
                      {new Date(r.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <p className="text-xs text-[var(--t3)] truncate font-medium">{r.lastMessage}</p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-3 border-t border-[var(--b)] bg-[var(--bg1)]">
        <p className="text-[10px] text-center text-[var(--t3)] font-medium uppercase tracking-wider">Select a chat to share data</p>
      </div>
    </Modal>
  );
}
