'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Avatar from '../../ui/Avatar';
import EmojiPicker, { EmojiStyle, Emoji } from 'emoji-picker-react';
import { getInitials, type WorkspaceMember } from '../../context/DashboardContext';
import { ConversationItem, MessageItem, formatTime } from './chat-types';
import ContentEditable from 'react-contenteditable';
import { renderToStaticMarkup } from 'react-dom/server';
import MediaLightbox from '../../../ui/MediaLightbox';

interface ChatMessagesProps {
  convo: ConversationItem | undefined;
  messages: MessageItem[];
  currentUserId: string | undefined;
  workspaceMembers: WorkspaceMember[];
  message: string;
  onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onSendMessage: () => void;
  replyingTo: MessageItem | null;
  onReply: (m: MessageItem) => void;
  onCancelReply: () => void;
  mentionSearch: string;
  showMentions: boolean;
  onSelectMention: (member: WorkspaceMember | 'all') => void;
  getReadReceipt: (msg: MessageItem) => string;
  inviteUserId: string;
  onInviteUserChange: (userId: string) => void;
  onInvite: () => void;
  groupInviteCandidates: WorkspaceMember[];
  onFileUpload: (file: File, kind: 'image' | 'video' | 'document') => void;
  onDeleteMessage?: (id: string) => void;
  showRightPanel?: boolean;
  onToggleRightPanel?: () => void;
}

function RenderCustomerProfile({ data }: { data: string; isMine: boolean }) {
  let profile: any = null;
  try {
    profile = JSON.parse(data.replace('[CUSTOMER_PROFILE]:', ''));
  } catch (e) {
    return <p className="text-xs">{data}</p>;
  }

  const customers = profile.customers || [];
  if (customers.length === 0) return null;

  return (
    <div className="min-w-[260px] max-w-[300px] rounded-2xl overflow-hidden border border-[var(--b2)] bg-[var(--surf)] shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--bg1)] border-b border-[var(--b)]">
        <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t3)]">
          {customers.length > 1 ? `Shared ${customers.length} Customers` : 'Shared Customer Profile'}
        </p>
      </div>

      {/* Customer rows */}
      {customers.map((c: any, i: number) => (
        <div key={c.id} className="px-4 py-3">
          {i > 0 && <div className="h-px bg-[var(--b)] -mx-4 mb-3" />}

          {/* ID + Score */}
          <div className="flex items-start justify-between mb-2.5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--t4)] mb-0.5">Customer</p>
              <p className="text-sm font-black font-mono text-[var(--t)]">{c.id}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--t4)] mb-0.5">Churn Score</p>
              <p className={`text-2xl font-black font-mono leading-none ${Number(c.score) >= 70 ? 'text-red-500' : Number(c.score) >= 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {c.score}
              </p>
            </div>
          </div>

          {/* Plan + Risk badges */}
          <div className="flex items-center gap-2 mb-3">
            {c.plan && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize bg-[var(--bg2)] text-[var(--t2)] border border-[var(--b)]">
                {c.plan}
              </span>
            )}
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
              c.risk === 'High'
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : c.risk === 'Medium'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              {c.risk} Risk
            </span>
          </div>

          {/* Analyze button */}
          <button
            onClick={() => {
              window.location.href = `/dashboard/analytics?dataset_id=${profile.datasetId || ''}&analyze_id=${c.id}`;
            }}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-[11px] font-black tracking-wide transition-all shadow-sm cursor-pointer"
          >
            Analyze {customers.length > 1 ? c.id : ''}
          </button>
        </div>
      ))}
    </div>
  );
}

function RenderMessageBody({ text, isMine }: { text: string; isMine: boolean }) {
  if (text.startsWith('[CUSTOMER_PROFILE]:')) {
    return <RenderCustomerProfile data={text} isMine={isMine} />;
  }

  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  const mentionParts = text.split(/(@\S+)/);

  return (
    <>
      {mentionParts.map((part, i) => {
        if (part.startsWith('@')) {
          return <span key={i} className={`font-bold ${isMine ? 'text-yellow-200' : 'text-[var(--accent)]'}`}>{part}</span>;
        }

        const emojiParts = part.split(emojiRegex);
        return emojiParts.map((subPart, j) => {
          if (emojiRegex.test(subPart)) {
            return (
              <span key={`${i}-${j}`} className="inline-block mx-0.5 align-middle leading-none">
                <Emoji unified={unicodeToUnified(subPart)} size={16} emojiStyle={EmojiStyle.APPLE} />
              </span>
            );
          }
          
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const textParts = subPart.split(urlRegex);
          return textParts.map((textPart, k) => {
            if (urlRegex.test(textPart)) {
              return (
                <a 
                  key={`${i}-${j}-${k}`} 
                  href={textPart} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`underline transition-colors break-all ${isMine ? 'text-white hover:text-blue-100' : 'text-[var(--accent)] hover:underline'}`}
                >
                  {textPart}
                </a>
              );
            }
            return <span key={`${i}-${j}-${k}`}>{textPart}</span>;
          });
        });
      })}
    </>
  );
}

function getRelativeDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = dNow.getTime() - dDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function unicodeToUnified(emoji: string) {
  const codePoints = Array.from(emoji).map(char => char.codePointAt(0)!.toString(16));
  return codePoints.join('-');
}

function textToHtml(text: string) {
  if (!text) return "";
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  return text.split(emojiRegex).map(part => {
    if (emojiRegex.test(part)) {
      try {
        return renderToStaticMarkup(
          <span className="inline-block mx-0.5 align-middle leading-none" data-emoji={part}>
            <Emoji unified={unicodeToUnified(part)} size={16} emojiStyle={EmojiStyle.APPLE} />
          </span>
        );
      } catch (e) { return part; }
    }
    return part;
  }).join('');
}

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
  onFileUpload,
  onDeleteMessage,
  showRightPanel = false,
  onToggleRightPanel,
}: ChatMessagesProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [visibleDate, setVisibleDate] = useState<string>('');
  const [showFloatingDate, setShowFloatingDate] = useState(false);
  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    msgId: string; x: number; y: number; isMe: boolean; flipX: boolean; flipY: boolean;
  } | null>(null);
  // Delete confirmation popup
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDateVisibleRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    
    if (!isDateVisibleRef.current) {
      setShowFloatingDate(true);
      isDateVisibleRef.current = true;
    }

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      setShowFloatingDate(false);
      isDateVisibleRef.current = false;
    }, 3000);

    const msgElements = container.querySelectorAll('[data-msg-date]');
    let topDate = '';
    for (const el of Array.from(msgElements)) {
      const rect = el.getBoundingClientRect();
      const parentRect = container.getBoundingClientRect();
      if (rect.top >= parentRect.top) {
        topDate = el.getAttribute('data-msg-date') || '';
        break;
      }
    }
    if (topDate) setVisibleDate(getRelativeDate(topDate));
  };

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file, kind);
      setShowAttachMenu(false);
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (convo?.id) {
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
      <div className="flex h-full items-center justify-center bg-[var(--bg1)] text-[var(--t3)]">
        <div className="text-center p-6">
          <p className="text-base font-bold text-[var(--t)]">No chat selected</p>
          <p className="mt-1 text-xs text-[var(--t3)]">Select a channel or direct message to start collaborating.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--t)]">
      
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--b)] bg-[var(--bg1)]">
        <Avatar initials={getInitials(convo.name || 'User')} size="md" src={convo.avatarUrl || undefined} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--t)] truncate">{convo.name}</p>
          {convo.type === 'group' && (
            <p className="text-[11px] text-[var(--t3)] font-semibold">{convo.memberCount || 0} members</p>
          )}
        </div>
        {onToggleRightPanel && (
          <button
            onClick={onToggleRightPanel}
            title={showRightPanel ? 'Hide info panel' : 'Show info panel'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer shrink-0 ${
              showRightPanel
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--inv)]'
                : 'bg-transparent border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Messages Stream ── */}
      <div className="flex-1 min-h-0 relative bg-[var(--bg)]">
        
        {showFloatingDate && visibleDate && (
          <div className="absolute top-0 left-0 right-0 flex justify-center z-40 pointer-events-none animate-in fade-in slide-in-from-top-1 duration-300 p-4">
            <span className="px-3 py-1 bg-[var(--bg1)] border border-[var(--b)] rounded-full text-[10px] font-bold text-[var(--t3)] shadow-sm uppercase tracking-wider">
              {visibleDate}
            </span>
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onClick={() => setContextMenu(null)}
          className="h-full overflow-y-auto px-5 py-4 flex flex-col gap-4"
        >
          {messages.map((m, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDateSeparator = !prevMsg || 
              new Date(m.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

            const isMe = m.senderId === currentUserId;

            return (
              <React.Fragment key={m.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-[var(--bg2)] border border-[var(--b)] rounded-full text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest font-mono">
                      {getRelativeDate(m.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  id={`msg-${m.id}`}
                  data-msg-date={m.createdAt}
                  onContextMenu={e => {
                    e.preventDefault();
                    setContextMenu({
                      msgId: m.id,
                      x: e.clientX,
                      y: e.clientY,
                      isMe,
                      flipX: e.clientX > window.innerWidth / 2,
                      flipY: e.clientY > window.innerHeight * 0.65,
                    });
                  }}
                  className={`group relative flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar initials={getInitials(m.senderName)} size="sm" src={m.senderAvatar || undefined} />
                  <div className={`max-w-[80%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <p className="text-[11px] font-bold text-[var(--t2)] ml-1">{m.senderName}</p>
                    )}

                    {m.replyTo && (
                      <div 
                        className={`mb-[-8px] px-3 py-2 pb-4 rounded-t-xl bg-[var(--bg3)] border border-[var(--b2)] text-[11px] opacity-80 truncate max-w-full flex items-center gap-3 cursor-pointer hover:opacity-100 transition-opacity ${isMe ? 'mr-1' : 'ml-1'}`}
                        onClick={() => {
                          const el = document.getElementById(`msg-${m.replyTo?.id}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[var(--accent)] mb-0.5">Replying to {m.replyTo.senderName}</p>
                          <p className="truncate italic text-[var(--t3)] pr-2 font-medium">{m.replyTo.body}</p>
                        </div>
                        {m.replyTo.messageType === 'attachment' && m.replyTo.metadata?.media_kind === 'image' && m.replyTo.metadata?.file_url && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--b)] shrink-0 bg-[var(--bg1)]">
                            <img src={m.replyTo.metadata.file_url} className="w-full h-full object-cover" alt="Reply thumb" />
                          </div>
                        )}
                      </div>
                    )}

                    {m.messageType === 'attachment' && m.metadata?.file_url ? (
                      <div
                        className={`overflow-hidden rounded-2xl border border-[var(--b)] shadow-sm cursor-pointer hover:opacity-95 transition-opacity ${isMe ? 'bg-blue-600 text-white' : 'bg-[var(--bg2)] text-[var(--t)]'}`}
                        onClick={() => {
                          const kind = m.metadata?.media_kind;
                          if (kind === 'image' || kind === 'video') {
                            setPreviewMedia({ url: m.metadata.file_url, type: kind as any });
                          } else {
                            window.open(m.metadata.file_url, '_blank');
                          }
                        }}
                      >
                        {m.metadata.media_kind === 'image' ? (
                          <img src={m.metadata.file_url} className="max-w-full h-auto max-h-64 object-cover" alt={m.metadata.file_name} />
                        ) : m.metadata.media_kind === 'video' ? (
                          <video src={m.metadata.file_url} className="max-w-full max-h-64 h-auto" />
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20 text-white' : 'bg-blue-600/10 text-blue-600'}`}>
                               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${isMe ? 'text-[var(--inv)]' : 'text-[var(--t)]'}`}>{m.metadata.file_name}</p>
                              <p className={`text-[9px] font-semibold font-mono uppercase ${isMe ? 'text-white/60' : 'text-[var(--t3)]'}`}>{(m.metadata.file_size / 1024).toFixed(1)} KB • DOCUMENT</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (() => {
                      const isCustomerProfile = m.body.startsWith('[CUSTOMER_PROFILE]:');
                      return (
                        <div className={`text-xs relative ${
                          isCustomerProfile
                            ? 'shadow-none'
                            : isMe
                              ? 'px-4 py-2.5 rounded-2xl rounded-tr-sm bg-blue-600 text-white shadow-sm'
                              : 'px-4 py-2.5 rounded-2xl rounded-tl-sm bg-[var(--bg2)] border border-[var(--b)] text-[var(--t)] shadow-sm'
                        }`}>
                          <div className="leading-relaxed whitespace-pre-wrap break-all font-medium">
                            <RenderMessageBody text={m.body} isMine={isMe} />
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-2 mt-0.5 px-1 font-mono select-none">
                      <p className="text-[9px] font-bold text-[var(--t3)] uppercase">
                        {formatTime(m.createdAt)}
                      </p>
                      {isMe && (
                        <span className="text-[9px] font-black text-[var(--accent)] uppercase tracking-tighter">
                          {getReadReceipt(m)}
                        </span>
                      )}
                      
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input Composer ── */}
      <div className="px-5 py-4 bg-[var(--bg1)] border-t border-[var(--b)] shrink-0">
        
        {showMentions && convo.type === 'group' && (
          <div className="mb-3 rounded-2xl border border-[var(--b)] bg-[var(--bg1)] shadow-2xl max-h-48 overflow-y-auto">
            <div className="px-4 py-2 border-b border-[var(--b)] bg-[var(--bg2)]">
              <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Tag Member</p>
            </div>
            <button
              onClick={() => onSelectMention('all')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg2)] transition-colors border-b border-[var(--b)] cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--inv)] text-[10px] font-bold">@</div>
              <span className="text-xs font-bold text-[var(--t)]">Tag Everyone (@all)</span>
            </button>
            {workspaceMembers
              .filter(m => m.userId !== currentUserId)
              .filter(m => 
                m.fullName.toLowerCase().includes(mentionSearch.toLowerCase()) || 
                (m.arkaId || '').toLowerCase().includes(mentionSearch.toLowerCase())
              ).map(m => (
              <button
                key={m.userId}
                onClick={() => onSelectMention(m)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg2)] transition-colors border-b border-[var(--b)] last:border-b-0 cursor-pointer"
              >
                <Avatar initials={getInitials(m.fullName)} size="sm" src={m.avatarUrl || undefined} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--t)] truncate">{m.fullName}</p>
                  <p className="text-[10px] text-[var(--t3)] truncate font-mono">@{m.arkaId || 'no-id'}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {replyingTo && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-[var(--bg2)] border border-[var(--b)] px-4 py-3 animate-in slide-in-from-bottom-2 duration-200 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" />
            <div className="min-w-0 flex-1 flex items-center gap-4">
              <div className="min-w-0 flex-1 ml-1">
                <p className="text-[10px] font-bold text-[var(--accent)] uppercase mb-0.5">Replying to {replyingTo.senderName}</p>
                <p className="text-xs text-[var(--t2)] truncate pr-4 italic opacity-80 leading-tight">{replyingTo.body}</p>
              </div>
              {replyingTo.messageType === 'attachment' && replyingTo.metadata?.media_kind === 'image' && replyingTo.metadata?.file_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-[var(--b)] shrink-0 bg-[var(--bg1)] shadow-sm">
                  <img src={replyingTo.metadata.file_url} className="w-full h-full object-cover" alt="Preview thumb" />
                </div>
              )}
            </div>
            <button 
              onClick={onCancelReply} 
              className="ml-3 text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg3)] p-2 rounded-full transition-all shrink-0 cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`w-8.5 h-8.5 flex items-center justify-center transition-all rounded-full shrink-0 cursor-pointer ${showAttachMenu ? 'bg-[var(--accent)] text-[var(--inv)] rotate-45' : 'text-[var(--t3)] hover:text-[var(--accent)] hover:bg-[var(--bg2)]'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <input 
              type="file" 
              ref={mediaInputRef} 
              className="hidden" 
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const kind = file.type.startsWith('image/') ? 'image' : 'video';
                  handleFileChange(e, kind);
                }
              }}
            />
            <input 
              type="file" 
              ref={docInputRef} 
              className="hidden" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              onChange={(e) => handleFileChange(e, 'document')}
            />

            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="fixed inset-0 z-[-1]" onClick={() => setShowAttachMenu(false)} />
                <div className="bg-[var(--bg1)] rounded-2xl shadow-2xl border border-[var(--b)] py-2 min-w-[200px] overflow-hidden">
                  <button 
                    onClick={() => mediaInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg2)] transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[var(--t)]">Photos & Videos</p>
                      <p className="text-[10px] text-[var(--t3)] font-semibold">Share media files</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => docInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg2)] transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center text-[var(--accent)] shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[var(--t)]">Document</p>
                      <p className="text-[10px] text-[var(--t3)] font-semibold">Share any file</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 relative">
            <div 
              className="relative w-full min-h-[42px] bg-[var(--bg2)] border border-[var(--b2)] rounded-2xl focus-within:border-[var(--accent)] transition-all overflow-hidden"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (message.trim()) onSendMessage();
                }
              }}
            >
              <ContentEditable
                innerRef={inputRef as any}
                html={textToHtml(message)}
                disabled={false}
                onChange={(e) => {
                  const text = htmlToText(e.target.value);
                  onMessageChange({ target: { value: text } } as any);
                }}
                className="w-full text-xs outline-none bg-transparent px-4 py-2.5 min-h-[42px] max-h-32 overflow-y-auto block text-[var(--t)] font-medium"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              />
              {!message && (
                <div className="absolute inset-0 px-4 py-2.5 pointer-events-none text-xs text-[var(--t4)] font-medium">
                  Type a message...
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`transition-all p-2 rounded-full hover:bg-[var(--bg2)] cursor-pointer ${showEmojiPicker ? 'text-[var(--accent)] bg-[var(--bg2)]' : 'text-[var(--t3)]'}`}
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
                <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                <div className="relative shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      onMessageChange({ target: { value: message + emojiData.emoji } } as any);
                    }}
                    emojiStyle={EmojiStyle.APPLE}
                    lazyLoadEmojis={true}
                    width={320}
                    height={380}
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
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer ${message.trim() ? 'bg-[var(--accent)] hover:opacity-90 scale-100' : 'bg-[var(--bg3)] scale-95 opacity-40'}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={message.trim() ? 'text-[var(--inv)]' : 'text-[var(--t3)]'}>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <MediaLightbox
        isOpen={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        url={previewMedia?.url || ''}
        type={previewMedia?.type || 'image'}
      />

      {/* ── Right-click context menu ── */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setContextMenu(null)}
          onContextMenu={e => { e.preventDefault(); setContextMenu(null); }}
        >
          <div
            className="absolute bg-[var(--bg1)] border border-[var(--b)] rounded-xl shadow-2xl py-1.5 min-w-[168px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              left:   contextMenu.flipX ? 'auto' : contextMenu.x,
              right:  contextMenu.flipX ? window.innerWidth  - contextMenu.x : 'auto',
              top:    contextMenu.flipY ? 'auto' : contextMenu.y,
              bottom: contextMenu.flipY ? window.innerHeight - contextMenu.y : 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Reply */}
            <button
              onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.msgId);
                if (msg) onReply(msg);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg2)] transition-colors cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--t3)] shrink-0">
                <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              <span className="text-xs font-bold text-[var(--t)]">Reply</span>
            </button>

            {/* Delete — own messages only */}
            {contextMenu.isMe && onDeleteMessage && (
              <>
                <div className="h-px bg-[var(--b)] mx-2 my-1" />
                <button
                  onClick={() => { setConfirmDeleteId(contextMenu.msgId); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  <span className="text-xs font-bold text-red-400">Delete message</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setConfirmDeleteId(null)}
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
                <h3 className="text-sm font-bold text-[var(--t)]">Delete message?</h3>
                <p className="text-[11px] text-[var(--t3)] mt-0.5 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            {/* Message preview */}
            {(() => {
              const msg = messages.find(m => m.id === confirmDeleteId);
              if (!msg) return null;
              const preview = msg.messageType === 'attachment'
                ? `📎 ${msg.metadata?.file_name || 'Attachment'}`
                : msg.body;
              return (
                <div className="mx-5 mb-4 px-3.5 py-2.5 bg-[var(--bg2)] border border-[var(--b)] rounded-xl">
                  <p className="text-[11px] text-[var(--t3)] line-clamp-3 font-medium italic leading-relaxed">
                    "{preview}"
                  </p>
                </div>
              );
            })()}

            {/* Action buttons */}
            <div className="flex gap-2.5 px-5 pb-5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--b)] bg-[var(--bg2)] text-xs font-bold text-[var(--t2)] hover:bg-[var(--bg3)] transition-all cursor-pointer active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDeleteMessage?.(confirmDeleteId!); setConfirmDeleteId(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-all cursor-pointer active:scale-[0.98] shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}