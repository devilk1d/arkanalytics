// app/api/segments/regenerate-xai/route.ts
// Regenerate LLM cohort narratives for all segments in a dataset.
// Reads aggregated stats from Supabase, calls model service /generate-cohort-xai,
// and saves results back to the segments table.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSegmentCohortXai } from '@/lib/supabase/db'

const RAILWAY_URL = process.env.RAILWAY_API_URL!

export async function POST(req: NextRequest) {
  const { dataset_id } = await req.json().catch(() => ({}))
  if (!dataset_id) {
    return NextResponse.json({ error: 'dataset_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: segments, error } = await supabase
    .from('segments')
    .select('segment_label,total_customers,avg_churn_score,pct_high_risk,avg_revenue,avg_usage_hrs,avg_nps,avg_tenure_days,churn_rate,segment_actions')
    .eq('dataset_id', dataset_id)

  if (error || !segments?.length) {
    return NextResponse.json({ error: 'No segments found for dataset' }, { status: 404 })
  }

  const totalAll = segments.reduce((s, r) => s + (r.total_customers ?? 0), 0)

  const payload = segments.map((s: any) => ({
    segment_label:       s.segment_label,
    total_customers:     s.total_customers ?? 0,
    avg_churn_score:     s.avg_churn_score ?? 0,
    pct_high_risk:       s.pct_high_risk ?? 0,
    avg_revenue:         s.avg_revenue ?? 0,
    avg_usage_hrs:       s.avg_usage_hrs ?? 0,
    avg_nps:             s.avg_nps ?? 0,
    avg_tenure_days:     s.avg_tenure_days ?? 0,
    churn_rate:          s.churn_rate ?? 0,
    segment_description: (s.segment_actions as any)?.description ?? '',
    retain_actions:      (s.segment_actions as any)?.retain ?? [],
    offer_actions:       (s.segment_actions as any)?.offer ?? [],
    total_all_customers: totalAll,
  }))

  let base = RAILWAY_URL
  if (!base.startsWith('http')) base = `https://${base}`
  base = base.replace(/\/$/, '')

  let modelRes: Response
  try {
    modelRes = await fetch(`${base}/generate-cohort-xai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Cannot reach model service: ${e.message}` }, { status: 502 })
  }

  if (!modelRes.ok) {
    const detail = await modelRes.json().catch(() => ({}))
    return NextResponse.json({ error: detail.detail ?? 'Model service error' }, { status: modelRes.status })
  }

  const { cohort_xai } = await modelRes.json()

  // Persist each segment's XAI to DB
  await Promise.all(
    Object.entries(cohort_xai as Record<string, string>).map(async ([label, raw]) => {
      let parsed: unknown
      try { parsed = JSON.parse(raw) } catch { parsed = { narrative: raw } }
      await updateSegmentCohortXai(dataset_id, label, parsed)
    })
  )

  return NextResponse.json({ status: 'success', segments_updated: Object.keys(cohort_xai).length })
}
