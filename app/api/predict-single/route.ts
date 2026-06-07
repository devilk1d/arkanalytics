// app/api/predict-single/route.ts
// Server-side: fetches CSV files from Supabase Storage → forwards to Railway.
// The browser no longer uploads files, which avoids Vercel's 4.5 MB body limit.

// Allow up to 60 s on Vercel Hobby (Pro allows 300 s).
// Needed because server downloads 5 CSVs + Railway runs ML + LLM calls.
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getPrediction, savePredictions } from '@/lib/supabase/db'
import { createAdminClient } from '@/lib/supabase/admin'

const RAILWAY_URL = process.env.RAILWAY_API_URL!
const inFlightRequests = new Map<string, Promise<NextResponse>>()

const FILE_KEYS = [
  'customer_accounts',
  'monthly_usage_metrics',
  'billing_data',
  'support_tickets',
  'nps_surveys_with_feedback',
] as const

export async function POST(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id')
  const datasetId  = req.nextUrl.searchParams.get('dataset_id')

  if (!customerId || !datasetId) {
    return NextResponse.json({ error: 'customer_id and dataset_id required' }, { status: 400 })
  }

  const force     = req.nextUrl.searchParams.get('force') === 'true'
  const dedupeKey = `${datasetId}:${customerId}`

  // ── Deduplicate concurrent requests for the same customer ─────────────────
  const existing = inFlightRequests.get(dedupeKey)
  if (existing) {
    const result = await existing
    const body   = await result.clone().json()
    return NextResponse.json(body, { status: result.status })
  }

  const requestPromise = handleRequest(customerId, datasetId, force)
  inFlightRequests.set(dedupeKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    inFlightRequests.delete(dedupeKey)
  }
}

async function handleRequest(
  customerId: string,
  datasetId:  string,
  force:      boolean,
): Promise<NextResponse> {
  // ── Path A: DB already has full data including XAI → instant return ────────
  if (!force) {
    const existing = await getPrediction(datasetId, customerId)
    if (existing && existing.xai_churn_explanation) {
      return NextResponse.json(existing)
    }
  }

  // ── Path B/C: Download files from Supabase Storage server-side ────────────
  // Keeps the request body from the browser tiny (query-params only),
  // which avoids Vercel's 4.5 MB incoming body limit on the Hobby plan.
  const admin = createAdminClient()

  const { data: ds, error: dsErr } = await admin
    .from('datasets')
    .select('storage_path')
    .eq('id', datasetId)
    .single()

  if (dsErr || !ds?.storage_path) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  const form = new FormData()
  for (const key of FILE_KEYS) {
    const { data: blob, error: dlErr } = await admin.storage
      .from('files')
      .download(`${ds.storage_path}/${key}.csv`)

    if (dlErr || !blob) {
      return NextResponse.json(
        { error: `Failed to download ${key}.csv: ${dlErr?.message ?? 'unknown'}` },
        { status: 502 },
      )
    }
    form.append(key, new File([blob], `${key}.csv`, { type: 'text/csv' }))
  }

  // ── Forward to Railway ─────────────────────────────────────────────────────
  let url = RAILWAY_URL
  if (!url.startsWith('http')) url = `https://${url}`
  if (url.endsWith('/'))       url = url.slice(0, -1)

  let railwayRes: Response
  try {
    railwayRes = await fetch(
      `${url}/predict/single?customer_id=${encodeURIComponent(customerId)}`,
      { method: 'POST', body: form },
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Cannot reach Railway: ${msg}` }, { status: 503 })
  }

  if (!railwayRes.ok) {
    let errDetail = 'Railway error'
    try {
      const errBody = await railwayRes.json() as { detail?: string }
      errDetail = errBody?.detail ?? errDetail
    } catch { /* ignore parse error */ }
    return NextResponse.json({ error: errDetail }, { status: railwayRes.status })
  }

  let prediction: unknown
  try {
    prediction = await railwayRes.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from Railway' }, { status: 502 })
  }

  // ── Save to DB ─────────────────────────────────────────────────────────────
  try {
    await savePredictions(datasetId, [prediction as Parameters<typeof savePredictions>[1][0]])
  } catch (saveErr) {
    console.error('[predict-single] DB save error:', saveErr)
  }

  return NextResponse.json(prediction)
}
