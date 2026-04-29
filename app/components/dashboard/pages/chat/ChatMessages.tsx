'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Avatar from '../../ui/Avatar';
import EmojiPicker, { EmojiStyle, Emoji } from 'emoji-picker-react';
import { getInitials, type WorkspaceMember } from '../../context/DashboardContext';
import { ConversationItem, MessageItem, formatTime } from './chat-types';
import ContentEditable from 'react-contenteditable';
import { renderToStaticMarkup } from 'react-dom/server';

interface ChatMessagesProps {
  convo: ConversationItem | undefined;
  messages: MessageItem[];
  currentUserId: string | undefined;
  workspaceMembers: WorkspaceMember[];

  // Message input & Replies
  message: string;
  onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onSendMessage: () => void;
  replyingTo: MessageItem | null;
  onReply: (m: MessageItem) => void;
  onCancelReply: () => void;

  // Mentions
  mentionSearch: string;
  showMentions: boolean;
  onSelectMention: (member: WorkspaceMember | 'all') => void;

  // Read receipts
  getReadReceipt: (msg: MessageItem) => string;

  // Group invite
  inviteUserId: string;
  onInviteUserChange: (userId: string) => void;
  onInvite: () => void;
  groupInviteCandidates: WorkspaceMember[];
}

// Helper to render text with mentions highlighted and emojis as Apple style images
function RenderMessageBody({ text }: { text: string }) {
  // Regex for emojis
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

  // First split by mentions
  const mentionParts = text.split(/(@\S+)/);

  return (
    <>
      {mentionParts.map((part, i) => {
        if (part.startsWith('@')) {
          return <span key={i} className="font-bold text-blue-300 contrast-125">{part}</span>;
        }

        // Then split each non-mention part by emojis
        const emojiParts = part.split(emojiRegex);
        return emojiParts.map((subPart, j) => {
          if (emojiRegex.test(subPart)) {
            return (
              <span key={`${i}-${j}`} className="inline-block mx-0.5 align-middle leading-none">
                <Emoji unified={unicodeToUnified(subPart)} size={18} emojiStyle={EmojiStyle.APPLE} />
              </span>
            );
          }
          return <span key={`${i}-${j}`}>{subPart}</span>;
        });
      })}
    </>
  );
}

// Helper to convert native emoji to unified hex code for emoji-picker-react component
function unicodeToUnified(emoji: string) {
  const codePoints = Array.from(emoji).map(char => char.codePointAt(0)!.toString(16));
  return codePoints.join('-');
}

// Helper to convert plain text to HTML for ContentEditable (with Apple Emojis)
function textToHtml(text: string) {
  if (!text) return "";
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  return text.split(emojiRegex).map(part => {
    if (emojiRegex.test(part)) {
      try {
        return renderToStaticMarkup(
          <span className="inline-block mx-0.5 align-middle leading-none" data-emoji={part}>
            <Emoji unified={unicodeToUnified(part)} size={18} emojiStyle={EmojiStyle.APPLE} />
          </span>
        );
      } catch (e) { return part; }
    }
    return part;
  }).join('');
}

// Helper to convert HTML back to plain text
function htmlToText(html: string) {
  if (typeof document === 'undefined') return html;
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  const emojiSpans = tmp.querySelectorAll('span[data-emoji]');
  emojiSpans.forEach(span => {
    const emojiStr = span.getAttribute('data-emoji');
    if (emojiStr) {
      span.parentNode?.replaceChild(document.createTextNode(emojiStr), span);
    }
  });
  return tmp.innerText || tmp.textContent || "";
}

export default function ChatMessages({
  convo,
  messages,
  currentUserId,
  workspaceMembers,
  message,
  onMessageChange,
  onSendMessage,
  replyingTo,
  onReply,
  onCancelReply,
  mentionSearch,
  showMentions,
  onSelectMention,
  getReadReceipt,
  inviteUserId,
  onInviteUserChange,
  onInvite,
  groupInviteCandidates,
}: ChatMessagesProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (convo?.id) {
      // Kasih sedikit timeout agar transisi render selesai
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [convo?.id]);

  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [convo?.id, lastMsgId]);

  if (!convo) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">No chat selected</p>
          <p className="mt-1 text-sm text-gray-500">Select a conversation to start messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
        {convo.type === 'group' ? (
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
        ) : (
          <Avatar initials={getInitials(convo.name || 'User')} src={convo.avatarUrl || undefined} />
        )}
        <div>
          <p className="text-sm font-bold text-black">{convo.name}</p>
          {convo.type === 'group' && (
            <p className="text-xs text-gray-400">{convo.memberCount || 0} members</p>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {messages.map(m => (
          <div
            key={m.id}
            className={`group relative flex items-start gap-3 ${m.senderId === currentUserId ? 'flex-row-reverse' : ''}`}
          >
            <Avatar initials={getInitials(m.senderName)} size="sm" src={m.senderAvatar || undefined} />
            <div className={`max-w-[70%] flex flex-col gap-1 ${m.senderId === currentUserId ? 'items-end' : 'items-start'}`}>
              {m.senderId !== currentUserId && (
                <p className="text-[11px] font-bold text-gray-700 ml-1">{m.senderName}</p>
              )}

              {/* Reply Snippet */}
              {m.replyTo && (
                <div className={`mb-[-8px] px-3 py-2 pb-4 rounded-t-xl bg-gray-50 border border-gray-100 text-[11px] opacity-70 truncate max-w-full ${m.senderId === currentUserId ? 'mr-1' : 'ml-1'}`}>
                  <p className="font-bold text-blue-600 mb-0.5">Replying to {m.replyTo.senderName}</p>
                  <p className="truncate italic text-gray-500">{m.replyTo.body}</p>
                </div>
              )}

              <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm relative ${m.senderId === currentUserId ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                <p className="leading-relaxed whitespace-pre-wrap break-words">
                  <RenderMessageBody text={m.body} />
                </p>
              </div>

              <div className="flex items-center gap-2 mt-0.5 px-1">
                <p className="text-[9px] font-medium text-gray-400 uppercase">
                  {formatTime(m.createdAt)}
                </p>
                {m.senderId === currentUserId && (
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">
                    {getReadReceipt(m)}
                  </span>
                )}
                <button
                  onClick={() => onReply(m)}
                  className="text-[10px] font-bold text-gray-400 hover:text-blue-600 uppercase transition-colors"
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="px-5 py-4 bg-white border-t border-gray-100">
        <style>
          {`
            .react-input-emoji--button {
              display: none !important;
            }
          `}
        </style>

        {/* Mention Suggestions */}
        {showMentions && convo.type === 'group' && (
          <div className="mb-3 rounded-2xl border border-gray-100 bg-white shadow-xl max-h-48 overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-50 bg-gray-50/50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tag Member</p>
            </div>
            <button
              onClick={() => onSelectMention('all')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">@</div>
              <span className="text-sm font-semibold text-gray-900">Tag Everyone (@all)</span>
            </button>
            {workspaceMembers
              .filter(m => m.userId !== currentUserId) // Hide self
              .filter(m => 
                m.fullName.toLowerCase().includes(mentionSearch.toLowerCase()) || 
                (m.arkaId || '').toLowerCase().includes(mentionSearch.toLowerCase())
              ).map(m => (
              <button
                key={m.userId}
                onClick={() => onSelectMention(m)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <Avatar initials={getInitials(m.fullName)} size="sm" src={m.avatarUrl || undefined} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.fullName}</p>
                  <p className="text-[10px] text-gray-400 truncate">@{m.arkaId || 'no-id'}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">Replying to {replyingTo.senderName}</p>
              <p className="text-xs text-blue-800 truncate pr-4 italic opacity-80">{replyingTo.body}</p>
            </div>
            <button onClick={onCancelReply} className="text-blue-400 hover:text-blue-700 p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all rounded-full hover:bg-blue-50 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          
          <div className="flex-1 relative">
            <div className="relative w-full min-h-[42px] bg-gray-50 border border-gray-100 rounded-2xl focus-within:border-blue-200 transition-all overflow-hidden">
              <ContentEditable
                innerRef={inputRef as any}
                html={textToHtml(message)}
                disabled={false}
                onChange={(e) => {
                  const text = htmlToText(e.target.value);
                  onMessageChange({ target: { value: text } } as any);
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (message.trim()) onSendMessage();
                  }
                }}
                className="w-full text-sm outline-none bg-transparent px-4 py-2.5 min-h-[42px] max-h-32 overflow-y-auto block text-gray-700"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              />
              {!message && (
                <div className="absolute inset-0 px-4 py-2.5 pointer-events-none text-sm text-gray-400">
                  Type a message...
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`transition-all p-2 rounded-full hover:bg-blue-50 ${showEmojiPicker ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-3 z-50">
                {/* Manual close overlay (clicks outside the picker will close it) */}
                <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                <div className="relative shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      // Note: We intentionally DO NOT close the picker here
                      onMessageChange({ target: { value: message + emojiData.emoji } } as any);
                    }}
                    emojiStyle={EmojiStyle.APPLE}
                    lazyLoadEmojis={true}
                    width={350}
                    height={400}
                    skinTonesDisabled
                    searchDisabled={false}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onSendMessage}
            disabled={!message.trim()}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 ${message.trim() ? 'bg-blue-600 hover:bg-blue-700 scale-100' : 'bg-gray-200 scale-95 opacity-50'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}