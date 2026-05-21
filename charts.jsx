/* global React */
(function() {

// ─── Line/Area chart ──────────────────────────────────────────────
function AreaChart({ data, height = 220, color = "var(--accent)", showAxis = true, smooth = true }) {
  // data = [{ label, value }]
  const w = 700;
  const pad = { l: 40, r: 16, t: 12, b: 28 };
  const max = Math.max(...data.map(d => d.value));
  const min = 0;
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const step = innerW / (data.length - 1);

  const pts = data.map((d, i) => [
    pad.l + i * step,
    pad.t + innerH - ((d.value - min) / (max - min || 1)) * innerH
  ]);

  const path = smooth
    ? pts.map((p, i) => {
        if (i === 0) return `M${p[0]},${p[1]}`;
        const prev = pts[i-1];
        const cx = (prev[0] + p[0]) / 2;
        return `C${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
      }).join(' ')
    : pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');

  const areaPath = `${path} L${pts[pts.length-1][0]},${pad.t + innerH} L${pts[0][0]},${pad.t + innerH} Z`;

  // gridlines
  const grids = [0, 0.25, 0.5, 0.75, 1].map(t => pad.t + innerH - t * innerH);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      {/* grid */}
      {grids.map((y, i) => (
        <line key={i} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--b)" strokeDasharray={i === grids.length-1 ? "" : "2 4"} />
      ))}
      {/* y labels */}
      {showAxis && [0, 0.5, 1].map((t, i) => (
        <text key={i} x={pad.l - 8} y={pad.t + innerH - t * innerH + 3} fontSize="9" fill="var(--t4)" textAnchor="end" fontFamily="var(--font-mono)">
          {Math.round(min + t * (max - min))}
        </text>
      ))}
      {/* area */}
      <path d={areaPath} fill={color} opacity="0.08" />
      {/* line */}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      {/* points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2" fill="var(--bg)" stroke={color} strokeWidth="1.25" />
      ))}
      {/* x labels */}
      {showAxis && data.map((d, i) => i % Math.max(1, Math.floor(data.length/8)) === 0 && (
        <text key={i} x={pad.l + i * step} y={height - 8} fontSize="9" fill="var(--t4)" textAnchor="middle" fontFamily="var(--font-mono)">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────
function BarChart({ data, height = 220, color = "var(--accent)", horizontal = false }) {
  const w = 700;
  const pad = { l: horizontal ? 90 : 40, r: 16, t: 12, b: 28 };
  const max = Math.max(...data.map(d => d.value));
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  if (horizontal) {
    const rowH = innerH / data.length;
    const barH = Math.min(rowH - 6, 22);
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        {data.map((d, i) => {
          const y = pad.t + i * rowH + (rowH - barH) / 2;
          const bw = (d.value / max) * innerW;
          return (
            <g key={i}>
              <text x={pad.l - 8} y={y + barH/2 + 3} fontSize="10" fill="var(--t2)" textAnchor="end" fontFamily="var(--font-sans)">{d.label}</text>
              <rect x={pad.l} y={y} width={innerW} height={barH} fill="var(--bg2)" rx="2" />
              <rect x={pad.l} y={y} width={bw} height={barH} fill={d.color || color} rx="2" />
              <text x={pad.l + bw + 6} y={y + barH/2 + 3} fontSize="10" fill="var(--t2)" fontFamily="var(--font-mono)">{d.value.toLocaleString()}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  const step = innerW / data.length;
  const barW = step * 0.6;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
      {[0, 0.5, 1].map((t, i) => (
        <line key={i} x1={pad.l} x2={w-pad.r} y1={pad.t + innerH - t * innerH} y2={pad.t + innerH - t * innerH} stroke="var(--b)" strokeDasharray={t === 0 ? "" : "2 4"} />
      ))}
      {data.map((d, i) => {
        const bh = (d.value / max) * innerH;
        const x = pad.l + i * step + (step - barW) / 2;
        const y = pad.t + innerH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={d.color || color} rx="2" opacity={d.muted ? 0.4 : 1} />
            <text x={x + barW/2} y={height - 8} fontSize="9" fill="var(--t4)" textAnchor="middle" fontFamily="var(--font-mono)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────
function DonutChart({ data, size = 180, thickness = 22, label }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg2)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const gap = c - dash;
          const offset = -acc;
          acc += dash;
          return (
            <circle
              key={i}
              cx={size/2} cy={size/2} r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
            />
          );
        })}
        <text x={size/2} y={size/2 - 4} fontSize="22" fill="var(--t)" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="500">
          {total.toLocaleString()}
        </text>
        <text x={size/2} y={size/2 + 14} fontSize="10" fill="var(--t3)" textAnchor="middle" fontFamily="var(--font-mono)" letterSpacing="0.1em">
          {label || 'TOTAL'}
        </text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }}></span>
            <span style={{ color: 'var(--t2)' }}>{d.label}</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontSize: 11 }}>
              {((d.value/total)*100).toFixed(1)}%
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t)', minWidth: 40, textAlign: 'right' }}>
              {d.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scatter (cluster) ────────────────────────────────────────────
function ScatterChart({ clusters, height = 320 }) {
  // clusters = [{ label, color, points: [[x, y], ...] }]
  const w = 700;
  const pad = { l: 32, r: 16, t: 12, b: 28 };
  const innerW = w - pad.l - pad.r, innerH = height - pad.t - pad.b;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + innerH} stroke="var(--b)" />
      <line x1={pad.l} x2={w-pad.r} y1={pad.t + innerH} y2={pad.t + innerH} stroke="var(--b)" />
      {[0.25, 0.5, 0.75].map(t => (
        <g key={t}>
          <line x1={pad.l} x2={w-pad.r} y1={pad.t + innerH * t} y2={pad.t + innerH * t} stroke="var(--b)" strokeDasharray="2 4" />
          <line x1={pad.l + innerW * t} x2={pad.l + innerW * t} y1={pad.t} y2={pad.t + innerH} stroke="var(--b)" strokeDasharray="2 4" />
        </g>
      ))}
      {clusters.map((c, ci) => (
        <g key={ci}>
          {c.points.map((p, i) => (
            <circle key={i} cx={pad.l + p[0] * innerW} cy={pad.t + (1 - p[1]) * innerH} r="4" fill={c.color} opacity="0.85" />
          ))}
        </g>
      ))}
      <text x={pad.l} y={height - 8} fontSize="9" fill="var(--t4)" fontFamily="var(--font-mono)">LOW USAGE</text>
      <text x={w-pad.r} y={height - 8} fontSize="9" fill="var(--t4)" fontFamily="var(--font-mono)" textAnchor="end">HIGH USAGE</text>
      <text x={pad.l - 6} y={pad.t + 6} fontSize="9" fill="var(--t4)" fontFamily="var(--font-mono)" textAnchor="end" transform={`rotate(-90 ${pad.l - 6} ${pad.t + 6})`}>CHURN ↑</text>
    </svg>
  );
}

// ─── Stacked bar (segment composition) ────────────────────────────
function StackedBar({ data, height = 14 }) {
  // data = [{ label, value, color }]
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ display: 'flex', height, borderRadius: 4, overflow: 'hidden', background: 'var(--bg2)' }}>
      {data.map((d, i) => (
        <div key={i} style={{ width: `${(d.value/total)*100}%`, background: d.color }} title={`${d.label}: ${d.value}`} />
      ))}
    </div>
  );
}

Object.assign(window, { AreaChart, BarChart, DonutChart, ScatterChart, StackedBar });

})();
