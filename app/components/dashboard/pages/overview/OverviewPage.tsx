'use client';

import DashboardLayout from '../../layout/DashboardLayout';
import StatCard from '../../ui/StatCard';
import Card from '../../ui/Card';
import Avatar from '../../ui/Avatar';
import Button from '../../ui/Button';
import ChurnTrendChart from '../../charts/ChurnTrendChart';
import CustomerFlowChart from '../../charts/CustomerFlowChart';
import DonutChart from '../../charts/DonutChart';
import { useEffect, useState } from 'react';
import { useDashboardContext } from '../../context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
const segments = [
  {
    name: 'Loyal Champions',
    pct: '17.1%',
    mrr: '$2,845',
    color: 'text-emerald-600',
    panelBg: 'bg-emerald-50/70',
    panelBorder: 'border-emerald-100',
    iconBg: 'bg-emerald-100/90',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    name: 'At Risk',
    pct: '11.4%',
    mrr: '$456',
    color: 'text-red-500',
    panelBg: 'bg-red-50/70',
    panelBorder: 'border-red-100',
    iconBg: 'bg-red-100/90',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="7" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    name: 'New Adopters',
    pct: '31.3%',
    mrr: '$187',
    color: 'text-blue-600',
    panelBg: 'bg-blue-50/70',
    panelBorder: 'border-blue-100',
    iconBg: 'bg-blue-100/90',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 8 18 14 12 14" />
        <path d="M18 8l-8.5 8.5L6 13" />
      </svg>
    ),
  },
  {
    name: 'High Value',
    pct: '50.2%',
    mrr: '$1,268',
    color: 'text-violet-600',
    panelBg: 'bg-violet-50/70',
    panelBorder: 'border-violet-100',
    iconBg: 'bg-violet-100/90',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];



export type OverviewStats = {
  totalCustomers: number;
  safeCustomers: number;
  churnRisk: number;
  predictedChurn: number;
};

export default function OverviewPage({ stats, riskData, flowData, planData }: { stats?: OverviewStats, riskData?: any[], flowData?: any, planData?: any[] }) {
  // Use dummy data if stats are not provided (e.g. no dataset)
  const data = stats || {
    totalCustomers: 13000,
    safeCustomers: 3510,
    churnRisk: 5.4,
    predictedChurn: 229
  };

  const supabase = createClient();
  const { workspace, profile, members } = useDashboardContext();
  const [recentChats, setRecentChats] = useState<any[]>([]);

  useEffect(() => {
    if (!workspace?.id || !profile?.id) return;
    
    async function loadChats() {
      const { data: rawMemberships } = await supabase
        .from('workspace_conversation_members')
        .select(`
          conversation_id,
          workspace_conversations (
            id, conversation_type, name, direct_key, last_message_at, avatar_url,
            workspace_conversation_members (user_id)
          )
        `)
        .eq('user_id', profile!.id);

      const convRows = ((rawMemberships || []) as any[])
        .map(m => m.workspace_conversations)
        .filter(c => !!c);

      if (convRows.length === 0) return;

      const conversationIds = convRows.map(c => c.id);

      const { data: latestMessages } = await supabase
        .from('workspace_messages')
        .select('conversation_id, body, created_at, sender_user_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      const { data: readRows } = await supabase
        .from('workspace_conversation_reads')
        .select('conversation_id, user_id, last_read_at')
        .eq('user_id', profile!.id)
        .in('conversation_id', conversationIds);

      const readMap: Record<string, string> = {};
      (readRows || []).forEach(row => {
        readMap[row.conversation_id] = row.last_read_at;
      });

      const latestByConversation = new Map();
      (latestMessages || []).forEach(row => {
        if (!latestByConversation.has(row.conversation_id)) {
          latestByConversation.set(row.conversation_id, row);
        }
      });

      const mapped = convRows.map((row: any) => {
        const rawMembers = row.workspace_conversation_members || [];
        let displayName = row.name || 'Group';
        let avatarUrl = row.avatar_url || null;
        
        if (row.conversation_type === 'direct') {
          const peerId = rawMembers.find((m: any) => m.user_id !== profile!.id)?.user_id;
          const peerMember = members.find(m => m.userId === peerId);
          if (peerMember) {
            displayName = peerMember.fullName;
            avatarUrl = peerMember.avatarUrl;
          } else {
            displayName = 'User';
          }
        }
        
        const latest = latestByConversation.get(row.id);
        
        // simple time format
        let timeStr = '';
        if (latest?.created_at) {
          const diff = Math.floor((new Date().getTime() - new Date(latest.created_at).getTime()) / 60000);
          if (diff < 60) timeStr = `${diff}m ago`;
          else if (diff < 1440) timeStr = `${Math.floor(diff/60)}h ago`;
          else timeStr = `${Math.floor(diff/1440)}d ago`;
        }

        let initials = displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

        // Calculate unread
        const msgsInConvo = (latestMessages || []).filter(msg => msg.conversation_id === row.id);
        const myLastReadAt = readMap[row.id];
        
        let unreadCount = 0;
        if (msgsInConvo.length > 0) {
          const otherMessages = msgsInConvo.filter(msg => msg.sender_user_id !== profile!.id);
          const lastReadTime = myLastReadAt ? new Date(myLastReadAt).getTime() : 0;
          unreadCount = otherMessages.filter(msg => new Date(msg.created_at).getTime() > lastReadTime).length;
        }

        return {
          id: row.id,
          name: displayName,
          avatarUrl,
          initials,
          lastMessage: latest?.body || 'No messages yet',
          lastAt: latest?.created_at || row.last_message_at,
          timeStr,
          unreadCount
        };
      });

      mapped.sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime());
      setRecentChats(mapped);
    }
    loadChats();
  }, [workspace, profile, members, supabase]);

  return (
    <DashboardLayout page="Dashboard Overview">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard label="Total Customers" value={data.totalCustomers.toLocaleString('en-US')} 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          iconBg="bg-slate-100"
        />
        <StatCard label="Safe Customers" value={data.safeCustomers.toLocaleString('en-US')} change={`${(data.totalCustomers > 0 ? (data.safeCustomers / data.totalCustomers * 100) : 0).toFixed(1)}%`} changeSuffix="of total" changePositive
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#67f63bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>}
          iconBg="bg-slate-100"
        />
        <StatCard label="Churn Risk" value={`${data.churnRisk}%`} 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f63b51ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></svg>}
          iconBg="bg-slate-100"
        />
        <StatCard label="Predicted Churn" value={data.predictedChurn.toLocaleString('en-US')} 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f63b51ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
          iconBg="bg-slate-100"
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-9 grid gap-4">
          {/* Charts row */}
          <div className="grid grid-cols-9 gap-4">
            <Card className="col-span-5"><ChurnTrendChart data={riskData} /></Card>
            <Card className="col-span-4"><CustomerFlowChart data={flowData} /></Card>
          </div>

          {/* Distribution + Segments row */}
          <div className="grid grid-cols-12 gap-4">
            <Card className="col-span-4"><DonutChart data={planData} /></Card>

            <Card className="col-span-8">
              <h3 className="text-sm font-bold text-black mb-4">Customer Segment</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {segments.map(s => (
                  <div key={s.name} className={`rounded-xl border border-gray-200 bg-white overflow-hidden flex min-h-29`}>
                    <div className={`w-8 border-r flex items-start justify-center pt-3 ${s.panelBg} ${s.panelBorder}`}>
                      <div className={`h-6 w-6 rounded-md flex items-center justify-center ${s.iconBg}`}>
                        {s.icon}
                      </div>
                    </div>
                    <div className="flex-1 p-2.5 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-900 leading-tight">{s.name}</p>
                        <span className={`text-[10px] font-semibold ${s.color}`}>{s.pct}</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Percentage</p>
                        <p className={`text-sm font-black leading-tight ${s.color}`}>{s.pct}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Avg MRR</p>
                        <p className="text-sm font-black leading-tight text-gray-900">{s.mrr}</p>
                      </div>
                      <button className="mt-auto text-[10px] font-semibold text-gray-600 border border-gray-200 rounded-md py-1 hover:bg-gray-50 transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Team Chat spans both rows */}
        <Card className="col-span-3 flex h-full flex-col gap-3">
          <h3 className="text-sm font-bold text-black">Team Chat</h3>
          <Link href="/dashboard/chat?compose=group" className="block w-full">
            <Button variant="blue" className="w-full justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create Group Chat
            </Button>
          </Link>
          <div className="flex flex-col gap-3 mt-1 overflow-y-auto overflow-x-hidden">
            {recentChats.map(m => (
              <Link href={`/dashboard/chat?convo=${m.id}`} key={m.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 rounded-xl p-1.5 -mx-1.5 transition-colors">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <Avatar initials={m.initials} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-black truncate">{m.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">{m.timeStr}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500 truncate">{m.lastMessage}</p>
                    {m.unreadCount > 0 && (
                      <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white ml-2">
                        {m.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {recentChats.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No recent chats</p>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
