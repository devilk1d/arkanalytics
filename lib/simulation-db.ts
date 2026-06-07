import { createClient } from '@/lib/supabase/client';
import type { SimData, AgentMessage } from '@/app/components/dashboard/pages/simulation/types';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ScenarioTurnRecord {
  scenario:        string;
  sim_data:        SimData;
  narrative:       string;
  agents:          AgentMessage[];
  recommendations: string[];
  created_at:      string;
}

export interface ChatMessageRecord {
  role:    'user' | 'ai';
  content: string;
  ts:      string;
}

export interface SimulationRecord {
  id:              string;
  workspace_id:    string;
  dataset_id:      string | null;
  created_by:      string;
  customer_id:     string;
  label:           string;
  horizon_weeks:   number;
  churn_score:     number | null;
  risk_level:      string | null;
  segment_label:   string | null;
  sim_data:        SimData | null;
  narrative:       string;
  agents:          AgentMessage[];
  recommendations: string[];
  scenario:        string;
  scenario_turns:  ScenarioTurnRecord[];
  chat_messages:   ChatMessageRecord[];
  created_at:      string;
}

// ── Save initial run ───────────────────────────────────────────────────────────
export async function createSimulation(params: {
  workspace_id:    string;
  dataset_id:      string | null;
  customer_id:     string;
  label:           string;
  horizon_weeks:   number;
  churn_score:     number;
  risk_level:      string;
  segment_label:   string;
  sim_data:        SimData;
  narrative:       string;
  agents:          AgentMessage[];
  recommendations: string[];
}): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('simulations')
    .insert({
      workspace_id:    params.workspace_id,
      dataset_id:      params.dataset_id,
      created_by:      user.id,
      customer_id:     params.customer_id,
      label:           params.label,
      horizon_weeks:   params.horizon_weeks,
      churn_score:     params.churn_score,
      risk_level:      params.risk_level,
      segment_label:   params.segment_label,
      sim_data:        params.sim_data,
      narrative:       params.narrative,
      agents:          params.agents,
      recommendations: params.recommendations,
      scenario:        '',
      scenario_turns:  [],
      chat_messages:   [],
      // Legacy columns (required by NOT NULL if they exist)
      intervention_params: { scenario: '' },
      debate_transcript:   [],
      conclusion:          {},
    })
    .select('id')
    .single();

  if (error) { console.error('[sim-db] create error:', error.message); return null; }
  return data?.id ?? null;
}

// ── Append a scenario turn ─────────────────────────────────────────────────────
export async function appendScenarioTurn(
  id: string,
  turn: ScenarioTurnRecord,
  newSimData: SimData,
): Promise<void> {
  const supabase = createClient();

  // Fetch current scenario_turns first
  const { data: current } = await supabase
    .from('simulations')
    .select('scenario_turns')
    .eq('id', id)
    .single();

  const existing: ScenarioTurnRecord[] = current?.scenario_turns ?? [];

  await supabase
    .from('simulations')
    .update({
      scenario_turns: [...existing, turn],
      scenario:       turn.scenario,
      sim_data:       newSimData,   // keep latest full state
    })
    .eq('id', id);
}

// ── Append chat messages ───────────────────────────────────────────────────────
export async function appendChatMessages(
  id: string,
  messages: ChatMessageRecord[],
): Promise<void> {
  const supabase = createClient();

  const { data: current } = await supabase
    .from('simulations')
    .select('chat_messages')
    .eq('id', id)
    .single();

  const existing: ChatMessageRecord[] = current?.chat_messages ?? [];

  await supabase
    .from('simulations')
    .update({ chat_messages: [...existing, ...messages] })
    .eq('id', id);
}

// ── Load workspace history ─────────────────────────────────────────────────────
export async function loadWorkspaceSimulations(
  workspaceId: string,
  limit = 30,
): Promise<SimulationRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('simulations')
    .select('id, workspace_id, dataset_id, created_by, customer_id, label, horizon_weeks, churn_score, risk_level, segment_label, sim_data, narrative, agents, recommendations, scenario, scenario_turns, chat_messages, created_at')
    .eq('workspace_id', workspaceId)
    .not('sim_data', 'is', null)
    .neq('sim_data', '{}')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('[sim-db] load workspace error:', error.message); return []; }
  // Extra client-side guard: only records with a proper baseline array
  return (data ?? []).filter(r => Array.isArray((r.sim_data as SimData | null)?.baseline) && (r.sim_data as SimData).baseline.length > 0) as SimulationRecord[];
}

// ── Load customer history ──────────────────────────────────────────────────────
export async function loadCustomerSimulations(
  workspaceId: string,
  customerId: string,
  limit = 10,
): Promise<SimulationRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('simulations')
    .select('id, workspace_id, dataset_id, created_by, customer_id, label, horizon_weeks, churn_score, risk_level, segment_label, sim_data, narrative, agents, recommendations, scenario, scenario_turns, chat_messages, created_at')
    .eq('workspace_id', workspaceId)
    .eq('customer_id', customerId)
    .not('sim_data', 'is', null)
    .neq('sim_data', '{}')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('[sim-db] load customer error:', error.message); return []; }
  return (data ?? []).filter(r => Array.isArray((r.sim_data as SimData | null)?.baseline) && (r.sim_data as SimData).baseline.length > 0) as SimulationRecord[];
}

// ── Delete a simulation ────────────────────────────────────────────────────────
export async function deleteSimulation(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('simulations').delete().eq('id', id);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function formatSimLabel(customerId: string, scenario: string, horizonWeeks: number): string {
  const h = horizonWeeks <= 4 ? '1mo' : horizonWeeks <= 8 ? '2mo' : horizonWeeks <= 12 ? '3mo' : horizonWeeks <= 24 ? '6mo' : '1yr';
  if (scenario.trim()) return `${customerId} · ${scenario.slice(0, 40)}`;
  return `${customerId} · ${h} baseline`;
}

export function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
