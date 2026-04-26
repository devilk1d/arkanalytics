'use client';

import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Avatar from '../../ui/Avatar';
import Tabs from '../../ui/Tabs';
import ProgressBar from '../../ui/ProgressBar';

/* ─── Mock data ─── */
const conversations = [
  { id: '1', name: 'Naufal Putra',         initials: 'NP', last: "Got it! I'll reach out to them today.", time: '4:42 PM', unread: 3, type: 'personal' },
  { id: '2', name: 'Fawwaz Aiman',         initials: 'FA', last: 'Can you check the latest analytics?',   time: '4:42 PM', unread: 0, type: 'personal', delivered: true },
  { id: '3', name: 'Muhibuddin Muklish',   initials: 'MM', last: 'Can we schedule a quick sync',          time: '4:42 PM', unread: 0, type: 'personal' },
  { id: '4', name: 'Rizqy Pratama',        initials: 'RP', last: 'We should align on the new strategy',   time: '4:42 PM', unread: 1, type: 'personal' },
  { id: '5', name: 'Telvora Retention Team',initials: 'TR', last: 'You: Please retain that customer',      time: '4:42 PM', unread: 0, type: 'group' },
];

const messages = [
  { id: 1, sender: 'Naufal Putra',       initials: 'NP', text: 'I noticed some high-risk customers in today\'s report.', time: '1h ago',  me: false },
  { id: 2, sender: 'Muhibuddin Muklish', initials: 'MM', text: 'Yes, I saw that too.',                                   time: '59m ago', me: false },
  { id: 3, sender: 'Fawwaz Aiman',       initials: 'FA', text: 'Someone share one that needs immediate attention.',      time: '59m ago', me: false },
  { id: 4, sender: 'Rizqy Pratama',      initials: 'RP', text: 'Follow up the customer',                                 time: '29m ago', me: false },
  { id: 5, sender: 'Me',                 initials: 'AM', text: 'Please retain that customer',                            time: 'Now',     me: true  },
];

const todos = [
  { text: 'Follow up with Acme Corp',          due: 'Due today',       initials: 'NP', done: false },
  { text: 'Review the latest engagement data', due: 'Completed',       initials: 'FA', done: true  },
  { text: 'Prepare retention strategy',        due: 'Due tomorrow',    initials: 'MM', done: false },
  { text: 'Schedule meeting with clients',     due: 'Due May 25, 10:00 AM', initials: 'RP', done: false },
  { text: 'Make meeting notes',               due: 'Due May 29',       initials: 'AM', done: false },
];

const customerRisks = [
  { name: 'Acme Corporation',  plan: 'Enterprise Plan',   usage: 89, risk: 'low'  as const },
  { name: 'TechStart Inc.',    plan: 'Professional Plan', usage: 45, risk: 'high' as const },
  { name: 'Global Solutions',  plan: 'Enterprise Plan',   usage: 55, risk: 'med'  as const },
  { name: 'StartupHub',        plan: 'Starter Plan',      usage: 89, risk: 'low'  as const },
];

const recentActivity = [
  { icon: '✓', text: 'Offer sent to Acme Corp',              time: '2h ago',  color: 'text-green-500' },
  { icon: '📞', text: 'Call scheduled with TechStart Inc.',  time: '1d ago',  color: 'text-blue-500'  },
  { icon: '✉️', text: 'Email opened by Global Solutions',    time: '2d ago',  color: 'text-blue-500'  },
  { icon: '📊', text: 'Retention report shared',             time: '3d ago',  color: 'text-purple-500'},
  { icon: '🔔', text: 'Renewal reminder sent to MiGas',      time: '10h ago', color: 'text-yellow-500'},
  { icon: '✉️', text: 'Welcome email sent to Moca Inc.',     time: '9h ago',  color: 'text-blue-500'  },
];

const riskColors = { low: 'bg-green-100 text-green-700', med: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };

/* ─── Right panel tabs ─── */
function ActionsPanel() {
  const [todos2, setTodos2] = useState(todos);
  const [note, setNote] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-black">To-do List</h4>
          <button className="text-xs font-semibold text-blue-600 hover:underline">+ Add task</button>
        </div>
        <div className="flex flex-col gap-2">
          {todos2.map((t, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <button
                onClick={() => setTodos2(prev => prev.map((item, idx) => idx === i ? { ...item, done: !item.done } : item))}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all
                  ${t.done ? 'bg-black border-black' : 'border-gray-300 hover:border-black'}`}
              >
                {t.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${t.done ? 'line-through text-gray-400' : 'text-black'}`}>{t.text}</p>
                <p className="text-[10px] text-gray-400">{t.due}</p>
              </div>
              <Avatar initials={t.initials} size="sm" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Write some notes..."
          rows={4}
          className="w-full text-sm text-gray-700 placeholder-gray-300 outline-none resize-none border border-gray-100 rounded-xl p-3 focus:border-gray-300 transition-colors"
        />
      </div>
    </div>
  );
}

function CustomersPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-bold text-black mb-3">Customers</h4>
        <div className="flex flex-col gap-3">
          {customerRisks.map(c => (
            <div key={c.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-black">{c.name}</p>
                <p className="text-[10px] text-gray-400 mb-1">{c.plan}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-500">Usage</p>
                  <ProgressBar value={c.usage} height="sm" />
                  <p className="text-[10px] text-gray-500">{c.usage}%</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${riskColors[c.risk]}`}>
                {c.risk.charAt(0).toUpperCase() + c.risk.slice(1)}
              </span>
            </div>
          ))}
        </div>
        <button className="text-xs font-semibold text-gray-600 hover:text-black transition-colors mt-3 flex items-center gap-1">
          View all customers →
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-black">Recent Activity</h4>
          <button className="text-xs font-semibold text-blue-600 hover:underline">View all</button>
        </div>
        <div className="flex flex-col gap-2">
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{a.icon}</span>
                <p className="text-xs text-gray-700">{a.text}</p>
              </div>
              <p className="text-[10px] text-gray-400 shrink-0 ml-2">{a.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilesPanel() {
  const months = [
    { month: 'THIS MONTH', files: [{ w: 'col-span-1' }] },
    { month: 'March',      files: [{ w: 'col-span-1' }, { w: 'col-span-1' }, { w: 'col-span-1' }, { w: 'col-span-1' }] },
    { month: 'February',   files: [{ w: 'col-span-1' }, { w: 'col-span-1' }, { w: 'col-span-1' }] },
    { month: 'January',    files: [] },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h4 className="text-sm font-bold text-black mb-3">Media</h4>
        {months.map(m => (
          <div key={m.month} className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{m.month}</p>
            {m.files.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {m.files.map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-bold text-black mb-3">Docs</h4>
        <div className="flex flex-col gap-2">
          {['Customer Information.pdf', 'Customer Segmentation Report.pdf'].map((doc, i) => (
            <div key={i} className="bg-blue-600 rounded-xl p-3 cursor-pointer hover:bg-blue-700 transition-colors">
              <div className="w-full h-16 bg-blue-500 rounded-lg mb-2" />
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <p className="text-xs font-medium text-white truncate">{doc}</p>
              </div>
              <p className="text-[10px] text-blue-200 mt-0.5">5 Pages • PDF • 1 MB</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Chat Page ─── */
export default function ChatPage() {
  const [activeConvo, setActiveConvo] = useState('5');
  const [message, setMessage] = useState('');
  const [chatFilter, setChatFilter] = useState('all');
  const [rightTab, setRightTab] = useState('actions');
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const convo = conversations.find(c => c.id === activeConvo);
  const filtered = conversations.filter(c =>
    (chatFilter === 'all' || (chatFilter === 'personal' && c.type === 'personal') || (chatFilter === 'groups' && c.type === 'group')) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout page="Team Chat">
      <div className="flex gap-0 h-[calc(100vh-88px)] -m-6 overflow-hidden rounded-2xl border border-gray-100 bg-white">

        {/* ── Conversation list ── */}
        <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-black">Chats</h3>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
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
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setActiveConvo(c.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50
                  ${activeConvo === c.id ? 'bg-gray-50' : ''}`}
              >
                {c.type === 'group'
                  ? <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                  : <Avatar initials={c.initials} size="md" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-black truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400 shrink-0 ml-1">{c.time}</p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">{c.last}</p>
                    {c.unread > 0 && (
                      <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 ml-1">
                        {c.unread}
                      </span>
                    )}
                    {c.delivered && (
                      <svg className="shrink-0 ml-1 text-blue-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat messages ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-black">{convo?.name}</p>
              <p className="text-xs text-gray-400">5 members</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {messages.map(m => (
              <div key={m.id} className={`flex items-start gap-3 ${m.me ? 'flex-row-reverse' : ''}`}>
                {!m.me && <Avatar initials={m.initials} size="sm" />}
                <div className={`max-w-xs ${m.me ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!m.me && <p className="text-xs font-semibold text-gray-600">{m.sender}</p>}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${m.me ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-black rounded-tl-sm'}`}>
                    {m.text}
                  </div>
                  <p className="text-[10px] text-gray-400">{m.time}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-3">
            <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-black transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && message.trim()) setMessage(''); }}
              placeholder="Type a message"
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
            />
            <button className="text-gray-400 hover:text-black transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>
            <button
              onClick={() => setMessage('')}
              className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-72 border-l border-gray-100 flex flex-col shrink-0">
          <Tabs
            tabs={[{ label: 'Actions', value: 'actions' }, { label: 'Customers', value: 'customers' }, { label: 'Files', value: 'files' }]}
            active={rightTab}
            onChange={setRightTab}
            variant="underline"
          />
          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === 'actions'   && <ActionsPanel />}
            {rightTab === 'customers' && <CustomersPanel />}
            {rightTab === 'files'     && <FilesPanel />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
