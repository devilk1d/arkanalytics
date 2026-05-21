/* global React, window */
(function() {
const { Icon, PageHead, KPI, ScatterChart, StackedBar } = window;

const segs = [
  {
    id: 'power-users', name: 'Power Users', size: 1842, share: 28.9, color: 'var(--c1)',
    avgMrr: 4820, avgUsage: 184, churn: 0.08, delta: '+4.2%',
    desc: 'High-value, high-engagement customers driving 62% of revenue.',
    traits: ['Daily active', 'Annual contracts', 'Multi-seat'],
  },
  {
    id: 'steady', name: 'Steady Adopters', size: 2104, share: 33.0, color: 'var(--c3)',
    avgMrr: 1840, avgUsage: 76, churn: 0.21, delta: '+1.8%',
    desc: 'Stable mid-tier customers with consistent monthly usage patterns.',
    traits: ['Weekly active', 'Mixed contracts', 'Single product'],
  },
  {
    id: 'at-risk', name: 'At-Risk Loyalists', size: 968, share: 15.2, color: 'var(--c2)',
    avgMrr: 3640, avgUsage: 48, churn: 0.64, delta: '−0.6%',
    desc: 'Long-tenure customers showing recent usage and engagement decline.',
    traits: ['Declining usage', 'Older contracts', 'Support spike'],
  },
  {
    id: 'discount', name: 'Discount Dependents', size: 712, share: 11.2, color: 'var(--c4)',
    avgMrr: 320, avgUsage: 38, churn: 0.42, delta: '−2.1%',
    desc: 'Price-sensitive cohort acquired through promotions.',
    traits: ['Starter plans', 'Promo-driven', 'Single contract'],
  },
  {
    id: 'disengaged', name: 'Disengaged', size: 754, share: 11.7, color: 'var(--c5)',
    avgMrr: 980, avgUsage: 14, churn: 0.78, delta: '+0.4%',
    desc: 'Low usage with high probability of imminent churn.',
    traits: ['Inactive >14d', 'No logins', 'Open tickets'],
  },
];

// scatter clusters (synthetic)
const clusters = segs.map((s, ci) => ({
  label: s.name,
  color: s.color,
  points: Array.from({ length: 28 + ci * 4 }, () => {
    const cx = [0.85, 0.55, 0.4, 0.25, 0.15][ci];
    const cy = [0.15, 0.35, 0.7, 0.5, 0.85][ci];
    return [
      Math.max(0.02, Math.min(0.98, cx + (Math.random() - 0.5) * 0.18)),
      Math.max(0.02, Math.min(0.98, cy + (Math.random() - 0.5) * 0.22)),
    ];
  }),
}));

function SegmentationPage() {
  const [activeSeg, setActiveSeg] = React.useState('power-users');
  const active = segs.find(s => s.id === activeSeg);

  return (
    <div className="page fade-in">
      <PageHead
        eyebrow="Insights · Behavioral cohorts"
        title="Segmentation"
        sub="Behavior-based customer cohorts derived from usage, billing, and engagement features."
        actions={<>
          <button className="btn"><Icon.Sparkle /> Recompute clusters</button>
          <button className="btn btn-primary"><Icon.Plus /> New segment</button>
        </>}
      />

      {/* Top KPIs */}
      <div className="row row-4" style={{ marginBottom: 16 }}>
        <KPI label="Active segments" value="5" sub="auto + manual" />
        <KPI label="Coverage" value="100%" sub="6,380 of 6,380" />
        <KPI label="Silhouette score" value="0.74" delta="+0.04" deltaDir="up" sub="kmeans k=5" />
        <KPI label="Last computed" value="2h" sub="ago · auto" />
      </div>

      <div className="row row-12" style={{ marginBottom: 16 }}>
        {/* Scatter + composition */}
        <div className="col-8">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Cluster map</div>
                <div className="card-sub">Usage (x) × Churn probability (y) · projection</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {segs.map(s => (
                  <span key={s.id} className="chip" style={{ paddingLeft: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, marginRight: 2 }}></span>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
            <ScatterChart clusters={clusters} height={340} />
            <div className="hr"></div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Composition · share of customer base
              </div>
              <StackedBar data={segs.map(s => ({ label: s.name, value: s.size, color: s.color }))} height={16} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                <span>0</span>
                <span>{segs.reduce((s, x) => s + x.size, 0).toLocaleString()} customers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active segment detail */}
        <div className="col-4">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-head">
              <div>
                <div className="card-title">{active.name}</div>
                <div className="card-sub">{active.size.toLocaleString()} customers · {active.share}%</div>
              </div>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: active.color, flexShrink: 0 }}></span>
            </div>

            <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.55, marginBottom: 16 }}>{active.desc}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, border: '1px solid var(--b)', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Avg MRR</div>
                <div className="mono-num" style={{ fontSize: 18, marginTop: 4 }}>${active.avgMrr.toLocaleString()}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid var(--b)', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Avg usage</div>
                <div className="mono-num" style={{ fontSize: 18, marginTop: 4 }}>{active.avgUsage}h</div>
              </div>
              <div style={{ padding: 12, border: '1px solid var(--b)', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Churn rate</div>
                <div className="mono-num" style={{ fontSize: 18, marginTop: 4 }}>{(active.churn * 100).toFixed(0)}%</div>
              </div>
              <div style={{ padding: 12, border: '1px solid var(--b)', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Δ this cycle</div>
                <div className="mono-num" style={{ fontSize: 18, marginTop: 4, color: active.delta.startsWith('+') ? 'var(--accent)' : 'var(--danger)' }}>{active.delta}</div>
              </div>
            </div>

            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Defining traits</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {active.traits.map(t => <span key={t} className="chip">{t}</span>)}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }}><Icon.Users /> View customers</button>
              <button className="btn btn-primary" style={{ flex: 1 }}><Icon.Send /> Campaign</button>
            </div>
          </div>
        </div>
      </div>

      {/* All segments grid */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">All segments</div>
            <div className="card-sub">Click to inspect</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm">Sort by size</button>
            <button className="btn btn-sm btn-ghost">Compare</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {segs.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSeg(s.id)}
              style={{
                textAlign: 'left', padding: 14,
                border: `1px solid ${s.id === activeSeg ? 'var(--b3)' : 'var(--b)'}`,
                background: s.id === activeSeg ? 'var(--bg1)' : 'transparent',
                borderRadius: 8,
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'border-color .12s, background .12s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }}></span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</span>
              </div>
              <div className="mono-num" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>{s.size.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                {s.share}% · churn {(s.churn*100).toFixed(0)}%
              </div>
              <div className="bar thin"><div className="bar-fill" style={{ width: `${s.share*3}%`, background: s.color }}></div></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.SegmentationPage = SegmentationPage;

})();
