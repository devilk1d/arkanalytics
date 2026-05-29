// Shared types for the Simulation feature

export interface CustomerListItem {
  customer_id: string;
  risk_level:  string;
  churn_score: number;
  plan_type:   string;
  segment_label: string;
}

export interface ShapFactor {
  feature_label: string;
  shap_value:    number;
  direction:     string;
  importance:    number;
}

export interface SentimentData {
  label:            string;
  vader_compound:   number;
  urgency_level:    string;
  urgency_score:    number;
  dominant_topic:   string;
  feedback_preview: string;
}

export interface RfmContext {
  days_since_login?:     { customer: number; segment_avg: number };
  total_revenue?:        { customer: number; segment_avg: number };
  monthly_usage_hrs?:    { customer: number; segment_avg: number };
  feature_adoption_pct?: { customer: number; segment_avg: number };
  avg_nps_score?:        { customer: number; segment_avg: number };
}

export interface PredictionRow {
  customer_id:          string;
  risk_level:           string;
  churn_score:          number;
  plan_type:            string;
  contract_type:        string;
  segment_label:        string;
  shap_top5:            ShapFactor[];
  sentiment:            SentimentData;
  segment_rfm_context:  RfmContext;
  nlp_red_flag:         number;
  loyalty_risk_flag:    number;
}

export interface TrajectoryPoint { week: number; prob: number }
export interface SegMigration    { label: string; prob: number }

export interface SimData {
  baseline:                TrajectoryPoint[];
  projection:              TrajectoryPoint[] | null;
  retention_window_weeks:  number;
  revenue_at_risk:         number;
  confidence:              number;
  intervention_impact_pct: number | null;
  segment_migration:       SegMigration[];
}

export interface AgentMessage {
  name:    string;
  short:   string;
  color:   string;
  content: string;
  done:    boolean;
}

/** A Q&A ask turn (no chart change) */
export interface AskTurn {
  type:      'ask';
  id:        string;
  question:  string;
  answer:    string;
  timestamp: Date;
}

/** A scenario run turn (updates chart) */
export interface ScenarioTurn {
  type:      'scenario';
  id:        string;
  label:     string;
  timestamp: Date;
  scenario:  string;
  narrative: string;
  simData:   SimData;
  agents:    AgentMessage[];
  recommendations: string[];
}

/** A full initial run snapshot */
export interface RunSnapshot {
  type:         'run';
  id:           string;
  label:        string;
  timestamp:    Date;
  horizonWeeks: number;
  simData:      SimData;
  narrative:    string;
  agents:       AgentMessage[];
  recommendations: string[];
}

export type HistoryEntry = AskTurn | ScenarioTurn | RunSnapshot;

export type Phase     = 'idle' | 'running' | 'asking' | 'chatting' | 'done' | 'saving' | 'error';
export type InputMode = 'ask' | 'scenario';

export const HORIZON_PRESETS = [
  { label: '2 Minggu',  weeks: 2  },
  { label: '1 Bulan',   weeks: 4  },
  { label: '6 Minggu',  weeks: 6  },
  { label: '8 Minggu',  weeks: 8  },
  { label: '3 Bulan',   weeks: 12 },
  { label: '6 Bulan',   weeks: 24 },
  { label: '1 Tahun',   weeks: 52 },
] as const;
