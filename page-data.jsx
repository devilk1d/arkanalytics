/* global React, window */
(function () {
  const { Icon, PageHead, Badge, KPI } = window;

  const datasets = [
    { id: 'DS-oct-2024', name: 'oct-2024.csv', rows: 6380, size: '4.2 MB', status: 'active', uploaded: '2 hours ago', by: 'Rian A.', cols: 24 },
    { id: 'DS-sep-2024', name: 'sep-2024.csv', rows: 6204, size: '4.0 MB', status: 'archived', uploaded: '1 month ago', by: 'Rian A.', cols: 24 },
    { id: 'DS-enterprise', name: 'enterprise-q3.csv', rows: 480, size: '420 KB', status: 'active', uploaded: '6 days ago', by: 'Maharani P.', cols: 18 },
    { id: 'DS-churn-train', name: 'churn-train-v3.parquet', rows: 14200, size: '8.6 MB', status: 'training', uploaded: '4 days ago', by: 'System', cols: 36 },
    { id: 'DS-billing', name: 'billing-export-2024.csv', rows: 6380, size: '2.1 MB', status: 'syncing', uploaded: '12 min ago', by: 'Auto-sync', cols: 12 },
    { id: 'DS-tickets', name: 'support-tickets.csv', rows: 1842, size: '980 KB', status: 'active', uploaded: '3 days ago', by: 'Wira S.', cols: 14 },
  ];

  const sources = [
    { name: 'Stripe', status: 'connected', last: '5 min ago', records: '6,380', icon: 'S' },
    { name: 'HubSpot', status: 'connected', last: '12 min ago', records: '4,210', icon: 'H' },
    { name: 'Postgres DB', status: 'connected', last: '2 min ago', records: '14,200', icon: 'P' },
    { name: 'Mixpanel', status: 'syncing', last: 'syncing…', records: '—', icon: 'M' },
    { name: 'Zendesk', status: 'error', last: '4 hours ago', records: '1,842', icon: 'Z' },
    { name: 'Salesforce', status: 'disconnected', last: 'never', records: '—', icon: 'SF' },
  ];

  const statusColor = (s) => ({
    active: 'low', archived: 'neutral', training: 'med', syncing: 'med',
    connected: 'low', error: 'high', disconnected: 'neutral'
  }[s]);

  function DataPage() {
    const [tab, setTab] = React.useState('datasets');
    const [dragging, setDragging] = React.useState(false);

    return (
      <div className="page fade-in">
        <PageHead
          eyebrow="Workspace · Sources"
          title="Data Management"
          sub="Upload datasets, connect sources, and manage the data feeding your churn models."
          actions={<>
            <button className="btn"><Icon.Download /> Schema</button>
            <button className="btn btn-primary"><Icon.Upload /> Upload dataset</button>
          </>}
        />

        <div className="row row-4" style={{ marginBottom: 16 }}>
          <KPI label="Total datasets" value="14" sub="6 active · 8 archived" />
          <KPI label="Total rows" value="42,608" sub="across all sources" />
          <KPI label="Connected sources" value="4 / 6" sub="2 require attention" />
          <KPI label="Storage used" value="84 MB" sub="of 5 GB plan" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--b)', marginBottom: 20 }}>
          {[
            { id: 'datasets', label: 'Datasets', count: 14 },
            { id: 'sources', label: 'Connections', count: 6 },
            { id: 'schema', label: 'Schema', count: null },
            { id: 'sync', label: 'Sync history', count: 248 },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 16px',
                borderBottom: tab === t.id ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                color: tab === t.id ? 'var(--t)' : 'var(--t3)',
                fontSize: 13, fontWeight: 500,
                marginBottom: -1,
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              {t.label}
              {t.count != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)' }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === 'datasets' && (
          <>
            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); }}
              style={{
                padding: '32px',
                border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--b2)'}`,
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: 16,
                background: dragging ? 'var(--accent-bg)' : 'transparent',
                transition: 'border-color .15s, background .15s'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, border: '1px solid var(--b)', borderRadius: 10, marginBottom: 12 }}>
                <Icon.Upload />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Drop CSV, Parquet, or JSON here</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                or click to browse · max 500MB per file · UTF-8 encoding
              </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--b)' }}>
                <div>
                  <div className="card-title">Datasets</div>
                  <div className="card-sub">{datasets.length} files in workspace</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <div className="field" style={{ minWidth: 200 }}>
                    <Icon.Search />
                    <input placeholder="Search datasets…" />
                  </div>
                  <button className="btn btn-sm"><Icon.Filter /></button>
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Rows</th>
                    <th>Columns</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th>By</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, border: '1px solid var(--b)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
                            <Icon.Doc />
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 12 }}>{d.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{d.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono-num">{d.rows.toLocaleString()}</td>
                      <td className="mono-num">{d.cols}</td>
                      <td className="mono-num">{d.size}</td>
                      <td><Badge level={statusColor(d.status)}>{d.status}</Badge></td>
                      <td><span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--font-mono)' }}>{d.uploaded}</span></td>
                      <td><span style={{ fontSize: 11, color: 'var(--t2)' }}>{d.by}</span></td>
                      <td><button className="topbar-action" style={{ width: 24, height: 24 }}><Icon.More /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'sources' && (
          <div className="row row-3">
            {sources.map(s => (
              <div key={s.name} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'var(--bg2)', border: '1px solid var(--b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600
                  }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                      <Badge level={statusColor(s.status)}>{s.status}</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                      {s.records} records · {s.last}
                    </div>
                  </div>
                </div>
                <div className="hr"></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {s.status === 'connected' && <button className="btn btn-sm" style={{ flex: 1 }}>Sync now</button>}
                  {s.status === 'connected' && <button className="btn btn-sm btn-ghost">Configure</button>}
                  {s.status === 'syncing' && <button className="btn btn-sm" style={{ flex: 1 }} disabled>In progress…</button>}
                  {s.status === 'error' && <button className="btn btn-sm" style={{ flex: 1, color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' }}>Retry</button>}
                  {s.status === 'disconnected' && <button className="btn btn-sm btn-primary" style={{ flex: 1 }}>Connect</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'schema' && (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Customer schema · 24 columns</div>
                <div className="card-sub">Mapped fields used by the churn model</div>
              </div>
              <button className="btn btn-sm"><Icon.Plus /> Add column</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Column</th><th>Type</th><th>Source</th><th>Nulls</th><th>Used by model</th><th></th>
                </tr>
              </thead>
              <tbody>
                {[
                  { col: 'customer_id', type: 'string', src: 'Stripe', nulls: 0, used: false },
                  { col: 'mrr', type: 'numeric', src: 'Stripe', nulls: 0, used: true },
                  { col: 'plan_type', type: 'enum', src: 'Stripe', nulls: 0, used: true },
                  { col: 'usage_hrs', type: 'numeric', src: 'Mixpanel', nulls: 12, used: true },
                  { col: 'logins_30d', type: 'numeric', src: 'Mixpanel', nulls: 0, used: true },
                  { col: 'support_tix', type: 'numeric', src: 'Zendesk', nulls: 4, used: true },
                  { col: 'nps_score', type: 'numeric', src: 'HubSpot', nulls: 248, used: true },
                  { col: 'contract_type', type: 'enum', src: 'Stripe', nulls: 0, used: true },
                ].map(r => (
                  <tr key={r.col}>
                    <td className="mono-num" style={{ fontWeight: 500 }}>{r.col}</td>
                    <td><span className="badge neutral">{r.type}</span></td>
                    <td><span style={{ fontSize: 11, color: 'var(--t2)' }}>{r.src}</span></td>
                    <td className="mono-num" style={{ color: r.nulls > 50 ? 'var(--warn)' : 'var(--t2)' }}>{r.nulls}</td>
                    <td>{r.used ? <Icon.Check style={{ color: 'var(--accent)' }} /> : <span className="dim">—</span>}</td>
                    <td><button className="topbar-action" style={{ width: 24, height: 24 }}><Icon.More /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'sync' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Time</th><th>Source</th><th>Operation</th><th>Rows</th><th>Duration</th><th>Status</th></tr>
              </thead>
              <tbody>
                {[
                  { t: '14:42:01', src: 'Stripe', op: 'incremental', rows: 12, dur: '0.8s', st: 'active' },
                  { t: '14:32:08', src: 'Postgres DB', op: 'full', rows: 14200, dur: '24.1s', st: 'active' },
                  { t: '14:30:52', src: 'Mixpanel', op: 'incremental', rows: 0, dur: '—', st: 'syncing' },
                  { t: '14:18:22', src: 'HubSpot', op: 'incremental', rows: 84, dur: '2.1s', st: 'active' },
                  { t: '10:14:08', src: 'Zendesk', op: 'incremental', rows: 0, dur: '12.0s', st: 'error' },
                  { t: '09:00:00', src: 'Stripe', op: 'full', rows: 6380, dur: '18.4s', st: 'active' },
                ].map((r, i) => (
                  <tr key={i}>
                    <td className="mono-num">{r.t}</td>
                    <td>{r.src}</td>
                    <td><span className="badge neutral">{r.op}</span></td>
                    <td className="mono-num">{r.rows.toLocaleString()}</td>
                    <td className="mono-num">{r.dur}</td>
                    <td><Badge level={statusColor(r.st)}>{r.st === 'active' ? 'success' : r.st}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  window.DataPage = DataPage;

})();
