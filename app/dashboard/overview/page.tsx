import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import OverviewPage from "../../components/dashboard/pages/overview/OverviewPage";

export const metadata = { title: "Dashboard Overview" };

// ── CSV parser (unchanged) ────────────────────────────────────────────────────
function parseSimpleCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ''; continue; }
      current += char;
    }
    cols.push(current.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
    return obj;
  });
}

// ── Skeleton — renders immediately before any data is fetched ─────────────────
function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-[72px] bg-[var(--bg2)] rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[160px] bg-[var(--bg2)] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8 h-96 bg-[var(--bg2)] rounded-2xl" />
        <div className="col-span-12 xl:col-span-4 h-96 bg-[var(--bg2)] rounded-2xl" />
      </div>
    </div>
  );
}

// ── All data fetching lives here — streams in behind the skeleton ──────────────
async function OverviewLoader() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  let stats = { totalCustomers: 0, safeCustomers: 0, churnRisk: 0, predictedChurn: 0 };
  let riskDistributionData: any[] = [];
  let planDistributionData: any[] = [];
  let customerFlowData: any = [];
  let segmentData: any[] = [];
  let sparkTotalCustomers: number[] = [];
  let sparkSafeCustomers: number[] = [];
  let sparkChurnRisk: number[] = [];
  let sparkPredictedChurn: number[] = [];
  let deltas = {
    totalCustomers: { change: '', positive: true },
    safeCustomers:  { change: '', positive: true },
    churnRisk:      { change: '', positive: true },
    predictedChurn: { change: '', positive: true },
  };
  let trajectorySummary = { avg: '0%', best: '0%', trend: '0 pts' };
  let trajectoryData: { label: string; value: number }[] = [];

  if (!authData.user) {
    return (
      <OverviewPage
        stats={stats} riskData={riskDistributionData} flowData={customerFlowData}
        planData={planDistributionData} segmentData={segmentData}
        sparklines={{ totalCustomers: [], safeCustomers: [], churnRisk: [], predictedChurn: [] }}
        deltas={deltas} trajectorySummary={trajectorySummary} trajectoryData={trajectoryData}
      />
    );
  }

  // ── 1. Auth-dependent sequential queries ────────────────────────────────────
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', authData.user.id)
    .limit(1)
    .single();

  let datasetsQuery = supabase
    .from('datasets')
    .select('id, total_customers, churn_rate_pct, created_at, storage_path')
    .not('total_customers', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (membership?.workspace_id) {
    datasetsQuery = datasetsQuery.eq('workspace_id', membership.workspace_id);
  }

  let { data: datasetsHistory } = await datasetsQuery;

  if (!datasetsHistory || datasetsHistory.length === 0) {
    const { data: fallback } = await supabase
      .from('datasets')
      .select('id, total_customers, churn_rate_pct, created_at, storage_path')
      .not('total_customers', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    datasetsHistory = fallback;
  }

  const dataset     = datasetsHistory?.[0];
  const prevDataset = datasetsHistory?.[1];

  if (dataset) {
    stats.totalCustomers = dataset.total_customers || 0;
    stats.churnRisk      = dataset.churn_rate_pct  || 0;
    stats.safeCustomers  = Math.round(stats.totalCustomers * (1 - stats.churnRisk / 100));

    // ── 2. Fire CSV download + all 7 DB queries in true parallel ─────────────
    const csvPromise: Promise<Record<string, string>[]> = dataset.storage_path
      ? supabase.storage
          .from('files')
          .download(`${dataset.storage_path}/customer_accounts.csv`)
          .then(async ({ data: f }) => (f ? parseSimpleCSV(await f.text()) : []))
          .catch(() => [])
      : Promise.resolve([]);

    const [
      csvRows,
      { count: lowCount },
      { count: mediumCount },
      { count: highCount },       // reused for both predictedChurn and riskDist
      { count: starterCount },
      { count: proCount },
      { count: entCount },
      { data: segRows },
    ] = await Promise.all([
      csvPromise,
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('risk_level', 'Low'),
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('risk_level', 'Medium'),
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('risk_level', 'High'),
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('plan_type', 'Starter'),
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('plan_type', 'Professional'),
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('plan_type', 'Enterprise'),
      supabase.from('segments')
        .select('segment_label, segment_cluster, total_customers, avg_revenue, pct_high_risk')
        .eq('dataset_id', dataset.id)
        .order('avg_churn_score', { ascending: false }),
    ]);

    stats.predictedChurn = highCount || Math.round(stats.totalCustomers * (stats.churnRisk / 100));

    // ── 3. Process CSV rows (sparklines + customer flow) — pure CPU, no I/O ──
    if (csvRows.length > 0) {
      const monthlyStats: Record<string, { total: number; active: number; churned: number }> = {};
      const weeklyFlow:   Record<string, { new: number; churned: number }> = {};
      const monthlyFlow:  Record<string, { new: number; churned: number }> = {};
      const yearlyFlow:   Record<string, { new: number; churned: number }> = {};

      const getWeekLabel = (date: Date) => {
        const onejan     = new Date(date.getFullYear(), 0, 1);
        const dayOfYear  = Math.floor((date.getTime() - onejan.getTime()) / 86400000);
        const weekNum    = Math.ceil((dayOfYear + onejan.getDay() + 1) / 7);
        return `W${weekNum} ${date.getFullYear()}`;
      };

      // Single pass over all rows for both sparklines and flow
      for (const row of csvRows) {
        const subDate   = row['subscription_date'];
        const unsubDate = row['unsubscribed_date'];
        const isChurned = unsubDate && unsubDate.trim() !== '' && unsubDate !== 'null' && unsubDate.toLowerCase() !== 'nan';

        if (subDate) {
          const d = new Date(subDate);
          if (!isNaN(d.getTime())) {
            const month = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            const week  = getWeekLabel(d);
            const year  = d.getFullYear().toString();

            if (!monthlyStats[month]) monthlyStats[month] = { total: 0, active: 0, churned: 0 };
            monthlyStats[month].total++;
            if (isChurned) monthlyStats[month].churned++; else monthlyStats[month].active++;

            if (!weeklyFlow[week])   weeklyFlow[week]   = { new: 0, churned: 0 };
            if (!monthlyFlow[month]) monthlyFlow[month] = { new: 0, churned: 0 };
            if (!yearlyFlow[year])   yearlyFlow[year]   = { new: 0, churned: 0 };
            weeklyFlow[week].new++;
            monthlyFlow[month].new++;
            yearlyFlow[year].new++;
          }
        }

        if (isChurned && unsubDate) {
          const d = new Date(unsubDate);
          if (!isNaN(d.getTime())) {
            const week  = getWeekLabel(d);
            const month = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            const year  = d.getFullYear().toString();

            if (!weeklyFlow[week])   weeklyFlow[week]   = { new: 0, churned: 0 };
            if (!monthlyFlow[month]) monthlyFlow[month] = { new: 0, churned: 0 };
            if (!yearlyFlow[year])   yearlyFlow[year]   = { new: 0, churned: 0 };
            weeklyFlow[week].churned++;
            monthlyFlow[month].churned++;
            yearlyFlow[year].churned++;
          }
        }
      }

      // Sparklines from monthly aggregates
      const sortedMonths = Object.entries(monthlyStats)
        .map(([month, s]) => ({ month, ts: new Date(month).getTime(), ...s }))
        .sort((a, b) => a.ts - b.ts);

      if (sortedMonths.length > 0) {
        sparkTotalCustomers  = sortedMonths.map(m => m.total);
        sparkSafeCustomers   = sortedMonths.map(m => m.active);
        sparkChurnRisk       = sortedMonths.map(m => m.total > 0 ? parseFloat(((m.churned / m.total) * 100).toFixed(1)) : 0);
        sparkPredictedChurn  = sortedMonths.map(m => m.churned);
      }

      // Customer flow sorted data
      const weeklyData  = Object.entries(weeklyFlow).map(([w, v]) => {
        const [wPart, yPart] = w.split(' ');
        return { period: w, weekNum: parseInt(wPart.slice(1)), year: parseInt(yPart), ...v };
      }).sort((a, b) => a.year !== b.year ? a.year - b.year : a.weekNum - b.weekNum)
        .map(({ period, new: n, churned }) => ({ period, new: n, churned }));

      const monthlyData = Object.entries(monthlyFlow)
        .map(([m, v]) => ({ period: m, ts: new Date(m).getTime(), ...v }))
        .sort((a, b) => a.ts - b.ts)
        .map(({ period, new: n, churned }) => ({ period, new: n, churned }));

      const yearlyData  = Object.entries(yearlyFlow)
        .map(([y, v]) => ({ period: y, ...v }))
        .sort((a, b) => parseInt(a.period) - parseInt(b.period));

      customerFlowData = { week: weeklyData, month: monthlyData, year: yearlyData } as any;
    }

    // ── 4. Sparkline fallback from dataset history ────────────────────────────
    if (sparkTotalCustomers.length === 0 && datasetsHistory && datasetsHistory.length > 0) {
      sparkTotalCustomers = datasetsHistory.map(d => d.total_customers || 0).reverse();
      sparkChurnRisk      = datasetsHistory.map(d => d.churn_rate_pct   || 0).reverse();
      sparkSafeCustomers  = datasetsHistory.map(d => Math.round((d.total_customers || 0) * (1 - (d.churn_rate_pct || 0) / 100))).reverse();
      sparkPredictedChurn = datasetsHistory.map(d => Math.round((d.total_customers || 0) * ((d.churn_rate_pct || 0) / 100))).reverse();

      const validChurns   = datasetsHistory.map(d => d.churn_rate_pct || 0);
      const avg           = validChurns.reduce((s, v) => s + v, 0) / validChurns.length;
      const bestDataset   = datasetsHistory.reduce((min, d) => (d.churn_rate_pct || 0) < (min.churn_rate_pct || 0) ? d : min, datasetsHistory[0]);
      const bestMonth     = new Date(bestDataset.created_at).toLocaleString('en-US', { month: 'short' });
      const oldest        = datasetsHistory[datasetsHistory.length - 1];
      const diff          = (dataset.churn_rate_pct || 0) - (oldest.churn_rate_pct || 0);

      trajectorySummary = {
        avg:   `${avg.toFixed(1)}%`,
        best:  `${(bestDataset.churn_rate_pct || 0).toFixed(1)}% · ${bestMonth}`,
        trend: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pts`,
      };
      trajectoryData = datasetsHistory
        .map(d => ({ label: new Date(d.created_at).toLocaleString('en-US', { month: 'short' }).toUpperCase(), value: d.churn_rate_pct || 0, ts: new Date(d.created_at).getTime() }))
        .sort((a, b) => a.ts - b.ts)
        .map(({ label, value }) => ({ label, value }));
    }

    // ── 5. Deltas ─────────────────────────────────────────────────────────────
    if (prevDataset) {
      const diffCust  = (dataset.total_customers || 0) - (prevDataset.total_customers || 0);
      const pctCust   = prevDataset.total_customers ? (diffCust / prevDataset.total_customers) * 100 : 0;
      const latestSafe = Math.round((dataset.total_customers || 0) * (1 - (dataset.churn_rate_pct || 0) / 100));
      const prevSafe   = Math.round((prevDataset.total_customers || 0) * (1 - (prevDataset.churn_rate_pct || 0) / 100));
      const diffSafe   = latestSafe - prevSafe;
      const pctSafe    = prevSafe ? (diffSafe / prevSafe) * 100 : 0;
      const diffChurn  = (dataset.churn_rate_pct || 0) - (prevDataset.churn_rate_pct || 0);
      const prevPred   = Math.round((prevDataset.total_customers || 0) * ((prevDataset.churn_rate_pct || 0) / 100));
      const diffPred   = stats.predictedChurn - prevPred;

      deltas = {
        totalCustomers:  { change: `${diffCust >= 0 ? '+' : ''}${pctCust.toFixed(1)}%`,             positive: diffCust  >= 0 },
        safeCustomers:   { change: `${diffSafe >= 0 ? '+' : ''}${pctSafe.toFixed(1)}%`,             positive: diffSafe  >= 0 },
        churnRisk:       { change: `${diffChurn >= 0 ? '+' : '−'}${Math.abs(diffChurn).toFixed(1)} pts`, positive: diffChurn <= 0 },
        predictedChurn:  { change: `${diffPred >= 0 ? '+' : ''}${diffPred}`,                         positive: diffPred  <= 0 },
      };
    } else {
      deltas = {
        totalCustomers: { change: '-', positive: true },
        safeCustomers:  { change: '-', positive: true },
        churnRisk:      { change: '-', positive: true },
        predictedChurn: { change: '-', positive: true },
      };
    }

    // ── 6. Assemble chart data from parallel query results ────────────────────
    riskDistributionData = [
      { name: 'Low Risk',    value: lowCount    || 0, color: '#22c55e' },
      { name: 'Medium Risk', value: mediumCount || 0, color: '#eab308' },
      { name: 'High Risk',   value: highCount   || 0, color: '#ef4444' },
    ];

    planDistributionData = [
      { name: 'Starter',      value: starterCount || 0, color: '#3b82f6' },
      { name: 'Professional', value: proCount     || 0, color: '#10b981' },
      { name: 'Enterprise',   value: entCount     || 0, color: '#8b5cf6' },
    ];

    if (segRows && segRows.length > 0) {
      const totalSeg = segRows.reduce((s: number, r: any) => s + (r.total_customers || 0), 0);
      segmentData = segRows.map((r: any) => ({
        name:        r.segment_label,
        cluster:     r.segment_cluster,
        count:       r.total_customers || 0,
        pct:         totalSeg > 0 ? parseFloat(((r.total_customers / totalSeg) * 100).toFixed(1)) : 0,
        avgMrr:      `$${Math.round(r.avg_revenue || 0).toLocaleString('en-US')}`,
        pctHighRisk: r.pct_high_risk || 0,
      }));
    }
  }

  return (
    <OverviewPage
      stats={stats}
      riskData={riskDistributionData}
      flowData={customerFlowData}
      planData={planDistributionData}
      segmentData={segmentData}
      sparklines={{
        totalCustomers:  sparkTotalCustomers,
        safeCustomers:   sparkSafeCustomers,
        churnRisk:       sparkChurnRisk,
        predictedChurn:  sparkPredictedChurn,
      }}
      deltas={deltas}
      trajectorySummary={trajectorySummary}
      trajectoryData={trajectoryData}
    />
  );
}

// ── Default export — NOT async, renders skeleton immediately via Suspense ──────
export default function Page() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewLoader />
    </Suspense>
  );
}
