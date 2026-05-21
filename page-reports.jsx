/* global React, window */
(function() {
const { Icon, PageHead, Badge, KPI } = window;

const reports = [
  { id: 'RPT-241015', title: 'Q3 Customer Retention Report', type: 'Retention', period: 'Jul–Sep 2024', pages: 24, status: 'ready',     generated: 'Oct 15, 2024', by: 'Rian A.',     scheduled: false },
  { id: 'RPT-241010', title: 'Enterprise Cohort Deep Dive', type: 'Cohort',    period: 'Last 90 days', pages: 18, status: 'ready',     generated: 'Oct 10, 2024', by: 'Maharani P.', scheduled: false },
  { id: 'RPT-241007', title: 'Weekly Churn Pulse · W41',    type: 'Pulse',     period: 'Oct 7–13',      pages: 6,  status: 'ready',     generated: 'Oct 14, 2024', by: 'Auto',        scheduled: true },
  { id: 'RPT-241001', title: 'Segment Performance · Sept',  type: 'Segment',   period: 'Sept 2024',     pages: 12, status: 'ready',     generated: 'Oct 1, 2024',  by: 'Wira S.',     scheduled: false },
  { id: 'RPT-240928', title: 'Predictive Model Validation', type: 'Model',     period: 'v2.4.1',        pages: 32, status: 'ready',     generated: 'Sep 28, 2024', by: 'Auto',        scheduled: false },
  { id: 'RPT-241016', title: 'Q4 Forecast Brief (draft)',   type: 'Forecast',  period: 'Oct–Dec 2024',  pages: 8,  status: 'generating',generated: 'In progress',  by: 'Rian A.',     scheduled: false },
];

const templates = [
  { name: 'Weekly Churn Pulse', desc: 'High-risk customers, weekly delta, top movers', cadence: 'Weekly · Fri 9:00' },
  { name: 'Monthly Retention',  desc: 'Cohort retention, NRR, expansion vs. contraction', cadence: 'Monthly · 1st' },
  { name: 'Segment Snapshot',   desc: 'All segments with KPIs and trend',              cadence: 'On-demand' },
  { name: 'Quarterly Business Review', desc: 'Full retention + segments + forecast',  cadence: 'Quarterly' },
];

function ReportsPage() {
  const [view, setView] = React.useState('list');

  return (
    <div className="page fade-in">
      <PageHead
        eyebrow="Workspace · Deliverables"
        title="Reports"
        sub="Generated reports, scheduled deliveries, and templates for stakeholders."
        actions={<>
          <button className="btn"><Icon.Calendar /> Schedule</button>
          <button className="btn btn-primary"><Icon.Plus /> New report</button>
        </>}
      />

      <div className="row row-4" style={{ marginBottom: 20 }}>
        <KPI label="Reports this month" value="14" delta="+3" deltaDir="up" sub="vs. September" />
        <KPI label="Auto-delivered" value="8" sub="weekly + monthly" />
        <KPI label="Pending review" value="2" sub="awaiting your sign-off" />
        <KPI label="Avg gen. time" value="4.2s" sub="last 30 days" />
      </div>

      <div className="row row-12" style={{ marginBottom: 16, gap: 16 }}>
        {/* Left: Reports list */}
        <div className="col-8">
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--b)' }}>
              <div>
                <div className="card-title">Generated reports</div>
                <div className="card-sub">{reports.length} files · sortable</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <div style={{ display: 'flex', borderRadius: 6, border: '1px solid var(--b)', padding: 2 }}>
                  <button
                    className={view === 'list' ? '' : 'btn-ghost'}
                    onClick={() => setView('list')}
                    style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4, background: view === 'list' ? 'var(--bg2)' : 'transparent' }}
                  >List</button>
                  <button
                    className={view === 'grid' ? '' : 'btn-ghost'}
                    onClick={() => setView('grid')}
                    style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4, background: view === 'grid' ? 'var(--bg2)' : 'transparent' }}
                  >Grid</button>
                </div>
                <div className="field" style={{ minWidth: 180 }}>
                  <Icon.Search />
                  <input placeholder="Search reports…" />
                </div>
              </div>
            </div>

            {view === 'list' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Pages</th>
                    <th>Generated</th>
                    <th>Status</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 40, border: '1px solid var(--b)', borderRadius: 3, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4, fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--t3)' }}>PDF</div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {r.title}
                              {r.scheduled && <span title="Scheduled" style={{ display: 'inline-flex', color: 'var(--accent)' }}><Icon.Calendar style={{ width: 11, height: 11 }} /></span>}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{r.id} · by {r.by}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge level="neutral">{r.type}</Badge></td>
                      <td><span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--font-mono)' }}>{r.period}</span></td>
                      <td className="mono-num">{r.pages}</td>
                      <td><span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--font-mono)' }}>{r.generated}</span></td>
                      <td>
                        {r.status === 'ready' ? <Badge level="low">ready</Badge> : <Badge level="med">generating</Badge>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="topbar-action" style={{ width: 26, height: 26 }} title="Download"><Icon.Download /></button>
                          <button className="topbar-action" style={{ width: 26, height: 26 }} title="More"><Icon.More /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {view === 'grid' && (
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {reports.map(r => (
                  <div key={r.id} style={{ border: '1px solid var(--b)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ height: 100, border: '1px solid var(--b)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg1)', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        {r.status === 'ready' ? <Badge level="low">ready</Badge> : <Badge level="med">gen…</Badge>}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.1em' }}>PDF · {r.pages}p</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 12, lineHeight: 1.4 }}>{r.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{r.period} · {r.generated}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Templates + Schedule */}
        <div className="col-4">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Quick templates</div>
                <div className="card-sub">Pre-built report types</div>
              </div>
              <button className="btn btn-sm btn-ghost">All</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {templates.map((t, i) => (
                <button key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12,
                  border: '1px solid var(--b)', borderRadius: 6,
                  textAlign: 'left'
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: 'var(--accent)'
                  }}>
                    <Icon.Doc />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3, lineHeight: 1.4 }}>{t.desc}</div>
                    <div style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--font-mono)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.cadence}</div>
                  </div>
                  <Icon.ChevronR style={{ color: 'var(--t3)', flexShrink: 0, marginTop: 6 }} />
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Next scheduled</div>
                <div className="card-sub">Automatic delivery</div>
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--accent-bg)', border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon.Calendar style={{ color: 'var(--accent)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>FRI 18 OCT · 09:00</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Weekly Churn Pulse · W42</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                Delivers to <span style={{ color: 'var(--t2)' }}>3 recipients</span>
              </div>
            </div>
            <div className="hr"></div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Upcoming this week</div>
            {[
              { date: 'Mon · 21 Oct', name: 'Segment Snapshot', recipients: 5 },
              { date: 'Fri · 25 Oct', name: 'Weekly Churn Pulse · W43', recipients: 3 },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 1 ? '1px solid var(--b)' : 'none' }}>
                <div style={{ width: 40, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase' }}>{s.date.split(' · ')[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{s.date.split(' · ')[1]} · {s.recipients} recipients</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.ReportsPage = ReportsPage;

})();
