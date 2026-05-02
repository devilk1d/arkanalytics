// app/api/predict-single/route.ts
// Dipanggil dari Customer Analytics detail page
// Cek DB dulu → jika sudah ada return dari DB, jika belum panggil Railway

import { NextRequest, NextResponse } from 'next/server'
import { getPrediction, savePredictions } from '@/lib/supabase/db'

const RAILWAY_URL = process.env.RAILWAY_API_URL!

export async function POST(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id')
  const datasetId = req.nextUrl.searchParams.get('dataset_id')

  if (!customerId || !datasetId) {
    return NextResponse.json({ error: 'customer_id and dataset_id required' }, { status: 400 })
  }

  // Cek DB dulu
  const existing = await getPrediction(datasetId, customerId)
  if (existing && existing.xai_churn_explanation) {
    // Sudah ada lengkap dengan XAI → return dari DB, tidak perlu ke Railway
    return NextResponse.json(existing)
  }

  // Belum ada → panggil Railway
  const form = await req.formData()
  const railwayRes = await fetch(
    `${RAILWAY_URL}/predict/single?customer_id=${encodeURIComponent(customerId)}`,
    { method: 'POST', body: form }
  )

  if (!railwayRes.ok) {
    const err = await railwayRes.json().catch(() => ({}))
    return NextResponse.json({ error: err.detail ?? 'Railway error' }, { status: railwayRes.status })
  }

  const prediction = await railwayRes.json()

  // Simpan ke DB untuk next request
  await savePredictions(datasetId, [prediction])

  return NextResponse.json(prediction)
}