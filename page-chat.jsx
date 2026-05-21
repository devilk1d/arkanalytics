/* global React, window */
(function() {
const { Icon, PageHead, Badge } = window;

const channels = [
  { id: 'general',     name: 'general',           unread: 0, last: 'Maharani · 2m' },
  { id: 'churn-alerts',name: 'churn-alerts',      unread: 3, last: 'System · just now', pinned: true },
  { id: 'q3-review',   name: 'q3-retention-review', unread: 0, last: 'Wira · yesterday' },
  { id: 'data-eng',    name: 'data-engineering',  unread: 0, last: 'Bagas · 3h' },
  { id: 'pricing',     name: 'pricing-experiments', unread: 1, last: 'Maharani · 4h' },
];
const dms = [
  { id: 'dm-1', name: 'Maharani Putri', initials: 'MP', online: true,  last: '2m' },
  { id: 'dm-2', name: 'Wira Sentanu',   initials: 'WS', online: true,  last: '14m' },
  { id: 'dm-3', name: 'Bagas Pranata',  initials: 'BP', online: false, last: '3h' },
  { id: 'dm-4', name: 'Citra Lestari',  initials: 'CL', online: false, last: '1d' },
];

const messages = [
  { id: 1, who: 'System', initials: 'SY', system: true, time: '14:42',
    text: 'New high-risk batch flagged · 12 customers added to #churn-alerts',
    attach: { kind: 'alert', label: '12 customers · risk > 0.85' } },
  { id: 2, who: 'Maharani Putri', initials: 'MP', time: '14:45',
    text: 'Looking at CUS-04821 and CUS-04792. Both have declining usage for 4 weeks — should we trigger the Enterprise Save Play?' },
  { id: 3, who: 'Wira Sentanu', initials: 'WS', time: '14:46',
    text: 'Yes, let me ping their CSM. Also, attaching the segment snapshot for at-risk loyalists.',
    attach: { kind: 'file', label: 'at-risk-loyalists-oct.csv · 28 KB' } },
  { id: 4, who: 'Maharani Putri', initials: 'MP', time: '14:48',
    text: 'Perfect. I\'ll draft the playbook updates in the doc.' },
  { id: 5, who: 'You', initials: 'RA', me: true, time: '14:51',
    text: 'Loop me in when the CSM call is scheduled. I want to validate the model output against what they say.' },
  { id: 6, who: 'Bagas Pranata', initials: 'BP', time: '14:53',
    text: 'Heads up — Zendesk sync is failing again. Probably an auth refresh. Looking into it.' },
];

function ChatPage() {
  const [activeChannel, setActiveChannel] = React.useState('churn-alerts');
  const [draft, setDraft] = React.useState('');
  const ch = channels.find(c => c.id === activeChannel) || channels[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', height: 'calc(100vh - 56px)' }}>
      {/* Channels sidebar */}
      <div style={{ borderRight: '1px solid var(--b)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <div className="page-eyebrow" style={{ marginBottom: 4 }}>Workspace</div>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>Team Chat</div>
        </div>
        <div style={{ padding: '0 12px' }}>
          <div className="field" style={{ marginBottom: 8 }}>
            <Icon.Search />
            <input placeholder="Search messages…" />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 16 }}>
          <div className="sidebar-section" style={{ padding: '14px 16px 6px' }}><span>Channels</span></div>
          <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {channels.map(c => (
              <button key={c.id}
                onClick={() => setActiveChannel(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 6,
                  background: activeChannel === c.id ? 'var(--bg3)' : 'transparent',
                  color: activeChannel === c.id ? 'var(--t)' : 'var(--t2)',
                  fontSize: 13, textAlign: 'left'
                }}
                onMouseEnter={e => { if (activeChannel !== c.id) e.currentTarget.style.background = 'var(--bg2)'; }}
                onMouseLeave={e => { if (activeChannel !== c.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon.Hash style={{ color: 'var(--t3)' }} />
                <span style={{ flex: 1, fontWeight: c.unread ? 600 : 400 }}>{c.name}</span>
                {c.unread > 0 && <span className="nav-item-badge">{c.unread}</span>}
              </button>
            ))}
            <button style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', color: 'var(--t3)', fontSize: 12 }}>
              <Icon.Plus />
              <span>New channel</span>
            </button>
          </div>

          <div className="sidebar-section" style={{ padding: '14px 16px 6px' }}><span>Direct messages</span></div>
          <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {dms.map(d => (
              <button key={d.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, color: 'var(--t2)', fontSize: 13, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}>{d.initials}</div>
                  {d.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid var(--bg)' }}></span>}
                </div>
                <span style={{ flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}>{d.last}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages center */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {/* Channel header */}
        <div style={{ height: 56, borderBottom: '1px solid var(--b)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Icon.Hash style={{ color: 'var(--t3)' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{ch.name}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>4 members · model + human channel</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="topbar-action" title="Pin"><Icon.Sparkle /></button>
            <button className="topbar-action" title="Members"><Icon.Users /></button>
            <button className="topbar-action" title="More"><Icon.More /></button>
          </div>
        </div>

        {/* Messages list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 16px' }}>
            <div style={{ height: 1, background: 'var(--b)', width: 80 }}></div>
            <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Today · Oct 16</span>
            <div style={{ height: 1, background: 'var(--b)', width: 80 }}></div>
          </div>

          {messages.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: 12, padding: '8px 0', alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: m.system ? 'var(--bg3)' : (m.me ? 'var(--t)' : 'var(--bg3)'),
                color: m.me ? 'var(--inv)' : 'var(--t)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
                flexShrink: 0, border: '1px solid var(--b)'
              }}>
                {m.system ? <Icon.Sparkle style={{ color: 'var(--accent)' }} /> : m.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: m.system ? 'var(--accent)' : 'var(--t)' }}>{m.who}</span>
                  <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{m.time}</span>
                  {m.system && <span className="badge low" style={{ marginLeft: 'auto' }}><span className="dot"></span>system</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4, lineHeight: 1.55 }}>{m.text}</div>
                {m.attach && (
                  <div style={{
                    marginTop: 8, padding: '10px 12px',
                    border: '1px solid var(--b2)', borderRadius: 6,
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    background: m.attach.kind === 'alert' ? 'var(--accent-bg)' : 'var(--bg1)',
                  }}>
                    {m.attach.kind === 'alert'
                      ? <span style={{ color: 'var(--accent)' }}><Icon.Sparkle /></span>
                      : <Icon.Doc style={{ color: 'var(--t3)' }} />}
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{m.attach.label}</span>
                    <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }}>Open →</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div style={{ padding: 16, borderTop: '1px solid var(--b)', flexShrink: 0 }}>
          <div style={{
            border: '1px solid var(--b2)',
            borderRadius: 10,
            background: 'var(--bg1)',
            padding: 12,
          }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={`Message #${ch.name}…`}
              rows="2"
              style={{ width: '100%', resize: 'none', fontSize: 13, color: 'var(--t)', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <button className="topbar-action" style={{ width: 28, height: 28 }}><Icon.Plus /></button>
              <button className="topbar-action" style={{ width: 28, height: 28 }} title="Mention customer"><Icon.Users /></button>
              <button className="topbar-action" style={{ width: 28, height: 28 }} title="Attach report"><Icon.Doc /></button>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>↵ to send · ⇧↵ for newline</span>
              <button className="btn btn-primary btn-sm"><Icon.Send /> Send</button>
            </div>
          </div>
        </div>
      </div>

      {/* Right info panel */}
      <div style={{ borderLeft: '1px solid var(--b)', padding: 20, overflowY: 'auto' }}>
        <div className="card-title">About this channel</div>
        <div className="card-sub" style={{ marginBottom: 16 }}>Pinned context for #{ch.name}</div>

        <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.55, marginBottom: 20 }}>
          Real-time stream of customers crossing the high-risk threshold. System messages from the prediction model; humans coordinate response here.
        </p>

        <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Members · 4</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {[
            { name: 'Rian Adityawan', role: 'Admin', initials: 'RA' },
            { name: 'Maharani Putri', role: 'Analyst', initials: 'MP' },
            { name: 'Wira Sentanu', role: 'CSM Lead', initials: 'WS' },
            { name: 'Bagas Pranata', role: 'Data Eng', initials: 'BP' },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', border: '1px solid var(--b)' }}>{p.initials}</div>
              <div style={{ flex: 1, fontSize: 12 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{p.role}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Pinned files</div>
        {[
          { name: 'at-risk-playbook-v3.pdf', size: '2.1 MB' },
          { name: 'enterprise-save-script.md', size: '12 KB' },
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b)' }}>
            <Icon.Doc style={{ color: 'var(--t3)' }} />
            <div style={{ flex: 1, fontSize: 12 }}>{f.name}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{f.size}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.ChatPage = ChatPage;

})();
