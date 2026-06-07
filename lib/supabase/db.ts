// lib/supabase/db.ts
// Helper functions untuk semua operasi database
// Digunakan di API routes (server-side only)

import { createClient } from './server'
import { createAdminClient } from './admin'
import { CustomerPrediction } from '@/types/churn'

// ── Datasets ──────────────────────────────────────────────────────────────────

export async function createDataset(userId: string, storagePath: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('datasets')
        .insert({ user_id: userId, storage_path: storagePath, status: 'pending' })
        .select('id')
        .single()
    if (error) throw error
    return data
}

export async function updateDatasetStatus(
    datasetId: string,
    status: 'pending' | 'analyzing' | 'done' | 'error',
    extra?: { total_customers?: number; churn_rate_pct?: number; error_message?: string }
) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('datasets')
        .update({ status, analyzed_at: status === 'done' ? new Date().toISOString() : null, ...extra })
        .eq('id', datasetId)
    if (error) throw error
}

export async function getDatasets(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return data
}

// ── Predictions ───────────────────────────────────────────────────────────────

/**
 * Simpan semua predictions ke DB setelah /predict selesai.
 * Gunakan upsert agar aman jika di-run ulang.
 */
export async function savePredictions(datasetId: string, predictions: CustomerPrediction[]) {
    const supabase = createAdminClient()

    // Cast ke unknown agar bisa akses field v2.3 yang belum ada di type CustomerPrediction
    const rows = (predictions as unknown as Record<string, unknown>[]).map(p => ({
        dataset_id: datasetId,
        customer_id: p.customer_id,
        plan_type: p.plan_type,
        contract_type: p.contract_type,
        churn_score: p.churn_score,
        churn_proba: p.churn_proba,
        tabular_proba: p.tabular_proba,
        nlp_proba: p.nlp_proba ?? null,
        risk_level: p.risk_level,
        shap_top5: p.shap_top5,             // jsonb
        sentiment: p.sentiment,              // jsonb
        nlp_red_flag: (p.nlp_red_flag as number) ?? 0,
        // ── v2.3: field baru ───────────────────────────────────────────
        loyalty_risk_flag: (p.loyalty_risk_flag as number) ?? 0,
        has_nps_data: (p.has_nps_data as number) ?? 1,
        // ──────────────────────────────────────────────────────────────
        segment_label: p.segment_label,
        segment_cluster: p.segment_cluster,
        segment_rfm_context: p.segment_rfm_context,   // jsonb
        xai_churn_explanation: (p.xai_churn_explanation as string | null) ?? null,
        xai_segment_explanation: (p.xai_segment_explanation as string | null) ?? null,
    }))

    const CHUNK = 250
    for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase
            .from('predictions')
            .upsert(rows.slice(i, i + CHUNK), { onConflict: 'dataset_id,customer_id' })
        if (error) throw error
    }
}

/**
 * Ambil satu prediction dari DB.
 * Return null jika belum ada → frontend harus panggil Railway.
 */
export async function getPrediction(datasetId: string, customerId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('dataset_id', datasetId)
        .eq('customer_id', customerId)
        .maybeSingle()
    if (error) throw error
    return data  // null jika tidak ada
}

/**
 * Ambil semua predictions untuk satu dataset.
 * Untuk halaman Customer Analytics (list semua customer).
 */
export async function getAllPredictions(datasetId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('predictions')
        .select('customer_id,plan_type,contract_type,churn_score,risk_level,segment_label')
        .eq('dataset_id', datasetId)
        .order('churn_score', { ascending: false })
    if (error) throw error
    return data
}

/**
 * Update XAI narasi untuk customer yang sudah ada di DB.
 * Dipanggil setelah Qwen selesai generate narasi.
 */
export async function updateXaiNarrative(
    datasetId: string,
    customerId: string,
    xaiChurn: string,
    xaiSegment: string
) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('predictions')
        .update({ xai_churn_explanation: xaiChurn, xai_segment_explanation: xaiSegment })
        .eq('dataset_id', datasetId)
        .eq('customer_id', customerId)
    if (error) throw error
}

// ── Segments ──────────────────────────────────────────────────────────────────

export async function saveSegments(
    datasetId: string,
    predictions: CustomerPrediction[],
    cohortXai?: Record<string, unknown>
) {
    const supabase = createAdminClient()

    // Aggregate per segment dari predictions
    const segmentMap: Record<string, {
        cluster: number, scores: number[], revenues: number[], usages: number[],
        npss: number[], tenures: number[], risks: string[], actions: object
    }> = {}

    for (const p of predictions) {
        const seg = p.segment_label
        if (!segmentMap[seg]) {
            segmentMap[seg] = {
                cluster: p.segment_cluster, scores: [], revenues: [], usages: [],
                npss: [], tenures: [], risks: [], actions: p.segment_actions ?? {}
            }
        }
        segmentMap[seg].scores.push(p.churn_score)
        segmentMap[seg].risks.push(p.risk_level)
        // revenue, usage, nps dari rfm_context
        segmentMap[seg].revenues.push(p.segment_rfm_context.total_revenue.customer)
        segmentMap[seg].usages.push(p.segment_rfm_context.monthly_usage_hrs.customer)
        segmentMap[seg].npss.push(p.segment_rfm_context.avg_nps_score.customer)
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const pct = (arr: string[], val: string) => (arr.filter(v => v === val).length / arr.length) * 100

    const now = new Date().toISOString()

    const rows = Object.entries(segmentMap).map(([label, s]) => {
        const xai = cohortXai?.[label]
        return {
            dataset_id: datasetId,
            segment_label: label,
            segment_cluster: s.cluster,
            total_customers: s.scores.length,
            avg_churn_score: Math.round(avg(s.scores) * 10) / 10,
            pct_high_risk: Math.round(pct(s.risks, 'High') * 10) / 10,
            avg_revenue: Math.round(avg(s.revenues) * 100) / 100,
            avg_usage_hrs: Math.round(avg(s.usages) * 100) / 100,
            avg_nps: Math.round(avg(s.npss) * 100) / 100,
            segment_actions: s.actions,
            ...(xai ? { xai_cohort: xai, xai_cohort_generated_at: now } : {}),
        }
    })

    const { error } = await supabase
        .from('segments')
        .upsert(rows, { onConflict: 'dataset_id,segment_label' })
    if (error) throw error
}

export async function updateSegmentCohortXai(
    datasetId: string,
    segmentLabel: string,
    xaiCohort: unknown
) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('segments')
        .update({ xai_cohort: xaiCohort, xai_cohort_generated_at: new Date().toISOString() })
        .eq('dataset_id', datasetId)
        .eq('segment_label', segmentLabel)
    if (error) throw error
}

export async function getSegments(datasetId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('avg_churn_score', { ascending: false })
    if (error) throw error
    return data
}

export async function getCustomersBySegment(datasetId: string, segmentLabel: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('predictions')
        .select('customer_id,plan_type,contract_type,churn_score,risk_level,sentiment,xai_segment_explanation')
        .eq('dataset_id', datasetId)
        .eq('segment_label', segmentLabel)
        .order('churn_score', { ascending: false })
    if (error) throw error
    return data
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getReports(workspaceId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return data
}

export async function createReport(reportData: {
    workspace_id: string,
    user_id: string,
    dataset_id?: string,
    name: string,
    type: 'pdf' | 'csv' | 'xlsx',
    status: 'pending' | 'ready' | 'error'
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function updateReport(reportId: string, updates: {
    status?: 'pending' | 'ready' | 'error',
    storage_path?: string,
    file_size?: number,
    error_message?: string
}) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId)
    if (error) throw error
}

export async function deleteReport(reportId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)
    if (error) throw error
}

// ── Scheduled Reports ─────────────────────────────────────────────────────────

export async function getScheduledReports(workspaceId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return data
}

export async function createScheduledReport(scheduleData: {
    workspace_id: string,
    user_id: string,
    name: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    report_category: 'churn' | 'segmentation' | 'forecast',
    export_type: 'pdf' | 'csv' | 'xlsx',
    include_segments: string,
    recipients: string[],
    time_of_day?: string,
    day_of_week?: number | null,
    day_of_month?: number | null,
    next_run_at: string
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('scheduled_reports')
        .insert(scheduleData)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function deleteScheduledReport(scheduleId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', scheduleId)
    if (error) throw error
}

export async function getDueScheduledReports() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('is_active', true)
        .lte('next_run_at', new Date().toISOString())
    if (error) throw error
    return data
}

export async function updateScheduledReportNextRun(scheduleId: string, nextRunAt: string, lastRunAt: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('scheduled_reports')
        .update({ next_run_at: nextRunAt, last_run_at: lastRunAt })
        .eq('id', scheduleId)
    if (error) throw error
}