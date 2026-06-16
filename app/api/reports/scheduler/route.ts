import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    getDueScheduledReports,
    getActiveScheduledReports,
    updateScheduledReportNextRun,
    createReport,
    updateReport,
    getAllPredictions,
    getSegments
} from '@/lib/supabase/db';
import { buildReportFileName } from '@/lib/report-filename';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
    console.log('[SCHEDULER] POST triggered');
    const supabase = await createClient();
    
    // Opsional: Autentikasi token cron rahasia untuk Vercel Cron
    const authHeader = req.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    // Jika bukan pemicu cron resmi, pastikan dipanggil oleh pengguna terautentikasi
    if (!isCron) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized scheduler access' }, { status: 401 });
        }
    }

    // Parse body for manual force-trigger
    let bodyWorkspaceId: string | null = null;
    let force = false;
    try {
        const body = await req.json();
        bodyWorkspaceId = body?.workspace_id ?? null;
        force = body?.force === true;
    } catch {
        // cron trigger sends no body — that's fine
    }

    try {
        const dueSchedules = (force && bodyWorkspaceId)
            ? await getActiveScheduledReports(bodyWorkspaceId)
            : await getDueScheduledReports();
        console.log(`[SCHEDULER] Found ${dueSchedules.length} schedule(s) to run (force=${force})`);
        const results = [];

        for (const schedule of dueSchedules) {
            console.log(`[SCHEDULER] Processing: ${schedule.name} | recipients: ${JSON.stringify(schedule.recipients)} | next_run_at: ${schedule.next_run_at}`);
            try {
                // 1. Resolve dataset: use schedule's dataset_id if set, else latest done dataset for workspace
                let dataset_id: string;
                if (schedule.dataset_id) {
                    dataset_id = schedule.dataset_id;
                } else {
                    const { data: dataset } = await supabase
                        .from('datasets')
                        .select('id')
                        .eq('workspace_id', schedule.workspace_id)
                        .eq('status', 'done')
                        .not('total_customers', 'is', null)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!dataset?.id) {
                        throw new Error('No valid dataset found to generate scheduled report');
                    }
                    dataset_id = dataset.id;
                }
                const type = schedule.export_type;
                const report_category = schedule.report_category;
                const include_segments = schedule.include_segments;
                const date_range = '30d'; // Default periode representatif untuk jadwal berkala

                // 2. Buat entri awal di tabel reports
                const report = await createReport({
                    workspace_id: schedule.workspace_id,
                    user_id: schedule.user_id,
                    dataset_id,
                    name: `${schedule.name} - ${new Date().toLocaleDateString()}`,
                    type,
                    status: 'pending'
                });

                // 3. Ambil data analitik
                let predictions = await getAllPredictions(dataset_id);
                let segments = await getSegments(dataset_id);

                // Filter segmen jika ditentukan
                if (include_segments && include_segments !== 'all') {
                    predictions = predictions.filter(p => p.segment_label === include_segments);
                    segments = segments.filter(s => s.segment_label === include_segments);
                }

                // Kalkulasi metrik ringkasan
                const totalCustomers = predictions.length;
                const sumChurn = predictions.reduce((acc, p) => acc + (p.churn_score || 0), 0);
                const avgChurnRaw = totalCustomers > 0 ? sumChurn / totalCustomers : 0;
                const displayAvgChurn = avgChurnRaw <= 1 && avgChurnRaw > 0 ? (avgChurnRaw * 100).toFixed(2) : avgChurnRaw.toFixed(2);
                const highRiskCount = predictions.filter(p => p.risk_level === 'High' || p.risk_level === 'Critical' || p.churn_score > 0.7).length;

                let fileBuffer: Buffer;
                const now = new Date();
                const fileName = buildReportFileName(report_category, schedule.name, type, now);

                // 4. Pembentukan Dokumen (Sesuai format ekspor)
                if (type === 'csv') {
                    const headers = ['NO', 'Customer ID', 'Plan', 'Contract', 'Churn Score', 'Risk Level', 'Segment'];
                    const rows = predictions.map((p, i) => [
                        i + 1, p.customer_id, p.plan_type, p.contract_type, p.churn_score, p.risk_level, p.segment_label
                    ]);
                    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                    fileBuffer = Buffer.from(csvContent);
                } 
                else if (type === 'xlsx') {
                    const worksheet = XLSX.utils.json_to_sheet(predictions.map((p, i) => ({ NO: i + 1, ...p })));
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scheduled Analytics');
                    fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
                } 
                else if (type === 'pdf') {
                    const doc = new jsPDF();
                    const pageWidth = doc.internal.pageSize.width;
                    const pageHeight = doc.internal.pageSize.height;

                    const addFooter = (doc: any, pageNum: number) => {
                        doc.setFontSize(8);
                        doc.setTextColor(150, 150, 150);
                        doc.text(`Arkanalytics Scheduled | ${new Date().toLocaleDateString()}`, 14, pageHeight - 10);
                        doc.text(`Page ${pageNum}`, pageWidth - 25, pageHeight - 10);
                    };

                    // Header Minimalis Arkanalytics
                    doc.setFillColor(0, 0, 0);
                    doc.rect(0, 0, pageWidth, 40, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(22);
                    doc.setFont('helvetica', 'bold');
                    doc.text('ARKANALYTICS', 14, 20);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(200, 200, 200);
                    doc.text('SCHEDULED CUSTOMER INTELLIGENCE REPORT', 14, 28);

                    // Informasi Rujukan
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(8);
                    doc.text(`Schedule: ${schedule.name.slice(0, 15)}`, pageWidth - 60, 18);
                    doc.text(`Target: ${include_segments.toUpperCase()}`, pageWidth - 60, 23);
                    doc.text(`Freq: ${schedule.frequency.toUpperCase()}`, pageWidth - 60, 28);

                    // Bagian Ringkasan Eksekutif
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Executive Summary', 14, 55);

                    autoTable(doc, {
                        startY: 60,
                        head: [['Metric', 'Value', 'Status']],
                        body: [
                            ['Active Customer Base', totalCustomers.toLocaleString(), 'Tracked Sample'],
                            ['Average Churn Index', `${displayAvgChurn}%`, parseFloat(displayAvgChurn) > 50 ? 'Action Required' : 'Optimal'],
                            ['High-Risk Profile Count', highRiskCount.toLocaleString(), highRiskCount > totalCustomers * 0.2 ? 'Critical Volume' : 'Controlled'],
                        ],
                        theme: 'plain',
                        headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
                        styles: { fontSize: 9, cellPadding: 4 },
                        columnStyles: { 1: { fontStyle: 'bold' } }
                    });

                    addFooter(doc, 1);

                    // Tabel Rincian Data
                    doc.addPage();
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');

                    if (report_category === 'churn') {
                        doc.text('Churn Risk Distribution List', 14, 20);
                        autoTable(doc, {
                            startY: 25,
                            head: [['#', 'Customer ID', 'Score', 'Risk', 'Segment']],
                            body: predictions.map((p, i) => [
                                i + 1, p.customer_id, `${p.churn_score}%`, p.risk_level, p.segment_label
                            ]),
                            theme: 'striped',
                            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
                            styles: { fontSize: 8, cellPadding: 3 },
                            didDrawPage: () => addFooter(doc, doc.getNumberOfPages())
                        });
                    } else if (report_category === 'forecast') {
                        doc.text('Segment Revenue Risk Forecast', 14, 20);
                        autoTable(doc, {
                            startY: 25,
                            head: [['#', 'Segment Label', 'Avg Revenue', 'Churn Risk', 'Est. Loss Risk']],
                            body: segments.map((s, i) => {
                                const lossRisk = (s.avg_revenue * s.total_customers * (s.avg_churn_score / 100));
                                return [
                                    i + 1, 
                                    s.segment_label, 
                                    `$${Math.round(s.avg_revenue).toLocaleString()}`, 
                                    `${s.avg_churn_score}%`, 
                                    `$${Math.round(lossRisk).toLocaleString()}`
                                ];
                            }),
                            theme: 'striped',
                            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
                            styles: { fontSize: 8, cellPadding: 3 },
                            didDrawPage: () => addFooter(doc, doc.getNumberOfPages())
                        });
                    } else {
                        doc.text('Population Analytics Overview', 14, 20);
                        autoTable(doc, {
                            startY: 25,
                            head: [['#', 'Segment Label', 'Population', 'Churn %', 'Revenue']],
                            body: segments.map((s, i) => [
                                i + 1, s.segment_label, s.total_customers.toLocaleString(), `${s.avg_churn_score}%`, `$${Math.round(s.avg_revenue).toLocaleString()}`
                            ]),
                            theme: 'striped',
                            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
                            styles: { fontSize: 8, cellPadding: 3 },
                            didDrawPage: () => addFooter(doc, doc.getNumberOfPages())
                        });
                    }

                    fileBuffer = Buffer.from(doc.output('arraybuffer'));
                } else {
                    throw new Error('Unsupported format');
                }

                // 5. Upload ke Supabase Storage
                const storagePath = `workspace_${schedule.workspace_id}/${report.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('reports').upload(storagePath, fileBuffer, {
                    contentType: type === 'pdf' ? 'application/pdf' : type === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
                });

                if (uploadError) throw uploadError;

                // Tandai report selesai
                await updateReport(report.id, { 
                    status: 'ready', 
                    storage_path: storagePath, 
                    file_size: fileBuffer.length 
                });

                // 6. Hitung & perbarui waktu eksekusi jadwal berikutnya
                let nextRunAt = new Date(schedule.next_run_at);
                
                // Pastikan menggunakan jam dan menit yang konsisten dari konfigurasi
                const timeStr = schedule.time_of_day || '08:00';
                const [h, m] = timeStr.split(':').map(Number);
                
                // Jika nextRunAt di masa lalu atau hari ini, mulai proyeksikan ke depan
                if (nextRunAt <= now) {
                    nextRunAt = new Date();
                }
                nextRunAt.setHours(h || 8, m || 0, 0, 0);

                if (schedule.frequency === 'daily') {
                    nextRunAt.setDate(nextRunAt.getDate() + 1);
                } else if (schedule.frequency === 'weekly') {
                    nextRunAt.setDate(nextRunAt.getDate() + 7);
                    // Pastikan harinya konsisten
                    if (schedule.day_of_week !== null && schedule.day_of_week !== undefined) {
                        while (nextRunAt.getDay() !== schedule.day_of_week) {
                            nextRunAt.setDate(nextRunAt.getDate() + 1);
                        }
                    }
                } else if (schedule.frequency === 'monthly') {
                    nextRunAt.setMonth(nextRunAt.getMonth() + 1);
                    if (schedule.day_of_month) {
                        nextRunAt.setDate(schedule.day_of_month);
                    }
                }

                await updateScheduledReportNextRun(
                    schedule.id, 
                    nextRunAt.toISOString(), 
                    now.toISOString()
                );

                // 7. Kirim Email Notifikasi via Resend (jika ada recipients)
                if (schedule.recipients && schedule.recipients.length > 0) {
                    const apiKey = process.env.RESEND_API_KEY;
                    if (apiKey) {
                        try {
                            const resendInstance = new Resend(apiKey);
                            const resendOutput = await resendInstance.emails.send({
                                from: 'Arkanalytics Reports <noreply@arkanalytics.site>',
                                to: schedule.recipients,
                                subject: `[Arkanalytics] Scheduled Report: ${schedule.name}`,
                                html: `
                                    <!DOCTYPE html>
                                    <html lang="en">
                                    <head>
                                    <meta charset="UTF-8" />
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                                    <title>Automated Report</title>
                                    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;800&family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
                                    </head>
                                    <body style="margin:0;padding:0;background-color:#f5f5f3;">

                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f3;padding:40px 16px;">
                                        <tr>
                                        <td align="center">
                                            <table width="100%" cellpadding="0" cellspacing="0"
                                            style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e5;">

                                            <!-- ── HEADER ── -->
                                            <tr>
                                                <td style="padding:24px 32px;border-bottom:1px solid #e8e8e5;">
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                    <td style="vertical-align:middle;">
                                                        <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="vertical-align:middle;padding-right:10px;">
                                                            <img
                                                                src="https://jplrvebvjugbmnhapwpo.supabase.co/storage/v1/object/public/files/logo_arka_hitam.png"
                                                                alt="Arkanalytics"
                                                                height="28"
                                                                style="display:block;"
                                                            />
                                                            </td>
                                                            <td style="vertical-align:middle;">
                                                            <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:17px;font-weight:700;color:#111111;letter-spacing:-0.3px;">Arkanalytics</span>
                                                            </td>
                                                        </tr>
                                                        </table>
                                                    </td>

                                                    <td align="right" style="vertical-align:middle;">
                                                        <div style="width:38px;height:38px;border:1px solid #e0e0dc;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                                                        <!-- Report / file icon -->
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                                                            stroke="#333333" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                                            <polyline points="14 2 14 8 20 8"/>
                                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                                            <polyline points="10 9 9 9 8 9"/>
                                                        </svg>
                                                        </div>
                                                    </td>
                                                    </tr>
                                                </table>
                                                </td>
                                            </tr>

                                            <!-- ── BODY ── -->
                                            <tr>
                                                <td style="padding:40px 32px 0 32px;">

                                                <p style="font-family:'Inter',Arial,sans-serif;font-size:14px;color:#888888;margin:0 0 8px;font-weight:500;letter-spacing:0.1px;">
                                                    Hello,
                                                </p>

                                                <h1 style="font-family:'Space Grotesk',Arial,sans-serif;margin:0 0 20px;font-size:36px;font-weight:800;line-height:1.15;color:#111111;letter-spacing:-0.5px;">
                                                    Automated<br/>Report Ready
                                                </h1>

                                                <p style="font-family:'Inter',Arial,sans-serif;margin:0 0 28px;font-size:16px;color:#444444;line-height:1.6;">
                                                    Your scheduled report <strong>${schedule.name}</strong> has been successfully generated and is ready for review.
                                                </p>

                                                <!-- ── Report Detail Cards ── -->
                                                <table width="100%" cellpadding="0" cellspacing="0"
                                                    style="border:1px solid #e8e8e5;border-radius:10px;margin-bottom:28px;">

                                                    <!-- Category -->
                                                    <tr>
                                                    <td style="padding:14px 20px;border-bottom:1px solid #e8e8e5;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="vertical-align:middle;">
                                                            <p style="font-family:'Inter',Arial,sans-serif;margin:0 0 3px;font-size:11px;font-weight:500;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Category</p>
                                                            <p style="font-family:'Space Grotesk',Arial,sans-serif;margin:0;font-size:14px;font-weight:700;color:#111111;text-transform:uppercase;">${schedule.report_category}</p>
                                                            </td>
                                                            <td align="right" style="vertical-align:middle;">
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cccccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                                                                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                                                            </svg>
                                                            </td>
                                                        </tr>
                                                        </table>
                                                    </td>
                                                    </tr>

                                                    <!-- Target Segment -->
                                                    <tr>
                                                    <td style="padding:14px 20px;border-bottom:1px solid #e8e8e5;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="vertical-align:middle;">
                                                            <p style="font-family:'Inter',Arial,sans-serif;margin:0 0 3px;font-size:11px;font-weight:500;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Target Segment</p>
                                                            <p style="font-family:'Space Grotesk',Arial,sans-serif;margin:0;font-size:14px;font-weight:700;color:#111111;">${schedule.include_segments}</p>
                                                            </td>
                                                            <td align="right" style="vertical-align:middle;">
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cccccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                                                <circle cx="9" cy="7" r="4"/>
                                                                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                                                                <path d="M16 3.13a4 4 0 010 7.75"/>
                                                            </svg>
                                                            </td>
                                                        </tr>
                                                        </table>
                                                    </td>
                                                    </tr>

                                                    <!-- Format -->
                                                    <tr>
                                                    <td style="padding:14px 20px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="vertical-align:middle;">
                                                            <p style="font-family:'Inter',Arial,sans-serif;margin:0 0 3px;font-size:11px;font-weight:500;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Format</p>
                                                            <p style="font-family:'Space Grotesk',Arial,sans-serif;margin:0;font-size:14px;font-weight:700;color:#111111;text-transform:uppercase;">${schedule.export_type}</p>
                                                            </td>
                                                            <td align="right" style="vertical-align:middle;">
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cccccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                                                <polyline points="14 2 14 8 20 8"/>
                                                            </svg>
                                                            </td>
                                                        </tr>
                                                        </table>
                                                    </td>
                                                    </tr>

                                                </table>

                                                <!-- ── Attachment notice ── -->
                                                <table width="100%" cellpadding="0" cellspacing="0"
                                                    style="border:1px solid #e8e8e5;border-radius:10px;margin-bottom:32px;">
                                                    <tr>
                                                    <td style="padding:16px 20px;">
                                                        <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="vertical-align:top;padding-right:14px;width:36px;">
                                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                                                                stroke="#333333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                                                            </svg>
                                                            </td>
                                                            <td>
                                                            <p style="font-family:'Space Grotesk',Arial,sans-serif;margin:0 0 4px;font-size:14px;font-weight:700;color:#111111;">Report attached to this email</p>
                                                            <p style="font-family:'Inter',Arial,sans-serif;margin:0;font-size:13px;color:#666666;line-height:1.5;">You can also view historical exports directly within your Arkanalytics workspace dashboard.</p>
                                                            </td>
                                                        </tr>
                                                        </table>
                                                    </td>
                                                    </tr>
                                                </table>

                                                </td>
                                            </tr>

                                            <!-- ── DIVIDER ── -->
                                            <tr>
                                                <td style="padding:0 32px;">
                                                <hr style="border:none;border-top:1px solid #e8e8e5;margin:0;" />
                                                </td>
                                            </tr>

                                            <!-- ── HELP SECTION ── -->
                                            <tr>
                                                <td style="padding:24px 32px;">
                                                <table cellpadding="0" cellspacing="0">
                                                    <tr>
                                                    <td style="vertical-align:top;padding-right:14px;">
                                                        <div style="width:30px;height:30px;border:1.5px solid #999999;border-radius:50%;text-align:center;line-height:28px;font-size:14px;color:#666666;font-family:'Inter',Arial,sans-serif;">?</div>
                                                    </td>
                                                    <td style="vertical-align:top;">
                                                        <p style="font-family:'Space Grotesk',Arial,sans-serif;margin:0 0 4px;font-size:14px;font-weight:700;color:#111111;">Need help?</p>
                                                        <p style="font-family:'Inter',Arial,sans-serif;margin:0;font-size:13px;color:#666666;line-height:1.5;">If you weren't expecting this report or have questions, you can manage your schedules from your Arkanalytics dashboard.</p>
                                                    </td>
                                                    </tr>
                                                </table>
                                                </td>
                                            </tr>

                                            <!-- ── FOOTER ── -->
                                            <tr>
                                                <td style="padding:20px 32px;border-top:1px solid #e8e8e5;">
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                    <td style="vertical-align:middle;">
                                                        <p style="font-family:'Space Grotesk',Arial,sans-serif;margin:0;font-size:14px;font-weight:700;color:#111111;">Arkanalytics</p>
                                                        <p style="font-family:'Inter',Arial,sans-serif;margin:4px 0 0;font-size:12px;color:#999999;">All rights reserved.</p>
                                                    </td>
                                                    <td align="right" style="vertical-align:middle;">
                                                        <a href="#" style="text-decoration:none;display:inline-block;margin-left:14px;vertical-align:middle;">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#555555" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                                        </svg>
                                                        </a>
                                                        <a href="#" style="text-decoration:none;display:inline-block;margin-left:14px;vertical-align:middle;">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#555555" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/>
                                                            <rect x="2" y="9" width="4" height="12"/>
                                                            <circle cx="4" cy="4" r="2"/>
                                                        </svg>
                                                        </a>
                                                        <a href="#" style="text-decoration:none;display:inline-block;margin-left:14px;vertical-align:middle;">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                            <circle cx="12" cy="12" r="10"/>
                                                            <path d="M2 12h20"/>
                                                            <path d="M12 2a15.3 15.3 0 010 20"/>
                                                            <path d="M12 2a15.3 15.3 0 000 20"/>
                                                        </svg>
                                                        </a>
                                                    </td>
                                                    </tr>
                                                </table>
                                                </td>
                                            </tr>

                                            </table>
                                        </td>
                                        </tr>
                                    </table>

                                    </body>
                                    </html>
                                `,
                                attachments: [
                                    {
                                        filename: fileName,
                                        content: fileBuffer,
                                    }
                                ]
                            });

                            if (resendOutput.error) {
                                console.error('Resend API returned error:', resendOutput.error);
                            } else {
                                console.log(`Email sent successfully to ${schedule.recipients.join(', ')}`, resendOutput.data);
                            }
                        } catch (emailErr) {
                            console.error('Failed sending email via Resend catch block:', emailErr);
                        }
                    } else {
                        console.log(`[SIMULATION] Email ready for ${schedule.recipients.join(', ')} with attachment "${fileName}". Set RESEND_API_KEY to transmit.`);
                    }
                }

                results.push({ schedule_id: schedule.id, status: 'success', report_id: report.id });
            } catch (err: any) {
                console.error(`Failed executing schedule ${schedule.id}:`, err);
                results.push({ schedule_id: schedule.id, status: 'error', message: err.message });
            }
        }

        return NextResponse.json({ executed_count: results.length, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
