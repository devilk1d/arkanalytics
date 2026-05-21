/* global React, window */
(function() {
const { Icon, PageHead, KPI, AreaChart, DonutChart, useApp } = window;

// Mock data
const overviewSparkChurn = [12.4, 11.8, 11.2, 11.8, 10.4, 9.9, 9.3, 8.8, 9.1, 8.4, 7.9, 7.5];
const overviewSparkCust  = [4810, 4920, 5040, 5210, 5380, 5602, 5780, 5910, 6020, 6184, 6240, 6380];
const overviewSparkSafe  = [4100, 4220, 4350, 4520, 4640, 4810, 4950, 5040, 5140, 5260, 5320, 5410];
const overviewSparkPred  = [410, 430, 440, 425, 410, 396, 384, 376, 372, 368, 360, 354];

const trend = [
  { label: 'JAN', value: 11.4 }, { label: 'FEB', value: 10.8 }, { label: 'MAR', value: 9.6 },
  { label: 'APR', value: 9.1 }, { label: 'MAY', value: 8.8 }, { label: 'JUN', value: 8.2 },
  { label: 'JUL', value: 7.9 }, { label: 'AUG', value: 7.4 }, { label: 'SEP', value: 7.1 },
  { label: 'OCT', value: 6.8 }, { label: 'NOV', value: 6.5 }, { label: 'DEC', value: 6.2 },
];

const flow = [
  { label: 'WK 1', value: 240 }, { label: 'WK 2', value: 318 }, { label: 'WK 3', value: 290 },
  { label: 'WK 4', value: 412 }, { label: 'WK 5', value: 380 }, { label: 'WK 6', value: 468 },
  { label: 'WK 7', value: 502 }, { label: 'WK 8', value: 540 }, { label: 'WK 9', value: 528 },
  { label: 'WK 10', value: 612 }, { label: 'WK 11', value: 660 }, { label: 'WK 12', value: 704 },
];

const segments = [
  { name: 'Power Users', size: 1842, share: 28.9, color: 'var(--c1)', delta: '+4.2%' },
  { name: 'Steady Adopters', size: 2104, share: 33.0, color: 'var(--c3)', delta: '+1.8%' },
  { name: 'At-Risk Loyalists', size: 968, share: 15.2, color: 'var(--c2)', delta: '−0.6%' },
  { name: 'Discount Dependents', size: 712, share: 11.2, color: 'var(--c4)', delta: '−2.1%' },
  { name: 'Disengaged', size: 754, share: 11.7, color: 'var(--c5)', delta: '+0.4%' },
];

const alerts = [
  { level: 'high', title: '354 customers flagged as high churn risk', meta: 'Predictive model · 02:14 ago' },
  { level: 'med', title: 'NPS dropped 4pts in Enterprise tier this week', meta: 'Survey · 06:32 ago' },
  { level: 'low', title: 'Data sync completed for 12 sources', meta: 'Auto-refresh · 11:08 ago' },
  { level: 'low', title: 'Q3 retention report scheduled for Friday', meta: 'Reports · yesterday' },
];

const actions = [
  { label: 'Review at-risk customers', meta: '354 flagged', route: 'analytics' },
  { label: 'Explore new segment cluster', meta: 'Cluster #6 detected', route: 'segmentation' },
  { label: 'Upload new dataset', meta: '3 sources pending', route: 'data' },
  { label: 'Schedule weekly report', meta: 'Next: Fri 9:00', route: 'reports' },
];

function OverviewPage() {
  const { setRoute } = useApp();
  return (
    <div className="page fade-in">
      <PageHead
        eyebrow="Workspace · Acme Cloud"
        title="Customer Overview"
        sub="A snapshot of customer health, retention performance, and churn signals across your latest prediction run."
        actions={<>
          <button className="btn"><Icon.Download /> Export</button>
          <button className="btn btn-primary"><Icon.Plus /> New analysis</button>
        </>}
      />

      {/* KPIs */}
      <div className="row row-4" style={{ marginBottom: 16 }}>
        <KPI label="Total customers" value="6,380" delta="+3.2%" deltaDir="up" sub="vs. prev. 30d" spark={overviewSparkCust} />
        <KPI label="Safe customers" value="5,410" delta="+1.7%" deltaDir="up" sub="84.8% retention" spark={overviewSparkSafe} />
        <KPI label="Churn risk rate" value="7.9%" delta="−1.4 pts" deltaDir="up" sub="below 10% threshold" spark={overviewSparkChurn} sparkColor="var(--danger)" />
        <KPI label="Predicted churn" value="354" delta="−12" deltaDir="up" sub="customers this cycle" spark={overviewSparkPred} sparkColor="var(--warn)" />
      </div>

      {/* Main grid */}
      <div className="row row-12">
        {/* Left col */}
        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Churn rate trajectory</div>
                <div className="card-sub">12 months · monthly aggregate</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className="chip on">Churn</span>
                <span className="chip">Retention</span>
                <span className="chip">Net</span>
              </div>
            </div>
            <AreaChart data={trend} height={220} />
            <div className="hr"></div>
            <div style={{ display: 'flex', gap: 24, fontSize: 11, color: 'var(--t3)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avg</div>
                <div style={{ fontSize: 16, color: 'var(--t)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>8.6%</div>
              </div>
              <div className="v"></div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Best</div>
                <div style={{ fontSize: 16, color: 'var(--t)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>6.2% · Dec</div>
              </div>
              <div className="v"></div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trend</div>
                <div style={{ fontSize: 16, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>−5.2 pts</div>
              </div>
              <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', fontSize: 11 }}>Last updated 11 min ago</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Customer flow</div>
                <div className="card-sub">New vs. churned · last 12 weeks</div>
              </div>
              <button className="btn btn-sm btn-ghost">View weekly →</button>
            </div>
            <AreaChart data={flow} height={200} color="var(--info)" />
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Customer segments</div>
                <div className="card-sub">Behavioral cohorts · latest prediction</div>
              </div>
              <button className="btn btn-sm" onClick={() => setRoute('segmentation')}>
                Open segmentation <Icon.ChevronR />
              </button>
            </div>
            <div className="row row-3" style={{ gap: 12 }}>
              {segments.slice(0, 3).map((s, i) => (
                <div key={i} style={{ border: '1px solid var(--b)', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }}></span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</span>
                  </div>
                  <div className="mono-num" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>{s.size.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {s.share}% · {s.delta} cycle
                  </div>
                  <div className="bar thin" style={{ marginTop: 10 }}>
                    <div className="bar-fill" style={{ width: `${s.share * 3}%`, background: s.color }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="row row-2" style={{ gap: 12, marginTop: 12 }}>
              {segments.slice(3).map((s, i) => (
                <div key={i} style={{ border: '1px solid var(--b)', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }}></span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</span>
                  </div>
                  <div className="mono-num" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>{s.size.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {s.share}% · {s.delta} cycle
                  </div>
                  <div className="bar thin" style={{ marginTop: 10 }}>
                    <div className="bar-fill" style={{ width: `${s.share * 3}%`, background: s.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Risk distribution</div>
                <div className="card-sub">By customer count</div>
              </div>
            </div>
            <DonutChart
              data={[
                { label: 'Low risk', value: 5410, color: 'var(--accent)' },
                { label: 'Medium risk', value: 616, color: 'var(--warn)' },
                { label: 'High risk', value: 354, color: 'var(--danger)' },
              ]}
              label="CUSTOMERS"
            />
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Signals & alerts</div>
                <div className="card-sub">Last 24 hours</div>
              </div>
              <button className="btn btn-sm btn-ghost">All</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < alerts.length-1 ? '1px solid var(--b)' : 'none' }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: a.level === 'high' ? 'var(--danger)' : a.level === 'med' ? 'var(--warn)' : 'var(--accent)'
                  }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--t)', lineHeight: 1.4 }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{a.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Quick actions</div>
                <div className="card-sub">Suggested next steps</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {actions.map((a, i) => (
                <button key={i} onClick={() => setRoute(a.route)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px', border: '1px solid var(--b)', borderRadius: 6,
                  textAlign: 'left', transition: 'background .12s, border-color .12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg1)'; e.currentTarget.style.borderColor = 'var(--b2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--b)'; }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--t)', marginBottom: 2 }}>{a.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{a.meta}</div>
                  </div>
                  <Icon.ChevronR style={{ color: 'var(--t3)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.OverviewPage = OverviewPage;

})();
