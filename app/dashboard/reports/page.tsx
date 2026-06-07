import { createClient } from '@/lib/supabase/server';
import ReportsPage from "../../components/dashboard/pages/reports/ReportsPage";

export const metadata = { title: "Reports" };

export default async function Page() {
  const supabase = await createClient();
  const { data: dataset } = await supabase
    .from('datasets')
    .select('id')
    .not('total_customers', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return <ReportsPage datasetId={dataset?.id} />;
}
