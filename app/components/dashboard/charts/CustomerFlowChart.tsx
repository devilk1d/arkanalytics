'use client';

import { useState, useEffect, memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

type Period = 'Week' | 'Month' | 'Year';

interface RangeOption {
  label: string;
  count: number | null;
}

const RANGE_OPTIONS: Record<Period, RangeOption[]> = {
  Week:  [{ label: '4W', count: 4 }, { label: '13W', count: 13 }, { label: '26W', count: 26 }, { label: 'All', count: null }],
  Month: [{ label: '3M', count: 3 }, { label: '6M', count: 6 }, { label: '12M', count: 12 }, { label: 'All', count: null }],
  Year:  [{ label: '3Y', count: 3 }, { label: '5Y', count: 5 }, { label: 'All', count: null }],
};

const DEFAULT_RANGE: Record<Period, number | null> = {
  Week: 13,
  Month: 6,
  Year: null,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2 text-[10px] shadow-2xl border border-[var(--b3)] opacity-95">
        <p className="font-bold mb-1">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: p.fill }} />
                <span className="opacity-70">{p.name}</span>
              </span>
              <span className="font-black text-[var(--inv-t)]">{Math.abs(p.value)}</span>
            </div>
          ))}
          {payload.length === 2 && (
            <div className="flex items-center justify-between gap-4 border-t border-[var(--b3)] mt-1 pt-1">
              <span className="opacity-50">Net</span>
              <span className={`font-black ${payload[0].value + payload[1].value >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {payload[0].value + payload[1].value >= 0 ? '+' : ''}{payload[0].value + payload[1].value}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const STORAGE_KEY = 'arkanalytics:customerflow_filter';

const VALID_PERIODS: Period[] = ['Week', 'Month', 'Year'];
const VALID_RANGES = new Set<number | null>([4, 13, 26, 3, 6, 12, 5, null]);

function loadFilter(): { period: Period; range: number | null; showAcquired: boolean; showChurned: boolean } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!VALID_PERIODS.includes(s.period)) return null;
    if (!VALID_RANGES.has(s.range)) return null;
    return {
      period:       s.period,
      range:        s.range,
      showAcquired: typeof s.showAcquired === 'boolean' ? s.showAcquired : true,
      showChurned:  typeof s.showChurned  === 'boolean' ? s.showChurned  : true,
    };
  } catch {
    return null;
  }
}

const CustomerFlowChart = ({ data }: { data?: any }) => {
  const [isMounted, setIsMounted] = useState(false);

  const [period, setPeriod] = useState<Period>('Month');
  const [range, setRange] = useState<number | null>(DEFAULT_RANGE['Month']);
  const [showAcquired, setShowAcquired] = useState(true);
  const [showChurned, setShowChurned] = useState(true);

  // Load persisted filter on mount, then mark as mounted
  useEffect(() => {
    const saved = loadFilter();
    if (saved) {
      setPeriod(saved.period);
      setRange(saved.range);
      setShowAcquired(saved.showAcquired);
      setShowChurned(saved.showChurned);
    }
    setIsMounted(true);
  }, []);

  // Persist filter state whenever it changes (after mount)
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ period, range, showAcquired, showChurned }));
    } catch {}
  }, [isMounted, period, range, showAcquired, showChurned]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setRange(DEFAULT_RANGE[p]);
  };

  const rawData: any[] = data && data[period.toLowerCase()] ? data[period.toLowerCase()] : [];

  const chartData = useMemo(() => {
    const sliced = range != null ? rawData.slice(-range) : rawData;
    return sliced.map((d: any) => ({
      ...d,
      churned: d.churned != null ? -Math.abs(d.churned) : 0,
    }));
  }, [rawData, range]);

  // Summary stats for the visible window
  const summary = useMemo(() => {
    const totalNew = chartData.reduce((sum: number, d: any) => sum + (d.new ?? 0), 0);
    const totalLost = chartData.reduce((sum: number, d: any) => sum + Math.abs(d.churned ?? 0), 0);
    return { totalNew, totalLost, net: totalNew - totalLost };
  }, [chartData]);

  if (!isMounted) return <div className="h-full min-h-[260px]" />;

  const rangeOptions = RANGE_OPTIONS[period];

  return (
    <div className="h-full flex flex-col">

      {/* Header + summary stats */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--t)]">Customer Flow</h3>
          <p className="text-[11px] text-[var(--t3)] mt-0.5">Acquisition vs churn per period</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] text-[var(--t3)] uppercase tracking-wider font-semibold">Net</p>
            <p className={`text-[13px] font-black font-mono ${summary.net >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {summary.net >= 0 ? '+' : ''}{summary.net.toLocaleString('en-US')}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--t3)] uppercase tracking-wider font-semibold">Acquired</p>
            <p className="text-[13px] font-black font-mono text-[#22c55e]">{summary.totalNew.toLocaleString('en-US')}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--t3)] uppercase tracking-wider font-semibold">Lost</p>
            <p className="text-[13px] font-black font-mono text-[#ef4444]">{summary.totalLost.toLocaleString('en-US')}</p>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">

        {/* Granularity */}
        <div className="flex gap-1">
          {(['Week', 'Month', 'Year'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                period === p
                  ? 'bg-[var(--t)] text-[var(--inv-t)]'
                  : 'border border-[var(--b)] text-[var(--t3)] hover:bg-[var(--bg2)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <span className="w-px h-3 bg-[var(--b2)] shrink-0" />

        {/* Range presets */}
        <div className="flex gap-1">
          {rangeOptions.map(opt => (
            <button
              key={opt.label}
              onClick={() => setRange(opt.count)}
              className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                range === opt.count
                  ? 'bg-[var(--bg3)] text-[var(--t)] border border-[var(--b2)]'
                  : 'border border-[var(--b)] text-[var(--t3)] hover:bg-[var(--bg2)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="w-px h-3 bg-[var(--b2)] shrink-0" />

        {/* Metric toggles */}
        <div className="flex gap-1">
          <button
            onClick={() => setShowAcquired(v => !v)}
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              showAcquired
                ? 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#16a34a]'
                : 'border-[var(--b)] text-[var(--t3)] opacity-50 hover:opacity-80'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-sm bg-[#22c55e]" />
            Acquired
          </button>
          <button
            onClick={() => setShowChurned(v => !v)}
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              showChurned
                ? 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#dc2626]'
                : 'border-[var(--b)] text-[var(--t3)] opacity-50 hover:opacity-80'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-sm bg-[#ef4444]" />
            Lost
          </button>
        </div>

      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[200px] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={350}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="0" stroke="var(--b)" vertical={false} opacity={0.5} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => String(Math.abs(v))}
            />
            <ReferenceLine y={0} stroke="var(--b2)" strokeWidth={1} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg2)', opacity: 0.4 }} />
            {showAcquired && (
              <Bar dataKey="new" name="New Acquisition" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={20} />
            )}
            {showChurned && (
              <Bar dataKey="churned" name="Customer Lost" fill="#ef4444" radius={[0, 0, 3, 3]} maxBarSize={20} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default memo(CustomerFlowChart);
