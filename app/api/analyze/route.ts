// app/api/analyze/route.ts
// Dipanggil dari halaman Customer Analytics / Segmentation
// Kirim 5 CSV ke Railway → simpan hasil ke Supabase

import { NextRequest, NextResponse } from 'next/server'
import { savePredictions, saveSegments, updateDatasetStatus } from '@/lib/supabase/db'
import { CustomerPrediction } from '@/types/churn'

const RAILWAY_URL = process.env.RAILWAY_API_URL!

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const datasetId = req.nextUrl.searchParams.get('dataset_id')
  const generateXai = req.nextUrl.searchParams.get('generate_xai') ?? 'false'

  if (!datasetId) {
    return NextResponse.json({ error: 'dataset_id required' }, { status: 400 })
  }

  // Update status → analyzing
  await updateDatasetStatus(datasetId, 'analyzing')

  let railwayRes: Response;
  try {
    let url = RAILWAY_URL;
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    // Remove trailing slash if exists to prevent //predict 404 error
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    railwayRes = await fetch(
      `${url}/predict?generate_xai=${generateXai}`,
      { method: 'POST', body: form }
    )
  } catch (err: any) {
    console.error("Railway Fetch Error:", err);
    await updateDatasetStatus(datasetId, 'error', { error_message: 'Failed to connect to ML Backend' });
    return NextResponse.json({ error: 'Failed to connect to ML Backend' }, { status: 500 })
  }

  if (!railwayRes.ok) {
    const statusText = railwayRes.statusText || 'Railway Server Error';
    const err = await railwayRes.json().catch(() => ({ detail: statusText }))
    await updateDatasetStatus(datasetId, 'error', { error_message: err.detail ?? statusText })
    return NextResponse.json({ error: err.detail ?? statusText }, { status: railwayRes.status })
  }

  const data = await railwayRes.json()
  const predictions: CustomerPrediction[] = data.predictions

  // Extract per-segment cohort XAI from predictions (one LLM call per segment, attach to all)
  const cohortXai: Record<string, unknown> = {}
  for (const p of predictions as unknown as Record<string, unknown>[]) {
    const seg = p.segment_label as string
    const raw = p.xai_segment_cohort as string | null
    if (raw && !cohortXai[seg]) {
      try { cohortXai[seg] = JSON.parse(raw) } catch { /* ignore malformed */ }
    }
  }

  // Simpan ke Supabase
  await savePredictions(datasetId, predictions)
  await saveSegments(datasetId, predictions, Object.keys(cohortXai).length ? cohortXai : undefined)

  const highRiskCount = predictions.filter(p => p.risk_level === 'High').length
  const churnRatePct = Math.round((highRiskCount / predictions.length) * 1000) / 10

  await updateDatasetStatus(datasetId, 'done', {
    total_customers: predictions.length,
    churn_rate_pct: churnRatePct,
  })

  return NextResponse.json({
    status: 'success',
    total_customers: predictions.length,
    dataset_id: datasetId,
  })
}