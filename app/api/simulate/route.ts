// app/api/simulate/route.ts
// SSE proxy: forwards simulate request to Railway and streams response.

import { NextRequest } from 'next/server'

const RAILWAY_URL = process.env.RAILWAY_API_URL!

export async function POST(req: NextRequest) {
  const body = await req.json()

  let base = RAILWAY_URL
  if (!base.startsWith('http')) base = `https://${base}`
  base = base.replace(/\/$/, '')

  let railwayRes: Response
  try {
    railwayRes = await fetch(`${base}/simulate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: `Cannot reach model service: ${msg}` })}\n\n`,
      { status: 503, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  if (!railwayRes.ok) {
    let detail = 'Model service error'
    try {
      const errBody = await railwayRes.json() as { detail?: string }
      detail = errBody?.detail ?? detail
    } catch { /* ignore */ }
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: detail })}\n\n`,
      { status: railwayRes.status, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  return new Response(railwayRes.body, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
      'Connection':        'keep-alive',
    },
  })
}
