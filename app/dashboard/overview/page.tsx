import { createClient } from '@/lib/supabase/server';
import OverviewPage from "../../components/dashboard/pages/overview/OverviewPage";

export const metadata = { title: "Dashboard Overview | Arkanalytics" };

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
    headers.forEach((h, i) => {
      obj[h] = cols[i] || '';
    });
    return obj;
  });
}

export default async function Page() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  let stats = {
    totalCustomers: 0,
    safeCustomers: 0,
    churnRisk: 0,
    predictedChurn: 0
  };

  let riskDistributionData: any[] = [];
  let planDistributionData: any[] = [];
  let customerFlowData: any[] = [];

  if (authData.user) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', authData.user.id)
      .limit(1)
      .single();

    let datasetQuery = supabase
      .from('datasets')
      .select('id, storage_path, total_customers, churn_rate_pct')
      .not('total_customers', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (membership?.workspace_id) {
      datasetQuery = datasetQuery.eq('workspace_id', membership.workspace_id);
    }

    let { data: dataset } = await datasetQuery.maybeSingle();

    if (!dataset) {
      // Fallback
      const { data: fallbackDataset } = await supabase
        .from('datasets')
        .select('id, storage_path, total_customers, churn_rate_pct')
        .not('total_customers', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      dataset = fallbackDataset;
    }

    if (dataset) {
      stats.totalCustomers = dataset.total_customers || 0;
      stats.churnRisk = dataset.churn_rate_pct || 0;
      stats.safeCustomers = Math.round(stats.totalCustomers * (1 - (stats.churnRisk / 100)));
      
      const { count } = await supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('dataset_id', dataset.id)
        .eq('risk_level', 'High');
        
      stats.predictedChurn = count || Math.round(stats.totalCustomers * (stats.churnRisk / 100));

      // 1. Fetch Risk Distribution (Low, Medium, High) using count queries to bypass 1000 row limit
      const [
        { count: lowCount },
        { count: mediumCount },
        { count: highCount }
      ] = await Promise.all([
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('risk_level', 'Low'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('risk_level', 'Medium'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('risk_level', 'High')
      ]);

      riskDistributionData = [
        { name: 'Low Risk', value: lowCount || 0, color: '#22c55e' }, // green
        { name: 'Medium Risk', value: mediumCount || 0, color: '#eab308' }, // yellow
        { name: 'High Risk', value: highCount || 0, color: '#ef4444' } // red
      ];

      // 1.5 Fetch Plan Distribution
      const [
        { count: starterCount },
        { count: proCount },
        { count: entCount }
      ] = await Promise.all([
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('plan_type', 'Starter'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('plan_type', 'Professional'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('dataset_id', dataset.id).eq('plan_type', 'Enterprise')
      ]);

      planDistributionData = [
        { name: 'Starter', value: starterCount || 0, color: '#3b82f6' }, // blue
        { name: 'Professional', value: proCount || 0, color: '#10b981' }, // green-ish
        { name: 'Enterprise', value: entCount || 0, color: '#8b5cf6' } // purple
      ];

      // 2. Fetch Customer Flow from Raw CSV
      if (dataset.storage_path) {
        const { data: fileData } = await supabase.storage
          .from('files')
          .download(`${dataset.storage_path}/customer_accounts.csv`);
        
        if (fileData) {
          const text = await fileData.text();
          const rows = parseSimpleCSV(text);
          
          const monthlyFlow: Record<string, { new: number, churned: number }> = {};
          const yearlyFlow: Record<string, { new: number, churned: number }> = {};
          
          rows.forEach(row => {
            const subDate = row['subscription_date'];
            const unsubDate = row['unsubscribed_date'];
            
            if (subDate) {
              const d = new Date(subDate);
              if (!isNaN(d.getTime())) {
                const month = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                const year = d.getFullYear().toString();
                
                if (!monthlyFlow[month]) monthlyFlow[month] = { new: 0, churned: 0 };
                if (!yearlyFlow[year]) yearlyFlow[year] = { new: 0, churned: 0 };
                
                monthlyFlow[month].new++;
                yearlyFlow[year].new++;
              }
            }
            
            if (unsubDate && unsubDate.trim() !== '' && unsubDate !== 'null') {
              const d = new Date(unsubDate);
              if (!isNaN(d.getTime())) {
                const month = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                const year = d.getFullYear().toString();
                
                if (!monthlyFlow[month]) monthlyFlow[month] = { new: 0, churned: 0 };
                if (!yearlyFlow[year]) yearlyFlow[year] = { new: 0, churned: 0 };
                
                monthlyFlow[month].churned++;
                yearlyFlow[year].churned++;
              }
            }
          });

          // Sort chronologically
          const monthlyData = Object.keys(monthlyFlow)
            .map(month => ({
              period: month,
              timestamp: new Date(month).getTime(),
              new: monthlyFlow[month].new,
              churned: monthlyFlow[month].churned
            }))
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(item => ({ period: item.period, new: item.new, churned: item.churned }));

          const yearlyData = Object.keys(yearlyFlow)
            .map(year => ({
              period: year,
              new: yearlyFlow[year].new,
              churned: yearlyFlow[year].churned
            }))
            .sort((a, b) => parseInt(a.period) - parseInt(b.period));

          customerFlowData = { month: monthlyData, year: yearlyData } as any;
        }
      }
    }
  }

  return <OverviewPage stats={stats} riskData={riskDistributionData} flowData={customerFlowData} planData={planDistributionData} />;
}
