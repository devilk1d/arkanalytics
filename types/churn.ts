// types/churn.ts — v2.1 (unified pipeline, no late fusion)

export interface ShapFactor {
  feature: string
  feature_label: string        // human-readable: "Dunning Count"
  shap_value: number
  direction: 'increases_churn' | 'decreases_churn'
  importance: number
}

export interface SentimentProfile {
  label: 'positive' | 'negative' | 'neutral'
  vader_compound: number   // -1 to +1
  vader_neg: number   // 0 to 1
  pct_negative_sent: number   // % kalimat negatif (0-100)
  urgency_level: 'low' | 'medium' | 'high'
  urgency_score: number
  dominant_topic: string   // e.g. "Billing & Account"
  topic_strength: number
  feedback_preview: string
}

export interface RfmMetric {
  customer: number
  segment_avg: number
}

export interface SegmentRfmContext {
  days_since_login: RfmMetric
  payment_count: RfmMetric
  total_revenue: RfmMetric
  monthly_usage_hrs: RfmMetric
  feature_adoption_pct: RfmMetric
  avg_nps_score: RfmMetric
}

export interface SegmentProfile {
  segment_label: string
  count: number
  avg_churn_score: number
  pct_high_risk: number
  avg_revenue: number
  avg_usage_hrs: number
  avg_nps: number
  avg_tenure_days: number
  churn_rate: number
}

// v2.1: SegmentActions hardcoded dihapus dari API.
// Rekomendasi retain & offer kini di-generate Qwen per customer (ada di xai_churn_explanation).
// Interface ini dipertahankan untuk backward compat jika ada data lama di DB.
export interface SegmentActions {
  description: string
  retain: string[]
  offer: string[]
  priority: string
}

export interface CustomerPrediction {
  // Identity
  customer_id: string
  plan_type: string
  contract_type: string

  // Churn Score — tabular LightGBM only (v2.1: no late fusion)
  churn_score: number          // 0-100
  churn_proba: number          // 0-1
  tabular_proba: number          // LightGBM prediction
  nlp_proba: number | null   // null di v2.1 (late fusion dihapus)
  risk_level: 'Low' | 'Medium' | 'High'

  // SHAP — tabular model
  shap_top5: ShapFactor[]

  // NLP / Sentiment — XAI context & risk flag only (bukan model input)
  sentiment: SentimentProfile
  nlp_red_flag: number          // 1 = hidden risk (tabular aman tapi feedback negatif)

  // Segmentation
  segment_label: string
  segment_cluster: number
  segment_rfm_context: SegmentRfmContext
  segment_profile: SegmentProfile
  segment_description: string          // v2.1: deskripsi konteks segment
  segment_actions?: SegmentActions  // opsional — hanya ada di data lama di DB

  // Qwen XAI narratives
  // xai_churn_explanation JSON berisi: score_reason, risk_factors, feedback_signal,
  // action.retain, action.offer, action.reason — semua di-generate AI per customer
  xai_churn_explanation: string | null
  xai_segment_explanation: string | null
}

export interface PredictResponse {
  status: string
  total_customers: number
  predictions: CustomerPrediction[]
}