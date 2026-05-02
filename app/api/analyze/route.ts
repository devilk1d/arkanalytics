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

  // Forward ke Railway
  const railwayRes = await fetch(
    `${RAILWAY_URL}/predict?generate_xai=${generateXai}`,
    { method: 'POST', body: form }
  )

  if (!railwayRes.ok) {
    await updateDatasetStatus(datasetId, 'error', { error_message: `Railway ${railwayRes.status}` })
    const err = await railwayRes.json().catch(() => ({}))
    return NextResponse.json({ error: err.detail ?? 'Railway error' }, { status: railwayRes.status })
  }

  const data = await railwayRes.json()
  const predictions: CustomerPrediction[] = data.predictions

  // Simpan ke Supabase
  await savePredictions(datasetId, predictions)
  await saveSegments(datasetId, predictions)

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