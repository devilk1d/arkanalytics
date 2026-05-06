'use client';

import { ChangeEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useDashboardContext, type WorkspaceMember } from '../../context/DashboardContext';
import ChatMessages from './ChatMessages';
import ChatResizeDivider from './Chatresizedivider';
import ChatRightPanel from './ChatRightPanel';
import ChatSidebar from './Chatsidebar';
import {
  AttachmentItem,
  AttachmentRow,
  ConversationItem,
  ConversationMemberRow,
  ConversationReadRow,
  ConversationRow,
  LatestMessageRow,
  MembershipWithConversation,
  MessageItem,
  MessageRow,
  NoteItem,
  NoteRow,
  RightTab,
  TaskItem,
  TaskRow,
} from './chat-types';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredWidth(key: string, fallback: number, min: number, max: number) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isNaN(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function writeStoredWidth(key: string, value: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, String(value));
}

const WIDTH_KEYS = {
  left: 'chat_left_width',
  right: 'chat_right_width',
} as const;

const widthMemoryCache = {
  initialized: false,
  left: 288,
  right: 304,
};

export default function ChatPage() {
  const supabase = useMemo(() => createClient(), []);
  const { workspace, profile, members } = useDashboardContext();

  const shellRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const autoSelectEnabledRef = useRef(false);

  const LEFT_MIN = 64;
  const LEFT_COLLAPSE_THRESHOLD = 100;
  const LEFT_MAX = 520;
  const RIGHT_MIN = 260;
  const RIGHT_MAX = 560;
  const CENTER_MIN = 360;
  const LEFT_DEFAULT = 288;
  const RIGHT_DEFAULT = 304;

  const [leftWidth, setLeftWidth] = useState(() => (widthMemoryCache.initialized ? widthMemoryCache.left : LEFT_DEFAULT));
  const [rightWidth, setRightWidth] = useState(() => (widthMemoryCache.initialized ? widthMemoryCache.right : RIGHT_DEFAULT));
  const [panelReady, setPanelReady] = useState(false);
  const [chatHeight, setChatHeight] = useState(0);

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
  const [composeTab, setComposeTab] = useState<'direct' | 'group'>('direct');
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [inviteUserId, setInviteUserId] = useState('');
  const [conversationReads, setConversationReads] = useState<Record<string, Record<string, string>>>({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);

  const setAutoSelect = useCallback((val: boolean) => {
    autoSelectEnabledRef.current = val;
  }, []);

  useLayoutEffect(() => {
    const nextLeft = readStoredWidth(WIDTH_KEYS.left, widthMemoryCache.left || LEFT_DEFAULT, LEFT_MIN, LEFT_MAX);
    const nextRight = readStoredWidth(WIDTH_KEYS.right, widthMemoryCache.right || RIGHT_DEFAULT, RIGHT_MIN, RIGHT_MAX);
    widthMemoryCache.initialized = true;
    widthMemoryCache.left = nextLeft;
    widthMemoryCache.right = nextRight;
    setLeftWidth(nextLeft);
    setRightWidth(nextRight);
    setPanelReady(true);
  }, [LEFT_DEFAULT, LEFT_MAX, LEFT_MIN, RIGHT_DEFAULT, RIGHT_MAX, RIGHT_MIN]);

  useLayoutEffect(() => {
    const measure = () => {
      if (!anchorRef.current) return;
      const top = anchorRef.current.getBoundingClientRect().top;
      setChatHeight(window.innerHeight - top);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    widthMemoryCache.initialized = true;
    widthMemoryCache.left = leftWidth;
    writeStoredWidth(WIDTH_KEYS.left, leftWidth);
  }, [leftWidth]);

  useEffect(() => {
    widthMemoryCache.initialized = true;
    widthMemoryCache.right = rightWidth;
    writeStoredWidth(WIDTH_KEYS.right, rightWidth);
  }, [rightWidth]);

  const memberNameById = useMemo(
    () => members.reduce<Record<string, string>>((acc, member) => {
      acc[member.userId] = member.fullName;
      return acc;
    }, {}),
    [members],
  );

  const memberAvatarById = useMemo(
    () => members.reduce<Record<string, string | null>>((acc, member) => {
      acc[member.userId] = member.avatarUrl;
      return acc;
    }, {}),
    [members],
  );

  const fetchConversations = useCallback(async () => {
    if (!workspace?.id || !profile?.id) return;

    // Fetch conversations I am in, including ALL members of those conversations
    // We nestedly join workspace_conversations and then its members
    const { data: rawMemberships, error: convError } = await supabase
      .from('workspace_conversation_members')
      .select(`
        conversation_id,
        workspace_conversations (
          id,
          conversation_type,
          name,
          direct_key,
          last_message_at,
          avatar_url,
          workspace_conversation_members (
            user_id
          )
        )
      `)
      .eq('user_id', profile.id);

    if (convError) {
      console.error('Fetch conversations error:', convError);
      return;
    }

    const membershipRows = (rawMemberships || []) as any[];
    const convRows = membershipRows
      .map(m => m.workspace_conversations)
      .filter(c => !!c);

    if (convRows.length === 0) {
      setConversations([]);
      setActiveConvo('');
      return;
    }

    const conversationIds = convRows.map(c => c.id);

    // Still need latest messages for unread count and snippets
    const { data: latestMessages, error: msgsError } = await supabase
      .from('workspace_messages')
      .select('conversation_id, body, created_at, sender_user_id, mentions, mention_all')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (msgsError) console.error('Fetch messages error:', msgsError);

    const latestRows = (latestMessages || []) as LatestMessageRow[];
    const latestByConversation = new Map<string, { body: string; createdAt: string; senderUserId: string }>();
    latestRows.forEach((row) => {
      if (!latestByConversation.has(row.conversation_id)) {
        latestByConversation.set(row.conversation_id, {
          body: row.body || '',
          createdAt: row.created_at,
          senderUserId: row.sender_user_id,
        });
      }
    });

    const { data: readRows } = await supabase
      .from('workspace_conversation_reads')
      .select('conversation_id, user_id, last_read_at')
      .in('conversation_id', conversationIds);

    const readMap: Record<string, Record<string, string>> = {};
    ((readRows || []) as ConversationReadRow[]).forEach((row) => {
      if (!readMap[row.conversation_id]) readMap[row.conversation_id] = {};
      readMap[row.conversation_id][row.user_id] = row.last_read_at;
    });
    setConversationReads(readMap);

    const mapped: ConversationItem[] = convRows.map((row: any) => {
      const rawMembers = row.workspace_conversation_members || [];
      const convMembers = (rawMembers as any[]).map(m => {
        const mInfo = members.find(wm => wm.userId === m.user_id);
        return {
          id: m.user_id,
          name: mInfo?.fullName || memberNameById[m.user_id] || 'User',
          avatarUrl: mInfo?.avatarUrl || memberAvatarById[m.user_id] || null,
        };
      });
      const latest = latestByConversation.get(row.id);
      const myLastReadAt = readMap[row.id]?.[profile.id] || null;
      const msgsInConvo = latestRows.filter((msg) => msg.conversation_id === row.id);

      let unreadCount = 0;
      if (msgsInConvo.length > 0) {
        const otherMessages = msgsInConvo.filter((msg) => msg.sender_user_id !== profile.id);
        const lastReadTime = myLastReadAt ? new Date(myLastReadAt).getTime() : 0;
        unreadCount = otherMessages.filter((msg) => new Date(msg.created_at).getTime() > lastReadTime).length;
      }

      const mentionCount = msgsInConvo.filter((msg: any) => {
        if (msg.sender_user_id === profile.id) return false;
        const lastReadTime = myLastReadAt ? new Date(myLastReadAt).getTime() : 0;
        if (new Date(msg.created_at).getTime() <= lastReadTime) return false;
        return (msg.mentions || []).includes(profile.id) || !!msg.mention_all;
      }).length;

      let displayName = row.name || 'Group';
      let avatarUrl: string | null = null;
      // Use actual member count fetched from DB; fallback=2 for direct if join hasn't resolved yet
      let memberCount = convMembers.length > 0 ? convMembers.length : (row.conversation_type === 'direct' ? 2 : 0);

      if (row.conversation_type === 'direct') {
        const peerFromMembers = convMembers.find((m) => m.id !== profile.id);
        const keyParts = (row.direct_key || '').split(':');
        const peerIdFromKey = keyParts.find((id: string) => id && id !== profile.id) || '';
        const peerId = peerFromMembers?.id || peerIdFromKey;
        displayName = peerFromMembers?.name || memberNameById[peerId] || 'User';
        avatarUrl = peerFromMembers?.avatarUrl || memberAvatarById[peerId] || null;
      } else {
        avatarUrl = row.avatar_url || null;
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
        mentionCount,
      };
    });

    mapped.sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime());
    setConversations(mapped);

    setActiveConvo((prev) => {
      if (prev && mapped.some((item) => item.id === prev)) return prev;
      if (!autoSelectEnabledRef.current) return '';
      return mapped[0]?.id || '';
    });
  }, [memberAvatarById, memberNameById, profile, supabase, workspace]);

  const fetchMessages = useCallback(async () => {
    if (!activeConvo) {
      setMessages([]);
      return;
    }

    const { data } = await supabase
      .from('workspace_messages')
      .select(`
        id,
        body,
        created_at,
        sender_user_id,
        replied_to_message_id,
        mentions,
        mention_all,
        message_type,
        metadata,
        users (
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', activeConvo)
      .order('created_at', { ascending: true });

    const rows = (data || []) as any[];
    const mapped: MessageItem[] = rows.map((row) => {
      const replyToId = row.replied_to_message_id;
      let replyToData = null;
      if (replyToId) {
        const repliedMsg = rows.find(r => r.id === replyToId);
        if (repliedMsg) {
          replyToData = {
            id: repliedMsg.id,
            body: repliedMsg.body || '',
            senderName: repliedMsg.users?.full_name || 'User',
            messageType: repliedMsg.message_type,
            metadata: repliedMsg.metadata,
          };
        }
      }

      return {
        id: row.id,
        body: row.body || '',
        senderId: row.sender_user_id,
        senderName: row.users?.full_name || memberNameById[row.sender_user_id] || 'User',
        senderAvatar: row.users?.avatar_url || memberAvatarById[row.sender_user_id] || null,
        createdAt: row.created_at,
        replyTo: replyToData,
        mentions: row.mentions || [],
        mentionAll: !!row.mention_all,
        messageType: row.message_type,
        metadata: row.metadata,
      };
    });
    setMessages(mapped);
  }, [activeConvo, memberAvatarById, memberNameById, supabase]);

  const fetchActionsAndFiles = useCallback(async () => {
    if (!workspace?.id) return;

    const convoId = activeConvo || null;
    const conversationFilter = convoId
      ? `conversation_id.eq.${convoId},conversation_id.is.null`
      : 'conversation_id.is.null';

    const [{ data: notesData }, { data: tasksData }, { data: attachmentsData }] = await Promise.all([
      supabase.from('workspace_notes').select('id, title, content').eq('workspace_id', workspace.id).or(conversationFilter).order('updated_at', { ascending: false }).limit(20),
      supabase.from('workspace_tasks').select('id, title, details, task_status, due_at, priority, assignee_user_id, created_by_user_id').eq('workspace_id', workspace.id).or(conversationFilter).order('updated_at', { ascending: false }).limit(20),
      supabase.from('workspace_attachments').select('id, file_name, media_kind, created_at, storage_path, file_size, mime_type').eq('workspace_id', workspace.id).or(conversationFilter).order('created_at', { ascending: false }).limit(20),
    ]);

    setNotes(((notesData || []) as NoteRow[]).map((row) => ({ id: row.id, title: row.title, content: row.content })));
    setTasks(((tasksData || []) as any[]).map((row) => ({ 
      id: row.id, 
      title: row.title, 
      details: row.details,
      taskStatus: row.task_status,
      dueAt: row.due_at,
      priority: row.priority,
      assigneeUserId: row.assignee_user_id,
      createdByUserId: row.created_by_user_id
    })));
    setAttachments(((attachmentsData || []) as AttachmentRow[]).map((row) => {
      const { data: { publicUrl } } = supabase.storage
        .from('workspace-media')
        .getPublicUrl(row.storage_path);

      return { 
        id: row.id, 
        fileName: row.file_name, 
        mediaKind: row.media_kind, 
        createdAt: row.created_at, 
        storagePath: publicUrl, // Using full URL
        fileSize: row.file_size,
        mimeType: row.mime_type
      };
    }));
  }, [activeConvo, supabase, workspace]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchConversations(); }, 0);
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
    if (!activeConvo || !profile?.id) return;

    const { error } = await supabase.rpc('mark_conversation_read', { 
      p_conversation_id: activeConvo
    });

    if (error) {
      console.error('RPC Error details:', error);
    } else {
      console.log('Berhasil mark as read di DB');
      void fetchConversations();
    }
  }, [activeConvo, profile?.id, supabase, fetchConversations]);

  useEffect(() => {
    if (!activeConvo) return;
    const timer = window.setTimeout(() => {
      void markConversationRead();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activeConvo, markConversationRead]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAutoSelect(false);
        setActiveConvo('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setAutoSelect]);

  useEffect(() => {
    if (!workspace?.id) return;
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

    return () => { void supabase.removeChannel(channel); };
  }, [fetchConversations, fetchMessages, supabase, workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    const interval = window.setInterval(() => {
      void fetchConversations();
      void fetchMessages();
    }, 2500);
    return () => window.clearInterval(interval);
  }, [fetchConversations, fetchMessages, workspace?.id]);

  const convo = conversations.find((c) => c.id === activeConvo);
  const filtered = conversations.filter((c) =>
    (chatFilter === 'all' || (chatFilter === 'personal' && c.type === 'direct') || (chatFilter === 'groups' && c.type === 'group'))
    && c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const availableMembers = members.filter((m) => m.userId !== profile?.id);
  const groupInviteCandidates = convo?.type === 'group'
    ? availableMembers.filter((member) => !convo.members.some((cm) => cm.id === member.userId))
    : [];

  const getReadReceipt = useCallback((msg: MessageItem) => {
    if (!convo || msg.senderId !== profile?.id) return '';
    const messageTime = new Date(msg.createdAt).getTime();
    const reads = conversationReads[convo.id] || {};
    const seenBy = convo.members.filter((member) => {
      if (member.id === profile.id) return false;
      const readAt = reads[member.id];
      if (!readAt) return false;
      // Add 1.5s tolerance to avoid precision drift between DB timestamps.
      return new Date(readAt).getTime() + 1500 >= messageTime;
    });
    if (seenBy.length === 0) return '';
    if (convo.type === 'direct') return 'Seen';
    return `Seen by ${seenBy.length}`;
  }, [conversationReads, convo, profile?.id]);

  const sendMessage = useCallback(async () => {
    if (!activeConvo || !message.trim() || !profile?.id) return;

    const mentionList: string[] = [];
    let mentionAll = false;

    // Basic mention parsing: find @arkaId in message
    // In a real app we'd use a more robust editor, but let's parse text for now.
    members.forEach(m => {
      const nameTag = `@${m.fullName}`;
      const idTag = m.arkaId ? `@${m.arkaId}` : null;
      if (message.includes(nameTag) || (idTag && message.includes(idTag))) {
        mentionList.push(m.userId);
      }
    });
    if (message.includes('@all')) mentionAll = true;

    await supabase.from('workspace_messages').insert({
      conversation_id: activeConvo,
      sender_user_id: profile.id,
      body: message.trim(),
      message_type: 'text',
      replied_to_message_id: replyingTo?.id || null,
      mentions: mentionList,
      mention_all: mentionAll,
      workspace_id: workspace?.id,
    });
    setMessage('');
    setReplyingTo(null);
    await fetchMessages();
    await fetchConversations();
  }, [activeConvo, fetchConversations, fetchMessages, message, profile, supabase, replyingTo, members, workspace?.id]);

  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);

    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1 && (lastAtPos === 0 || val[lastAtPos - 1] === ' ')) {
      const search = val.slice(lastAtPos + 1).split(' ')[0];
      setMentionSearch(search);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: WorkspaceMember | 'all') => {
    const lastAtPos = message.lastIndexOf('@');
    const before = message.slice(0, lastAtPos);
    const after = message.slice(lastAtPos).split(' ')[0].length + lastAtPos;
    const rest = message.slice(after);
    
    const tag = member === 'all' ? 'all' : member.fullName;
    setMessage(`${before}@${tag} ${rest.startsWith(' ') ? rest.slice(1) : rest}`);
    setShowMentions(false);
  };

  const createDirectConversation = useCallback(async (peerId: string) => {
    if (!workspace?.id || !peerId) return;
    await supabase.rpc('create_workspace_conversation', {
      p_workspace_id: workspace.id,
      p_conversation_type: 'direct',
      p_name: null,
      p_peer_user_id: peerId,
      p_member_ids: [],
    });
    setAutoSelect(true);
    setSidebarMode('list');
    await fetchConversations();
  }, [fetchConversations, setAutoSelect, supabase, workspace]);

  const createGroupConversation = useCallback(async () => {
    if (!workspace?.id || groupName.trim().length < 2) return;
    await supabase.rpc('create_workspace_conversation', {
      p_workspace_id: workspace.id,
      p_conversation_type: 'group',
      p_name: groupName.trim(),
      p_peer_user_id: null,
      p_member_ids: groupMemberIds,
    });
    setAutoSelect(true);
    setGroupName('');
    setGroupMemberIds([]);
    setSidebarMode('list');
    await fetchConversations();
  }, [fetchConversations, groupMemberIds, groupName, setAutoSelect, supabase, workspace]);

  const inviteToGroup = useCallback(async () => {
    if (!inviteUserId || !activeConvo || !profile?.id) return;
    await supabase.from('workspace_conversation_members').insert({
      conversation_id: activeConvo,
      user_id: inviteUserId,
      added_by_user_id: profile.id,
      member_role: 'member',
    });
    setInviteUserId('');
    await fetchConversations();
  }, [activeConvo, fetchConversations, inviteUserId, profile, supabase]);

  const inviteUserToGroup = useCallback(async (userId: string) => {
    if (!userId || !activeConvo || !profile?.id) return;
    await supabase.from('workspace_conversation_members').insert({
      conversation_id: activeConvo,
      user_id: userId,
      added_by_user_id: profile.id,
      member_role: 'member',
    });
    await fetchConversations();
  }, [activeConvo, fetchConversations, profile, supabase]);

  const createTask = useCallback(async (taskData: Partial<TaskItem>) => {
    if (!workspace?.id || !profile?.id || !taskData.title?.trim()) return;
    await supabase.from('workspace_tasks').insert({
      workspace_id: workspace.id,
      conversation_id: activeConvo || null,
      created_by_user_id: profile.id,
      title: taskData.title.trim(),
      details: taskData.details || '',
      due_at: taskData.dueAt || null,
      priority: taskData.priority || 'normal',
      assignee_user_id: taskData.assigneeUserId || null,
      task_status: 'open',
    });
    setNewTask('');
    await fetchActionsAndFiles();
  }, [activeConvo, fetchActionsAndFiles, profile, supabase, workspace]);

  const toggleTask = useCallback(async (task: TaskItem) => {
    const nextStatus = task.taskStatus === 'done' ? 'open' : 'done';
    await supabase.from('workspace_tasks').update({
      task_status: nextStatus,
      completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
      completed_by_user_id: nextStatus === 'done' ? profile?.id || null : null,
    }).eq('id', task.id);
    await fetchActionsAndFiles();
  }, [fetchActionsAndFiles, profile, supabase]);

  const createNote = useCallback(async () => {
    if (!workspace?.id || !profile?.id || !newNote.trim()) return;
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

  const updateNote = useCallback(async (id: string, title: string, content: string) => {
    if (!profile?.id) return;
    await supabase.from('workspace_notes').update({
      title: title.trim().slice(0, 40),
      content: content.trim()
    }).eq('id', id);
    await fetchActionsAndFiles();
  }, [fetchActionsAndFiles, profile, supabase]);

  const deleteNote = useCallback(async (id: string) => {
    if (!profile?.id) return;
    await supabase.from('workspace_notes').delete().eq('id', id);
    await fetchActionsAndFiles();
  }, [fetchActionsAndFiles, profile, supabase]);

  const handleFileUpload = useCallback(async (file: File, kind: 'image' | 'video' | 'document') => {
    if (!activeConvo || !workspace?.id || !profile?.id) return;

    setUploadLoading(true);
    const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
    const storagePath = `${workspace.id}/chat/${activeConvo}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('workspace-media')
      .upload(storagePath, file, { upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setUploadLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('workspace-media')
      .getPublicUrl(storagePath);

    const { data: attachment, error: attachError } = await supabase.from('workspace_attachments').insert({
      workspace_id: workspace.id,
      conversation_id: activeConvo,
      uploaded_by_user_id: profile.id,
      storage_bucket: 'workspace-media',
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      media_kind: kind,
    }).select().single();

    if (!attachError && attachment) {
      await supabase.from('workspace_messages').insert({
        workspace_id: workspace.id,
        conversation_id: activeConvo,
        sender_user_id: profile.id,
        message_type: 'attachment',
        body: `Shared a ${kind}: ${file.name}`,
        metadata: {
          attachment_id: attachment.id,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          media_kind: kind
        }
      });
    }

    setUploadLoading(false);
    void fetchMessages();
    void fetchActionsAndFiles();
  }, [activeConvo, fetchActionsAndFiles, fetchMessages, profile, supabase, workspace]);

  const handleSelectConversation = useCallback((id: string) => {
    setAutoSelect(true);
    setActiveConvo(id);
  }, [setAutoSelect]);

  const updateGroupAvatar = useCallback(async (file: File) => {
    if (!activeConvo || !workspace?.id) return;
    
    const fileExt = file.name.split('.').pop();
    const filePath = `${workspace.id}/conversations/${activeConvo}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('workspace-media')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading group avatar:', uploadError);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('workspace-media')
      .getPublicUrl(filePath);

    const { error } = await supabase
      .from('workspace_conversations')
      .update({ avatar_url: publicUrl })
      .eq('id', activeConvo);
    
    if (!error) {
      void fetchConversations();
    }
  }, [activeConvo, fetchConversations, supabase, workspace?.id]);

  const handleGroupMemberToggle = useCallback((userId: string, checked: boolean) => {
    setGroupMemberIds((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  }, []);

  const handleLeftDrag = useCallback((dx: number) => {
    const shellWidth = shellRef.current?.getBoundingClientRect().width ?? 0;
    const maxByLayout = shellWidth > 0 ? shellWidth - rightWidth - CENTER_MIN : LEFT_MAX;
    setLeftWidth((prev) => {
      const next = clamp(prev + dx, LEFT_MIN, Math.min(LEFT_MAX, Math.max(LEFT_MIN, maxByLayout)));
      widthMemoryCache.initialized = true;
      widthMemoryCache.left = next;
      writeStoredWidth(WIDTH_KEYS.left, next);
      return next;
    });
  }, [LEFT_MAX, LEFT_MIN, CENTER_MIN, rightWidth]);

  const handleRightDrag = useCallback((dx: number) => {
    const shellWidth = shellRef.current?.getBoundingClientRect().width ?? 0;
    const maxByLayout = shellWidth > 0 ? shellWidth - leftWidth - CENTER_MIN : RIGHT_MAX;
    setRightWidth((prev) => {
      const next = clamp(prev - dx, RIGHT_MIN, Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, maxByLayout)));
      widthMemoryCache.initialized = true;
      widthMemoryCache.right = next;
      writeStoredWidth(WIDTH_KEYS.right, next);
      return next;
    });
  }, [RIGHT_MAX, RIGHT_MIN, CENTER_MIN, leftWidth]);

  return (
    <DashboardLayout page="Team Chat">
      <div ref={anchorRef} style={{ margin: '-1.5rem' }}>
        <div
          ref={shellRef}
          className="flex min-h-0 gap-0 overflow-hidden rounded-2xl border border-gray-100 bg-white"
          style={{ height: chatHeight || '100vh', visibility: panelReady ? 'visible' : 'hidden' }}
        >
        <aside className="flex shrink-0 flex-col overflow-hidden border-r border-gray-100" style={{ width: leftWidth }}>
          <ChatSidebar
            conversations={conversations}
            filtered={filtered}
            activeConvo={activeConvo}
            onSelectConvo={handleSelectConversation}
            search={search}
            onSearchChange={setSearch}
            chatFilter={chatFilter}
            onFilterChange={setChatFilter}
            sidebarMode={sidebarMode}
            onToggleSidebarMode={() => setSidebarMode((prev) => (prev === 'list' ? 'compose' : 'list'))}
            composeTab={composeTab}
            onComposeTabChange={setComposeTab}
            groupName={groupName}
            onGroupNameChange={setGroupName}
            groupMemberIds={groupMemberIds}
            onGroupMemberToggle={handleGroupMemberToggle}
            onCreateGroup={() => { void createGroupConversation(); }}
            onCreateDirect={(peerId) => { void createDirectConversation(peerId); }}
            availableMembers={availableMembers}
            collapsed={leftWidth <= LEFT_COLLAPSE_THRESHOLD}
          />
        </aside>

        <ChatResizeDivider onDrag={handleLeftDrag} />

        <section className="flex min-w-0 flex-1 flex-col">
          <ChatMessages
            convo={convo}
            messages={messages}
            currentUserId={profile?.id}
            workspaceMembers={members}
            message={message}
            onMessageChange={handleMessageChange}
            onSendMessage={() => { void sendMessage(); }}
            replyingTo={replyingTo}
            onReply={setReplyingTo}
            onCancelReply={() => setReplyingTo(null)}
            mentionSearch={mentionSearch}
            showMentions={showMentions}
            onSelectMention={insertMention}
            getReadReceipt={getReadReceipt}
            inviteUserId={inviteUserId}
            onInviteUserChange={setInviteUserId}
            onInvite={() => { void inviteToGroup(); }}
            groupInviteCandidates={groupInviteCandidates}
            onFileUpload={handleFileUpload}
          />
        </section>

        <ChatResizeDivider onDrag={handleRightDrag} />

        <aside className="flex shrink-0 flex-col overflow-hidden border-l border-gray-100 bg-white" style={{ width: rightWidth }}>
          <ChatRightPanel
            currentUserId={profile?.id}
            activeTab={rightTab}
            onTabChange={setRightTab}
            convo={convo}
            inviteUserId={inviteUserId}
            onInviteUserChange={setInviteUserId}
            onInvite={() => { void inviteToGroup(); }}
            onInviteUser={(userId: string) => { void inviteUserToGroup(userId); }}
            groupInviteCandidates={groupInviteCandidates}
            workspaceMembers={members}
            onAvatarChange={updateGroupAvatar}
            tasks={tasks}
            notes={notes}
            newTask={newTask}
            newNote={newNote}
            onTaskChange={setNewTask}
            onNoteChange={setNewNote}
            onCreateTask={createTask}
            onCreateNote={() => { void createNote(); }}
            onUpdateNote={(id, title, content) => { void updateNote(id, title, content); }}
            onDeleteNote={(id) => { void deleteNote(id); }}
            onToggleTask={(task) => { void toggleTask(task); }}
            files={attachments}
            onUpload={(e: any) => {
              const file = e.target.files?.[0];
              if (file) {
                const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
                void handleFileUpload(file, type);
              }
            }}
            uploadLoading={uploadLoading}
          />
        </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}