'use client';

import { ChangeEvent, JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Avatar from '../../ui/Avatar';
import { createClient } from '@/lib/supabase/client';
import { getInitials, useDashboardContext } from '../../context/DashboardContext';

type MemberLite = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type ConversationItem = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  memberCount: number;
  members: MemberLite[];
  avatarUrl: string | null;
  lastMessage: string;
  lastAt: string | null;
  unreadCount: number;
};

type MessageItem = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: string;
};

type TaskItem = {
  id: string;
  title: string;
  taskStatus: 'open' | 'done' | 'archived';
};

type NoteItem = {
  id: string;
  title: string;
  content: string;
};

type AttachmentItem = {
  id: string;
  fileName: string;
  mediaKind: string;
  createdAt: string;
  storagePath: string;
};

type RightTab = 'actions' | 'customers' | 'files';

type ConversationRow = {
  id: string;
  conversation_type: 'direct' | 'group';
  name: string | null;
  direct_key: string | null;
  last_message_at: string | null;
};

type MembershipWithConversation = {
  conversation_id: string;
  workspace_conversations: ConversationRow | null;
};

type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
  users: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type LatestMessageRow = {
  conversation_id: string;
  body: string | null;
  created_at: string;
  sender_user_id: string;
};

type MessageRow = {
  id: string;
  body: string | null;
  sender_user_id: string;
  created_at: string;
  users: { full_name: string | null; avatar_url: string | null } | null;
};

type NoteRow = { id: string; title: string; content: string };
type TaskRow = { id: string; title: string; task_status: 'open' | 'done' | 'archived' };
type AttachmentRow = { id: string; file_name: string; media_kind: string; created_at: string; storage_path: string };
type ConversationReadRow = { conversation_id: string; user_id: string; last_read_at: string };

const rightTabs: Array<{ label: string; value: RightTab; icon: JSX.Element }> = [
  {
    label: 'Actions',
    value: 'actions',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="14 3 14 9 20 9" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
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

function RightPanelTabs({ active, onChange }: { active: RightTab; onChange: (value: RightTab) => void }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-3 gap-1">
        {rightTabs.map(tab => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <span className={isActive ? 'text-gray-800' : 'text-gray-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 h-px bg-gray-200">
        <div
          className="h-px bg-gray-900 transition-all duration-300"
          style={{ width: '33.333%', transform: `translateX(${active === 'actions' ? '0%' : active === 'customers' ? '100%' : '200%'})` }}
        />
      </div>
    </div>
  );
}

function formatTime(ts: string | null) {
  if (!ts) {
    return '';
  }
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ActionsPanel({
  tasks,
  notes,
  newTask,
  newNote,
  onTaskChange,
  onNoteChange,
  onCreateTask,
  onCreateNote,
  onToggleTask,
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
          <button onClick={onCreateTask} className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Add task</button>
        </div>
        <div className="mb-3">
          <input
            value={newTask}
            onChange={(e) => onTaskChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onCreateTask();
              }
            }}
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
                {t.taskStatus === 'done' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium leading-5 ${t.taskStatus === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.title}</p>
                <p className={`text-[11px] leading-4 ${t.taskStatus === 'done' ? 'text-gray-400' : 'text-gray-500'}`}>{t.taskStatus}</p>
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
          <button onClick={onCreateNote} className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
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
  files,
  onUpload,
  uploadLoading,
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

/* ─── Main Chat Page ─── */
export default function ChatPage() {
  const supabase = useMemo(() => createClient(), []);
  const { workspace, profile, members } = useDashboardContext();
  const memberNameById = useMemo(
    () =>
      members.reduce<Record<string, string>>((acc, member) => {
        acc[member.userId] = member.fullName;
        return acc;
      }, {}),
    [members],
  );
  const memberAvatarById = useMemo(
    () =>
      members.reduce<Record<string, string | null>>((acc, member) => {
        acc[member.userId] = member.avatarUrl;
        return acc;
      }, {}),
    [members],
  );

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvo, setActiveConvo] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const [message, setMessage] = useState('');
  const [chatFilter, setChatFilter] = useState('all');
  const [rightTab, setRightTab] = useState<RightTab>('actions');
  const [search, setSearch] = useState('');
  const [sidebarMode, setSidebarMode] = useState<'list' | 'compose'>('list');
  const [autoSelectEnabled, setAutoSelectEnabled] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [inviteUserId, setInviteUserId] = useState('');
  const [conversationReads, setConversationReads] = useState<Record<string, Record<string, string>>>({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    if (!workspace?.id || !profile?.id) {
      return;
    }

    const { data: myMemberships } = await supabase
      .from('workspace_conversation_members')
      .select('conversation_id, workspace_conversations(id, conversation_type, name, direct_key, last_message_at)')
      .eq('user_id', profile.id);

    const convRows = ((myMemberships || []) as MembershipWithConversation[])
      .map((row) => row.workspace_conversations)
      .filter((row): row is ConversationRow => Boolean(row && row.id));

    const conversationIds = convRows.map((row) => row.id);
    if (conversationIds.length === 0) {
      setConversations([]);
      setActiveConvo('');
      return;
    }

    const [{ data: allMembers }, { data: latestMessages }] = await Promise.all([
      supabase
        .from('workspace_conversation_members')
        .select('conversation_id, user_id, users(id, full_name, avatar_url)')
        .in('conversation_id', conversationIds),
      supabase
        .from('workspace_messages')
        .select('conversation_id, body, created_at, sender_user_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false }),
    ]);

    const memberByConversation = new Map<string, MemberLite[]>();
    ((allMembers || []) as ConversationMemberRow[]).forEach((row) => {
      const list = memberByConversation.get(row.conversation_id) || [];
      list.push({
        id: row.user_id,
        name: row.users?.full_name || memberNameById[row.user_id] || 'User',
        avatarUrl: row.users?.avatar_url || memberAvatarById[row.user_id] || null,
      });
      memberByConversation.set(row.conversation_id, list);
    });

    const latestRows = (latestMessages || []) as LatestMessageRow[];
    const latestByConversation = new Map<string, { body: string; createdAt: string }>();
    latestRows.forEach((row) => {
      if (!latestByConversation.has(row.conversation_id)) {
        latestByConversation.set(row.conversation_id, {
          body: row.body || '',
          createdAt: row.created_at,
        });
      }
    });

    const { data: readRows } = await supabase
      .from('workspace_conversation_reads')
      .select('conversation_id, user_id, last_read_at')
      .in('conversation_id', conversationIds);

    const readMap: Record<string, Record<string, string>> = {};
    ((readRows || []) as ConversationReadRow[]).forEach((row) => {
      if (!readMap[row.conversation_id]) {
        readMap[row.conversation_id] = {};
      }
      readMap[row.conversation_id][row.user_id] = row.last_read_at;
    });
    setConversationReads(readMap);

    const mapped: ConversationItem[] = convRows.map((row) => {
      const convMembers = memberByConversation.get(row.id) || [];
      const latest = latestByConversation.get(row.id);
      const myLastReadAt = readMap[row.id]?.[profile.id] || null;

      const unreadCount = latestRows.filter((msg) => {
        if (msg.conversation_id !== row.id) {
          return false;
        }
        if (msg.sender_user_id === profile.id) {
          return false;
        }
        if (!myLastReadAt) {
          return true;
        }
        return new Date(msg.created_at).getTime() > new Date(myLastReadAt).getTime();
      }).length;

      let displayName = row.name || 'Group';
      let avatarUrl: string | null = null;
      let memberCount = convMembers.length;
      if (row.conversation_type === 'direct') {
        const peerFromMembers = convMembers.find((m) => m.id !== profile.id);
        const keyParts = (row.direct_key || '').split(':');
        const peerIdFromKey = keyParts.find((id) => id && id !== profile.id) || '';
        const peerId = peerFromMembers?.id || peerIdFromKey;
        displayName = peerFromMembers?.name || memberNameById[peerId] || 'User';
        avatarUrl = peerFromMembers?.avatarUrl || memberAvatarById[peerId] || null;
        memberCount = convMembers.length > 0 ? convMembers.length : 2;
      }

      return {
        id: row.id,
        type: row.conversation_type,
        name: displayName,
        memberCount,
        members: convMembers,
        avatarUrl,
        lastMessage: latest?.body || 'No message yet',
        lastAt: latest?.createdAt || row.last_message_at,
        unreadCount,
      };
    });

    mapped.sort((a, b) => (new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()));
    setConversations(mapped);
    setActiveConvo((prev) => {
      if (prev && mapped.some((item) => item.id === prev)) {
        return prev;
      }
      if (!autoSelectEnabled) {
        return '';
      }
      return mapped[0]?.id || '';
    });
  }, [autoSelectEnabled, memberAvatarById, memberNameById, profile, supabase, workspace]);

  const fetchMessages = useCallback(async () => {
    if (!activeConvo) {
      setMessages([]);
      return;
    }
    const { data } = await supabase
      .from('workspace_messages')
      .select('id, body, sender_user_id, created_at, users(full_name, avatar_url)')
      .eq('conversation_id', activeConvo)
      .order('created_at', { ascending: true });

    const mapped: MessageItem[] = ((data || []) as MessageRow[]).map((row) => ({
      id: row.id,
      body: row.body || '',
      senderId: row.sender_user_id,
      senderName: row.users?.full_name || memberNameById[row.sender_user_id] || 'User',
      senderAvatar: row.users?.avatar_url || memberAvatarById[row.sender_user_id] || null,
      createdAt: row.created_at,
    }));
    setMessages(mapped);
  }, [activeConvo, memberAvatarById, memberNameById, supabase]);

  const fetchActionsAndFiles = useCallback(async () => {
    if (!workspace?.id) {
      return;
    }

    const convoId = activeConvo || null;
    const conversationFilter = convoId ? `conversation_id.eq.${convoId},conversation_id.is.null` : 'conversation_id.is.null';

    const [{ data: notesData }, { data: tasksData }, { data: attachmentsData }] = await Promise.all([
      supabase
        .from('workspace_notes')
        .select('id, title, content')
        .eq('workspace_id', workspace.id)
        .or(conversationFilter)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabase
        .from('workspace_tasks')
        .select('id, title, task_status')
        .eq('workspace_id', workspace.id)
        .or(conversationFilter)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabase
        .from('workspace_attachments')
        .select('id, file_name, media_kind, created_at, storage_path')
        .eq('workspace_id', workspace.id)
        .or(conversationFilter)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    setNotes(((notesData || []) as NoteRow[]).map((row) => ({ id: row.id, title: row.title, content: row.content })));
    setTasks(((tasksData || []) as TaskRow[]).map((row) => ({ id: row.id, title: row.title, taskStatus: row.task_status })));
    setAttachments(((attachmentsData || []) as AttachmentRow[]).map((row) => ({ id: row.id, fileName: row.file_name, mediaKind: row.media_kind, createdAt: row.created_at, storagePath: row.storage_path })));
  }, [activeConvo, supabase, workspace]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchConversations();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchConversations]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMessages();
      void fetchActionsAndFiles();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchActionsAndFiles, fetchMessages]);

  const markConversationRead = useCallback(async () => {
    if (!activeConvo) {
      return;
    }
    await supabase.rpc('mark_conversation_read', { p_conversation_id: activeConvo });
  }, [activeConvo, supabase]);

  useEffect(() => {
    if (!activeConvo) {
      return;
    }
    const timer = window.setTimeout(() => {
      void markConversationRead();
      void fetchConversations();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeConvo, fetchConversations, markConversationRead, messages.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAutoSelectEnabled(false);
        setActiveConvo('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!workspace?.id) {
      return;
    }
    const channel = supabase
      .channel(`workspace-chat-${workspace.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_messages', filter: `workspace_id=eq.${workspace.id}` }, () => {
        void fetchConversations();
        void fetchMessages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_conversation_reads' }, () => {
        void fetchConversations();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchConversations, fetchMessages, supabase, workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) {
      return;
    }
    const interval = window.setInterval(() => {
      void fetchConversations();
      void fetchMessages();
    }, 2500);
    return () => window.clearInterval(interval);
  }, [fetchConversations, fetchMessages, workspace?.id]);

  const convo = conversations.find((c) => c.id === activeConvo);
  const filtered = conversations.filter((c) => (chatFilter === 'all' || (chatFilter === 'personal' && c.type === 'direct') || (chatFilter === 'groups' && c.type === 'group')) && c.name.toLowerCase().includes(search.toLowerCase()));

  const availableMembers = members.filter((m) => m.userId !== profile?.id);
  const groupInviteCandidates = convo?.type === 'group'
    ? availableMembers.filter((member) => !convo.members.some((convMember) => convMember.id === member.userId))
    : [];

  const getReadReceipt = (msg: MessageItem) => {
    if (!convo || msg.senderId !== profile?.id) {
      return '';
    }
    const reads = conversationReads[convo.id] || {};
    const seenBy = convo.members.filter((member) => {
      if (member.id === profile.id) {
        return false;
      }
      const readAt = reads[member.id];
      if (!readAt) {
        return false;
      }
      return new Date(readAt).getTime() >= new Date(msg.createdAt).getTime();
    });
    if (seenBy.length === 0) {
      return '';
    }
    if (convo.type === 'direct') {
      return 'Seen';
    }
    return `Seen by ${seenBy.length}`;
  };

  const sendMessage = useCallback(async () => {
    if (!activeConvo || !message.trim() || !profile?.id) {
      return;
    }
    await supabase.from('workspace_messages').insert({
      conversation_id: activeConvo,
      sender_user_id: profile.id,
      body: message.trim(),
      message_type: 'text',
    });
    setMessage('');
    await fetchMessages();
    await fetchConversations();
  }, [activeConvo, fetchConversations, fetchMessages, message, profile, supabase]);

  const createDirectConversation = useCallback(async (peerId: string) => {
    if (!workspace?.id || !peerId) {
      return;
    }
    await supabase.rpc('create_workspace_conversation', {
      p_workspace_id: workspace.id,
      p_conversation_type: 'direct',
      p_name: null,
      p_peer_user_id: peerId,
      p_member_ids: [],
    });
    setAutoSelectEnabled(true);
    setSidebarMode('list');
    await fetchConversations();
  }, [fetchConversations, supabase, workspace]);

  const createGroupConversation = useCallback(async () => {
    if (!workspace?.id || groupName.trim().length < 2) {
      return;
    }
    await supabase.rpc('create_workspace_conversation', {
      p_workspace_id: workspace.id,
      p_conversation_type: 'group',
      p_name: groupName.trim(),
      p_peer_user_id: null,
      p_member_ids: groupMemberIds,
    });
    setAutoSelectEnabled(true);
    setGroupName('');
    setGroupMemberIds([]);
    setSidebarMode('list');
    await fetchConversations();
  }, [fetchConversations, groupMemberIds, groupName, supabase, workspace]);

  const inviteToGroup = useCallback(async () => {
    if (!inviteUserId || !activeConvo || !profile?.id) {
      return;
    }
    await supabase.from('workspace_conversation_members').insert({
      conversation_id: activeConvo,
      user_id: inviteUserId,
      added_by_user_id: profile.id,
      member_role: 'member',
    });
    setInviteUserId('');
    await fetchConversations();
  }, [activeConvo, fetchConversations, inviteUserId, profile, supabase]);

  const createTask = useCallback(async () => {
    if (!workspace?.id || !profile?.id || !newTask.trim()) {
      return;
    }
    await supabase.from('workspace_tasks').insert({
      workspace_id: workspace.id,
      conversation_id: activeConvo || null,
      created_by_user_id: profile.id,
      title: newTask.trim(),
      task_status: 'open',
    });
    setNewTask('');
    await fetchActionsAndFiles();
  }, [activeConvo, fetchActionsAndFiles, newTask, profile, supabase, workspace]);

  const toggleTask = useCallback(async (task: TaskItem) => {
    const nextStatus = task.taskStatus === 'done' ? 'open' : 'done';
    await supabase
      .from('workspace_tasks')
      .update({
        task_status: nextStatus,
        completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
        completed_by_user_id: nextStatus === 'done' ? profile?.id || null : null,
      })
      .eq('id', task.id);
    await fetchActionsAndFiles();
  }, [fetchActionsAndFiles, profile, supabase]);

  const createNote = useCallback(async () => {
    if (!workspace?.id || !profile?.id || !newNote.trim()) {
      return;
    }
    await supabase.from('workspace_notes').insert({
      workspace_id: workspace.id,
      conversation_id: activeConvo || null,
      created_by_user_id: profile.id,
      title: newNote.trim().slice(0, 40),
      content: newNote.trim(),
    });
    setNewNote('');
    await fetchActionsAndFiles();
  }, [activeConvo, fetchActionsAndFiles, newNote, profile, supabase, workspace]);

  const uploadFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workspace?.id || !profile?.id || !activeConvo) {
      return;
    }
    setUploadLoading(true);
    const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
    const storagePath = `${workspace.id}/chat/${activeConvo}/${Date.now()}-${safeName}`;
    await supabase.storage.from('workspace-media').upload(storagePath, file, { upsert: false });
    await supabase.from('workspace_attachments').insert({
      workspace_id: workspace.id,
      conversation_id: activeConvo,
      uploaded_by_user_id: profile.id,
      storage_bucket: 'workspace-media',
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      media_kind: file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
            ? 'audio'
            : 'document',
    });
    setUploadLoading(false);
    event.target.value = '';
    await fetchActionsAndFiles();
  }, [activeConvo, fetchActionsAndFiles, profile, supabase, workspace]);

  return (
    <DashboardLayout page="Team Chat">
      <div className="flex gap-0 h-[calc(100vh-88px)] -m-6 overflow-hidden rounded-2xl border border-gray-100 bg-white">

        {/* ── Conversation list ── */}
        <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-black">Chats</h3>
              <button
                onClick={() => setSidebarMode((prev) => (prev === 'list' ? 'compose' : 'list'))}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
                aria-label="Toggle compose panel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3h7v7" />
                  <path d="M21 3 10 14" />
                  <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
                </svg>
              </button>
            </div>
            {sidebarMode === 'list' ? (
              <>
                <div className="relative mb-3">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-xl outline-none placeholder-gray-400" />
                </div>
                <div className="flex gap-1">
                  {['all', 'personal', 'groups'].map(f => (
                    <button key={f} onClick={() => setChatFilter(f)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all
                        ${chatFilter === f ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mb-1 grid grid-cols-1 gap-2">
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
                <select
                  multiple
                  value={groupMemberIds}
                  onChange={(e) => setGroupMemberIds(Array.from(e.target.selectedOptions).map((opt) => opt.value))}
                  className="h-24 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                >
                  {availableMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>{member.fullName}</option>
                  ))}
                </select>
                <button onClick={createGroupConversation} className="rounded-lg bg-blue-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700">
                  Create Group
                </button>
                <p className="mt-1 text-[11px] font-semibold text-gray-500">Start direct chat</p>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200">
                  {availableMembers.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => { void createDirectConversation(member.userId); }}
                      className="flex w-full items-center gap-2 border-b border-gray-100 px-2 py-1.5 text-left text-xs last:border-b-0 hover:bg-gray-50"
                    >
                      <Avatar initials={getInitials(member.fullName)} size="sm" />
                      <span className="truncate">{member.fullName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.id} onClick={() => { setAutoSelectEnabled(true); setActiveConvo(c.id); }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50
                  ${activeConvo === c.id ? 'bg-gray-50' : ''}`}
              >
                {c.type === 'group'
                  ? <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  </div>
                  : <Avatar initials={getInitials(c.name)} size="md" src={c.avatarUrl || undefined} />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-black truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400 shrink-0 ml-1">{formatTime(c.lastAt)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
                    {c.unreadCount > 0 && (
                      <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat messages ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {convo ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                {convo.type === 'group' ? (
                  <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  </div>
                ) : (
                  <Avatar initials={getInitials(convo.name || 'User')} size="md" src={convo.avatarUrl || undefined} />
                )}
                <div>
                  <p className="text-sm font-bold text-black">{convo.name}</p>
                  {convo.type === 'group' && (
                    <p className="text-xs text-gray-400">{convo.memberCount || 0} members</p>
                  )}
                </div>
                {convo.type === 'group' && (
                  <div className="ml-auto flex items-center gap-2">
                    <select value={inviteUserId} onChange={(e) => setInviteUserId(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
                      <option value="">Invite member...</option>
                      {groupInviteCandidates.map((member) => (
                        <option key={member.userId} value={member.userId}>{member.fullName}</option>
                      ))}
                    </select>
                    <button onClick={() => { void inviteToGroup(); }} className="rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                      Invite
                    </button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                {messages.map(m => (
                  <div key={m.id} className={`flex items-start gap-3 ${m.senderId === profile?.id ? 'flex-row-reverse' : ''}`}>
                    <Avatar initials={getInitials(m.senderName)} size="sm" src={m.senderAvatar || undefined} />
                    <div className={`max-w-xs ${m.senderId === profile?.id ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {m.senderId !== profile?.id && <p className="text-xs font-semibold text-gray-600">{m.senderName}</p>}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${m.senderId === profile?.id ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-black rounded-tl-sm'}`}>
                        {m.body}
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {formatTime(m.createdAt)} {getReadReceipt(m)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-3">
                <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-black transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && message.trim()) { void sendMessage(); } }}
                  placeholder="Type a message"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                />
                <button className="text-gray-400 hover:text-black transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                </button>
                <button
                  onClick={() => { void sendMessage(); }}
                  className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center border-b border-gray-100">
              <div className="text-center">
                <p className="text-base font-semibold text-gray-900">No chat selected</p>
                <p className="mt-1 text-sm text-gray-500">Select a conversation from the left to start messaging.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="w-76 border-l border-gray-100 flex flex-col shrink-0 bg-white">
          <div className="px-4 pt-3.5 pb-3">
            <RightPanelTabs active={rightTab} onChange={setRightTab} />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {rightTab === 'actions' && (
              <ActionsPanel
                tasks={tasks}
                notes={notes}
                newTask={newTask}
                newNote={newNote}
                onTaskChange={setNewTask}
                onNoteChange={setNewNote}
                onCreateTask={() => void createTask()}
                onCreateNote={() => void createNote()}
                onToggleTask={(task) => void toggleTask(task)}
              />
            )}
            {rightTab === 'customers' && <CustomersPanel />}
            {rightTab === 'files' && <FilesPanel files={attachments} onUpload={(event) => void uploadFile(event)} uploadLoading={uploadLoading} />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
