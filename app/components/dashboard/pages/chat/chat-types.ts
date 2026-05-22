// ─── Public domain types (used across components) ───────────────────────────

export type MemberLite = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isOnline?: boolean;
};

export type ConversationItem = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  memberCount: number;
  members: MemberLite[];
  avatarUrl: string | null;
  lastMessage: string;
  lastAt: string | null;
  unreadCount: number;
  mentionCount: number;
};

export type MessageItem = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: string;
  replyTo?: {
    id: string;
    body: string;
    senderName: string;
    messageType?: 'text' | 'attachment' | 'system';
    metadata?: any;
  } | null;
  mentions?: string[];
  mentionAll?: boolean;
  messageType?: 'text' | 'attachment' | 'system';
  metadata?: any;
};

export type TaskItem = {
  id: string;
  title: string;
  details?: string;
  taskStatus: 'open' | 'done' | 'archived';
  dueAt?: string | null;
  priority?: 'low' | 'normal' | 'high';
  assigneeUserId?: string | null;
  createdByUserId?: string;
};

export type NoteItem = {
  id: string;
  title: string;
  content: string;
};

export type AttachmentItem = {
  id: string;
  fileName: string;
  mediaKind: string;
  createdAt: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
};

export type RightTab = 'info' | 'actions' | 'customers' | 'files';

// ─── Internal Supabase row types (used only in ChatPage) ─────────────────────

export type ConversationRow = {
  id: string;
  conversation_type: 'direct' | 'group';
  name: string | null;
  direct_key: string | null;
  last_message_at: string | null;
  avatar_url: string | null;
};

export type MembershipWithConversation = {
  conversation_id: string;
  workspace_conversations: ConversationRow | null;
};

export type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
  users: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export type LatestMessageRow = {
  conversation_id: string;
  body: string | null;
  created_at: string;
  sender_user_id: string;
};

export type MessageRow = {
  id: string;
  body: string | null;
  sender_user_id: string;
  created_at: string;
  users: { full_name: string | null; avatar_url: string | null } | null;
  replied_to_message_id: string | null;
  mentions: string[] | null;
  mention_all: boolean | null;
  message_type: 'text' | 'attachment' | 'system';
  metadata: any;
};

export type NoteRow = { id: string; title: string; content: string };
export type TaskRow = { id: string; title: string; task_status: 'open' | 'done' | 'archived' };
export type AttachmentRow = { 
  id: string; 
  file_name: string; 
  media_kind: string; 
  created_at: string; 
  storage_path: string;
  file_size: number;
  mime_type: string;
};
export type ConversationReadRow = { conversation_id: string; user_id: string; last_read_at: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTime(ts: string | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}