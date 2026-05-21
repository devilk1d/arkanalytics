/* global React, window */
(function() {
const { Icon, PageHead, Badge } = window;

const members = [
  { name: 'Rian Adityawan',  email: 'rian@arka.id',       role: 'Admin',    initials: 'RA', last: 'now',         status: 'online' },
  { name: 'Maharani Putri',  email: 'maharani@arka.id',   role: 'Analyst',  initials: 'MP', last: '2 min ago',   status: 'online' },
  { name: 'Wira Sentanu',    email: 'wira@arka.id',       role: 'CSM Lead', initials: 'WS', last: '14 min ago',  status: 'online' },
  { name: 'Bagas Pranata',   email: 'bagas@arka.id',      role: 'Data Eng', initials: 'BP', last: '3 hours ago', status: 'away' },
  { name: 'Citra Lestari',   email: 'citra@arka.id',      role: 'Viewer',   initials: 'CL', last: '1 day ago',   status: 'offline' },
];

const sections = [
  { id: 'workspace',    label: 'Workspace',     icon: 'W' },
  { id: 'profile',      label: 'Profile',       icon: 'P' },
  { id: 'members',      label: 'Members & roles', icon: 'M' },
  { id: 'integrations', label: 'Integrations',  icon: 'I' },
  { id: 'billing',      label: 'Billing & plan',icon: 'B' },
  { id: 'security',     label: 'Security',      icon: 'S' },
  { id: 'api',          label: 'API & webhooks',icon: 'A' },
];

function SettingsPage() {
  const [section, setSection] = React.useState('workspace');

  return (
    <div className="page fade-in">
      <PageHead
        eyebrow="Workspace · Acme Cloud"
        title="Settings"
        sub="Manage workspace, team, integrations, and billing."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32 }}>
        {/* Settings nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sections.map(s => (
            <button key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 6,
                background: section === s.id ? 'var(--bg2)' : 'transparent',
                color: section === s.id ? 'var(--t)' : 'var(--t2)',
                fontSize: 13, textAlign: 'left',
                position: 'relative'
              }}
              onMouseEnter={e => { if (section !== s.id) e.currentTarget.style.background = 'var(--bg1)'; }}
              onMouseLeave={e => { if (section !== s.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {section === s.id && <span style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 2, height: 16, background: 'var(--accent)', borderRadius: '0 2px 2px 0' }}></span>}
              <span style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--bg2)', border: '1px solid var(--b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--t2)' }}>{s.icon}</span>
              <span style={{ fontWeight: section === s.id ? 500 : 400 }}>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div>
          {section === 'workspace' && <WorkspaceSection />}
          {section === 'profile' && <ProfileSection />}
          {section === 'members' && <MembersSection />}
          {section === 'integrations' && <IntegrationsSection />}
          {section === 'billing' && <BillingSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'api' && <ApiSection />}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, hint, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, padding: '18px 0', borderBottom: '1px solid var(--b)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>{children}</div>
    </div>
  );
}

function WorkspaceSection() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>Workspace</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>General settings for your workspace</div>
      </div>

      <SettingRow label="Logo" hint="PNG or SVG, square, max 1MB. Shown in reports and emails.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--t)', color: 'var(--inv)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700 }}>A</div>
          <button className="btn">Upload</button>
          <button className="btn btn-ghost">Remove</button>
        </div>
      </SettingRow>

      <SettingRow label="Workspace name" hint="Visible to all members.">
        <div className="field" style={{ width: 360 }}>
          <input defaultValue="Arka Analytics — Acme Cloud" />
        </div>
      </SettingRow>

      <SettingRow label="Workspace URL" hint="Used in invitation links.">
        <div className="field" style={{ width: 360 }}>
          <span style={{ color: 'var(--t3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>arkanalytics.io/</span>
          <input defaultValue="acme-cloud" />
        </div>
      </SettingRow>

      <SettingRow label="Industry sector" hint="Helps tune the churn model defaults.">
        <div className="field" style={{ width: 240 }}>
          <input defaultValue="SaaS · B2B" />
          <Icon.Chevron />
        </div>
      </SettingRow>

      <SettingRow label="Team size">
        <div style={{ display: 'flex', gap: 6 }}>
          {['1–10', '11–50', '51–200', '200+'].map(s => (
            <span key={s} className={`chip ${s === '11–50' ? 'on' : ''}`}>{s}</span>
          ))}
        </div>
      </SettingRow>

      <SettingRow label="Time zone">
        <div className="field" style={{ width: 280 }}>
          <input defaultValue="(UTC+07:00) Jakarta · Asia/Jakarta" />
          <Icon.Chevron />
        </div>
      </SettingRow>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button className="btn btn-primary">Save changes</button>
        <button className="btn btn-ghost">Discard</button>
      </div>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--b)' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--danger)', marginBottom: 6 }}>Danger zone</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.5 }}>
          Deleting the workspace will permanently remove all data, datasets, segments, and reports. This cannot be undone.
        </div>
        <button className="btn" style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' }}>
          Delete workspace
        </button>
      </div>
    </div>
  );
}

function ProfileSection() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Profile</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Personal information visible to your team</div>
      </div>
      <SettingRow label="Avatar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, border: '1px solid var(--b)' }}>RA</div>
          <button className="btn">Upload</button>
        </div>
      </SettingRow>
      <SettingRow label="Full name">
        <div className="field" style={{ width: 360 }}><input defaultValue="Rian Adityawan" /></div>
      </SettingRow>
      <SettingRow label="Email" hint="Sign-in email · admin">
        <div className="field" style={{ width: 360 }}><input defaultValue="rian@arka.id" /></div>
      </SettingRow>
      <SettingRow label="Arka ID" hint="Unique identifier in this workspace.">
        <span className="mono-num" style={{ fontSize: 12, color: 'var(--t2)' }}>RA-2024-04821</span>
      </SettingRow>
    </div>
  );
}

function MembersSection() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Members & roles</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{members.length} members · 4 active roles</div>
        </div>
        <button className="btn btn-primary"><Icon.Plus /> Invite member</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr><th>Member</th><th>Role</th><th>Last active</th><th>Status</th><th style={{ width: 40 }}></th></tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.email}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', border: '1px solid var(--b)' }}>{m.initials}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="field" style={{ display: 'inline-flex', minWidth: 110, padding: '4px 8px' }}>
                    <span style={{ flex: 1, fontSize: 11 }}>{m.role}</span>
                    <Icon.Chevron />
                  </div>
                </td>
                <td><span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--font-mono)' }}>{m.last}</span></td>
                <td>
                  <Badge level={m.status === 'online' ? 'low' : m.status === 'away' ? 'med' : 'neutral'}>{m.status}</Badge>
                </td>
                <td><button className="topbar-action" style={{ width: 24, height: 24 }}><Icon.More /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Custom roles</div>
        <div className="row row-3">
          {[
            { name: 'Admin', perms: 'All permissions', count: 1 },
            { name: 'Analyst', perms: 'View · export · analyze', count: 1 },
            { name: 'CSM Lead', perms: 'View customers · send messages', count: 1 },
            { name: 'Viewer', perms: 'Read-only', count: 1 },
          ].map(r => (
            <div key={r.name} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 2 }}></span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{r.count} member</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>{r.perms}</div>
              <button className="btn btn-sm btn-ghost">Edit role →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  const items = [
    { name: 'Stripe', desc: 'Sync billing, MRR, plan changes', on: true },
    { name: 'HubSpot', desc: 'Pull contacts and NPS scores', on: true },
    { name: 'Mixpanel', desc: 'Product usage events', on: true },
    { name: 'Zendesk', desc: 'Support tickets and CSAT', on: true },
    { name: 'Salesforce', desc: 'CRM sync', on: false },
    { name: 'Slack', desc: 'Deliver alerts and reports', on: false },
  ];
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Integrations</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Connect external sources and destinations</div>
      </div>
      <div className="row row-2">
        {items.map(i => (
          <div key={i.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{i.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{i.name}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>{i.desc}</div>
            </div>
            <Toggle on={i.on} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingSection() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Billing & plan</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Current plan, usage, invoices</div>
      </div>

      <div className="card" style={{ marginBottom: 16, border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)', background: 'var(--accent-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current plan</div>
            <div style={{ fontSize: 24, fontWeight: 500, marginTop: 6, letterSpacing: '-0.02em' }}>Growth · Annual</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 6 }}>$480/mo · billed annually · renews Mar 12, 2025</div>
          </div>
          <button className="btn" style={{ marginLeft: 'auto' }}>Upgrade to Enterprise</button>
        </div>
        <div className="hr"></div>
        <div className="row row-3">
          <div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Customers</div>
            <div className="mono-num" style={{ fontSize: 18, marginTop: 4 }}>6,380 / 10,000</div>
            <div className="bar thin" style={{ marginTop: 6 }}><div className="bar-fill" style={{ width: '63.8%' }}></div></div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Storage</div>
            <div className="mono-num" style={{ fontSize: 18, marginTop: 4 }}>84 MB / 5 GB</div>
            <div className="bar thin" style={{ marginTop: 6 }}><div className="bar-fill" style={{ width: '1.6%' }}></div></div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Members</div>
            <div className="mono-num" style={{ fontSize: 18, marginTop: 4 }}>5 / 25</div>
            <div className="bar thin" style={{ marginTop: 6 }}><div className="bar-fill" style={{ width: '20%' }}></div></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b)' }}>
          <div className="card-title">Recent invoices</div>
        </div>
        <table className="table">
          <thead><tr><th>Date</th><th>Invoice</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[
              { d: 'Mar 12, 2024', n: 'INV-2024-0312', amt: '$5,760', st: 'paid' },
              { d: 'Mar 12, 2023', n: 'INV-2023-0312', amt: '$4,200', st: 'paid' },
              { d: 'Mar 12, 2022', n: 'INV-2022-0312', amt: '$3,600', st: 'paid' },
            ].map(r => (
              <tr key={r.n}>
                <td className="mono-num">{r.d}</td>
                <td className="mono-num">{r.n}</td>
                <td className="mono-num">{r.amt}</td>
                <td><Badge level="low">{r.st}</Badge></td>
                <td><button className="btn btn-sm btn-ghost"><Icon.Download /> PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Security</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Authentication and session controls</div>
      </div>
      <SettingRow label="Two-factor authentication" hint="Require a second factor for sign-in.">
        <Toggle on={true} />
      </SettingRow>
      <SettingRow label="Session timeout" hint="Sign out idle sessions automatically.">
        <div className="field" style={{ width: 200 }}><input defaultValue="30 minutes" /><Icon.Chevron /></div>
      </SettingRow>
      <SettingRow label="SSO (SAML)" hint="Enterprise plans only.">
        <Toggle on={false} disabled />
      </SettingRow>
      <SettingRow label="Audit log" hint="All workspace actions are recorded.">
        <button className="btn">View log →</button>
      </SettingRow>
    </div>
  );
}

function ApiSection() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>API & webhooks</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Programmatic access to your workspace</div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <div className="card-title">API key</div>
            <div className="card-sub">Used by your applications to call the Arka API</div>
          </div>
          <button className="btn btn-sm">Regenerate</button>
        </div>
        <div className="field" style={{ background: 'var(--bg2)' }}>
          <span className="mono-num" style={{ fontSize: 12, color: 'var(--t2)' }}>ark_live_7f3a••••••••••••••••••••••8d2c</span>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>Copy</button>
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Webhooks</div>
            <div className="card-sub">Receive event notifications</div>
          </div>
          <button className="btn btn-sm"><Icon.Plus /> Endpoint</button>
        </div>
        <table className="table">
          <thead><tr><th>URL</th><th>Events</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[
              { url: 'https://api.acme.cloud/arka/hook', ev: '4 events', st: 'active' },
              { url: 'https://hooks.slack.com/services/T0…', ev: 'alerts.high', st: 'active' },
            ].map(r => (
              <tr key={r.url}>
                <td className="mono-num" style={{ fontSize: 11, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</td>
                <td>{r.ev}</td>
                <td><Badge level="low">{r.st}</Badge></td>
                <td><button className="topbar-action" style={{ width: 24, height: 24 }}><Icon.More /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toggle({ on, disabled }) {
  const [v, setV] = React.useState(on);
  return (
    <button
      onClick={() => !disabled && setV(x => !x)}
      style={{
        width: 36, height: 20,
        borderRadius: 999,
        background: v ? 'var(--accent)' : 'var(--bg3)',
        border: '1px solid var(--b)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background .15s'
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: v ? 18 : 2,
        width: 14, height: 14,
        borderRadius: '50%',
        background: v ? 'var(--inv)' : 'var(--t)',
        transition: 'left .15s'
      }}></span>
    </button>
  );
}

window.SettingsPage = SettingsPage;

})();
