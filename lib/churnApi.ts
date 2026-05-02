import { PredictResponse, CustomerPrediction } from '@/types/churn'

const RAILWAY_URL = process.env.RAILWAY_API_URL ?? 'http://localhost:8000'

/**
 * Upload all 5 CSV files and get predictions for all customers.
 * Call this when user clicks "Analyze" after uploading datasets.
 */
export async function analyzeAll(files: {
  customer_accounts: File
  monthly_usage_metrics: File
  billing_data: File
  support_tickets: File
  nps_surveys_with_feedback: File
}, generateXai = true): Promise<PredictResponse> {
  const form = new FormData()
  form.append('customer_accounts',         files.customer_accounts)
  form.append('monthly_usage_metrics',     files.monthly_usage_metrics)
  form.append('billing_data',              files.billing_data)
  form.append('support_tickets',           files.support_tickets)
  form.append('nps_surveys_with_feedback', files.nps_surveys_with_feedback)

  const res = await fetch(
    `${RAILWAY_URL}/predict?generate_xai=${generateXai}`,
    { method: 'POST', body: form }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

/**
 * Get prediction for a single customer (Customer Analytics page).
 * Pass the same 5 files but filtered by customer_id on the server.
 */
export async function analyzeSingle(
  customerId: string,
  files: Parameters<typeof analyzeAll>[0]
): Promise<CustomerPrediction> {
  const form = new FormData()
  form.append('customer_accounts',         files.customer_accounts)
  form.append('monthly_usage_metrics',     files.monthly_usage_metrics)
  form.append('billing_data',              files.billing_data)
  form.append('support_tickets',           files.support_tickets)
  form.append('nps_surveys_with_feedback', files.nps_surveys_with_feedback)

  const res = await fetch(
    `${RAILWAY_URL}/predict/single?customer_id=${encodeURIComponent(customerId)}`,
    { method: 'POST', body: form }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

/** Health check — call on page load to verify Railway service is up */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${RAILWAY_URL}/health`, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}
