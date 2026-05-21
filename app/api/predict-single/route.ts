// app/api/predict-single/route.ts
// Dipanggil dari Customer Analytics detail page
// Cek DB dulu → jika sudah ada return dari DB, jika belum panggil Railway

import { NextRequest, NextResponse } from 'next/server'
import { getPrediction, savePredictions } from '@/lib/supabase/db'

const RAILWAY_URL = process.env.RAILWAY_API_URL!
const inFlightRequests = new Map<string, Promise<NextResponse>>()

export async function POST(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id')
  const datasetId = req.nextUrl.searchParams.get('dataset_id')

  if (!customerId || !datasetId) {
    return NextResponse.json({ error: 'customer_id and dataset_id required' }, { status: 400 })
  }

  const dedupeKey = `${datasetId}:${customerId}`

  // ── Jika ada request yang sedang berjalan untuk key yang sama → tunggu hasilnya
  const existing = inFlightRequests.get(dedupeKey)
  if (existing) {
    // Clone response karena Response body hanya bisa dibaca sekali
    const result = await existing
    const body = await result.clone().json()
    return NextResponse.json(body, { status: result.status })
  }

  // ── Buat promise baru dan daftarkan sebelum await apapun ─────────────────
  const requestPromise = handleRequest(req, customerId, datasetId)
  inFlightRequests.set(dedupeKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    // Bersihkan setelah selesai — biarkan request berikutnya (buka ulang modal) jalan normal
    inFlightRequests.delete(dedupeKey)
  }
}

async function handleRequest(
  req: NextRequest,
  customerId: string,
  datasetId: string,
): Promise<NextResponse> {
  // ── Path A: DB sudah punya data lengkap termasuk XAI → instant return ─────
  const existing = await getPrediction(datasetId, customerId)
  if (existing && existing.xai_churn_explanation) {
    return NextResponse.json(existing)
  }

  // ── Path B/C: Perlu panggil Railway ───────────────────────────────────────
  const form = await req.formData()

  let url = RAILWAY_URL
  if (!url.startsWith('http')) url = `https://${url}`
  if (url.endsWith('/')) url = url.slice(0, -1)

  let railwayRes: Response
  try {
    railwayRes = await fetch(
      `${url}/predict/single?customer_id=${encodeURIComponent(customerId)}`,
      { method: 'POST', body: form }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Cannot reach Railway: ${msg}` }, { status: 503 })
  }

  if (!railwayRes.ok) {
    let errDetail = 'Railway error'
    try {
      const errBody = await railwayRes.json()
      errDetail = errBody?.detail ?? errDetail
    } catch { /* ignore parse error */ }
    return NextResponse.json({ error: errDetail }, { status: railwayRes.status })
  }

  let prediction: any
  try {
    prediction = await railwayRes.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from Railway' }, { status: 502 })
  }

  // ── Simpan ke DB (termasuk jika XAI kosong/null — tetap simpan data tabular) ─
  try {
    await savePredictions(datasetId, [prediction])
  } catch (saveErr) {
    // Jangan gagalkan response ke client hanya karena DB save error
    console.error('[predict-single] DB save error:', saveErr)
  }

  return NextResponse.json(prediction)
}