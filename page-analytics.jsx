/* global React, window */
(function () {
  const { Icon, PageHead, Badge, KPI, BarChart } = window;

  function AnalyticsPage() {
    const [filter, setFilter] = React.useState({ risk: 'all', plan: 'all' });
    const [search, setSearch] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [pageSize] = React.useState(10);
    const [customers, setCustomers] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [kpiStats, setKpiStats] = React.useState({
      total: 0,
      highRisk: 0,
      highRiskPct: 0.0,
      avgScore: 0.0,
      modelPrecision: 0.89
    });
    const [churnDist, setChurnDist] = React.useState([]);
    const [churnDrivers, setChurnDrivers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [datasetId, setDatasetId] = React.useState('');
    const [sel, setSel] = React.useState(new Set());

    React.useEffect(() => {
      let active = true;
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        risk: filter.risk,
        plan: filter.plan,
        search: search
      });
      
      fetch(`/api/analytics-data?${queryParams.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          if (data.error) {
            console.error('API Error:', data.error);
            setLoading(false);
            return;
          }
          setCustomers(data.roster.customers);
          setTotalCount(data.roster.total);
          setKpiStats(data.kpis);
          setChurnDist(data.churnDist);
          setChurnDrivers(data.churnDrivers);
          setDatasetId(data.datasetId);
          setLoading(false);
        })
        .catch(err => {
          if (!active) return;
          console.error('Fetch Error:', err);
          setLoading(false);
        });
        
      return () => {
        active = false;
      };
    }, [filter.risk, filter.plan, search, page, pageSize]);

    const handleFilterChange = (updater) => {
      setFilter(updater);
      setPage(1);
    };

    const handleSearchChange = (e) => {
      setSearch(e.target.value);
      setPage(1);
    };

    const toggle = (id) => {
      setSel(s => {
        const n = new Set(s);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
    };

    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    
    const getPageNumbers = () => {
      const current = page;
      const total = totalPages;
      if (total <= 5) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }
      
      const pages = [];
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
      return pages;
    };

    return (
      <div className="page fade-in">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinner-active {
            animation: spin 0.8s linear infinite;
          }
        ` }} />
        
        <PageHead
          eyebrow="Insights · Churn analytics"
          title="Customer Analytics"
          sub="Inspect individual churn predictions, segment membership, and behavior — then take action."
          actions={<>
            <button className="btn"><Icon.Filter /> Filters</button>
            <button className="btn"><Icon.Download /> Export</button>
            <button className="btn btn-primary"><Icon.Sparkle /> Analyze customer</button>
          </>}
        />

        <div className="row row-4" style={{ marginBottom: 16 }}>
          <KPI 
            label="Customers analyzed" 
            value={loading ? '...' : kpiStats.total.toLocaleString()} 
            sub={loading ? 'Loading...' : `Dataset: ${datasetId.substring(0, 8)}...`} 
          />
          <KPI 
            label="High risk" 
            value={loading ? '...' : kpiStats.highRisk.toLocaleString()} 
            delta="−12" 
            deltaDir="up" 
            sub={loading ? 'Loading...' : `${kpiStats.highRiskPct.toFixed(1)}% of base`} 
          />
          <KPI 
            label="Avg churn score" 
            value={loading ? '...' : kpiStats.avgScore.toFixed(3)} 
            delta="−0.03" 
            deltaDir="up" 
            sub="model v2.4.1" 
          />
          <KPI 
            label="Model precision" 
            value={loading ? '...' : kpiStats.modelPrecision.toFixed(2)} 
            delta="+0.02" 
            deltaDir="up" 
            sub="last validation" 
          />
        </div>

        <div className="row row-12" style={{ marginBottom: 16 }}>
          <div className="col-7">
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Churn score distribution</div>
                  <div className="card-sub">Probability bins · all customers</div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 2, background: 'var(--accent)' }}></span>Low</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 2, background: 'var(--warn)' }}></span>Med</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 2, background: 'var(--danger)' }}></span>High</span>
                </div>
              </div>
              {loading ? (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: 12 }}>
                  Loading distribution...
                </div>
              ) : (
                <BarChart data={churnDist} height={240} />
              )}
            </div>
          </div>
          <div className="col-5">
            <div className="card" style={{ height: '100%' }}>
              <div className="card-head">
                <div>
                  <div className="card-title">Top churn drivers</div>
                  <div className="card-sub">Feature importance · SHAP</div>
                </div>
              </div>
              {loading ? (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: 12 }}>
                  Loading drivers...
                </div>
              ) : (
                <BarChart
                  horizontal
                  data={churnDrivers}
                  height={240}
                />
              )}
            </div>
          </div>
        </div>

        {/* Customer table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--b)' }}>
            <div>
              <div className="card-title">Customer roster</div>
              <div className="card-sub">
                {loading ? 'Loading...' : `${totalCount} customer${totalCount !== 1 ? 's' : ''} found`}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <div className="field" style={{ minWidth: 220 }}>
                <Icon.Search />
                <input 
                  placeholder="Search by name, ID, email…" 
                  value={search}
                  onChange={handleSearchChange}
                />
              </div>
              {['all', 'high', 'medium', 'low'].map(r => (
                <button
                  key={r}
                  className={`chip ${filter.risk === r ? 'on' : ''}`}
                  onClick={() => handleFilterChange(f => ({ ...f, risk: r }))}
                >
                  {r === 'all' ? 'All risk' : r}
                </button>
              ))}
            </div>
          </div>

          {sel.size > 0 && (
            <div style={{ padding: '10px 20px', background: 'var(--bg1)', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--b)' }}>
              <span className="mono-num" style={{ fontSize: 11, color: 'var(--t2)' }}>{sel.size} selected</span>
              <button className="btn btn-sm"><Icon.Send /> Send to chat</button>
              <button className="btn btn-sm">Add to segment</button>
              <button className="btn btn-sm">Export selection</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setSel(new Set())} style={{ marginLeft: 'auto' }}>Clear</button>
            </div>
          )}

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Customer</th>
                <th>Plan</th>
                <th>MRR</th>
                <th>Usage hrs</th>
                <th>Score</th>
                <th>Risk</th>
                <th>Segment</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <span className="spinner-active" style={{
                        width: 24, height: 24, borderRadius: '50%',
                        border: '2px solid var(--b)', borderTopColor: 'var(--accent)',
                        display: 'inline-block'
                      }}></span>
                      <span>Loading customer predictions...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>
                    No customer predictions found matching the filters.
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} style={{ accentColor: 'var(--accent)' }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, background: 'var(--bg2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--t2)',
                          border: '1px solid var(--b)'
                        }}>{c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 12 }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge level="neutral">{c.plan}</Badge>
                      <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{c.contract}</div>
                    </td>
                    <td className="mono-num">${c.mrr.toLocaleString()}</td>
                    <td className="mono-num">{c.usage}h</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="bar" style={{ width: 56, height: 4 }}>
                          <div className="bar-fill" style={{
                            width: `${c.score * 100}%`,
                            background: c.risk === 'High' ? 'var(--danger)' : c.risk === 'Medium' ? 'var(--warn)' : 'var(--accent)'
                          }}></div>
                        </div>
                        <span className="mono-num" style={{ fontSize: 11 }}>{c.score.toFixed(2)}</span>
                      </div>
                    </td>
                    <td>
                      <Badge level={c.risk === 'High' ? 'high' : c.risk === 'Medium' ? 'med' : 'low'}>{c.risk}</Badge>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--t2)' }}>{c.segment}</span>
                    </td>
                    <td>
                      <button className="topbar-action" style={{ width: 24, height: 24 }}><Icon.More /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
            <span>
              Showing {loading ? '...' : totalCount === 0 ? 0 : `${(page - 1) * pageSize + 1}–${Math.min(totalCount, page * pageSize)}`} of {loading ? '...' : totalCount}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button 
                className="btn btn-sm" 
                disabled={page === 1 || loading} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <Icon.ChevronL />
              </button>
              
              {!loading && getPageNumbers().map((p, idx) => (
                p === '...' ? (
                  <span key={idx} style={{ padding: '0 6px', alignSelf: 'center' }}>…</span>
                ) : (
                  <button
                    key={idx}
                    className="btn btn-sm"
                    style={page === p ? { background: 'var(--t)', color: 'var(--inv)', borderColor: 'var(--t)' } : {}}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              ))}
              
              <button 
                className="btn btn-sm" 
                disabled={page === totalPages || loading} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <Icon.ChevronR />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.AnalyticsPage = AnalyticsPage;

})();
