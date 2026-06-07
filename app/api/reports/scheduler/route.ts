import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
    getDueScheduledReports, 
    updateScheduledReportNextRun, 
    createReport, 
    updateReport, 
    getAllPredictions, 
    getSegments 
} from '@/lib/supabase/db';
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

    try {
        const dueSchedules = await getDueScheduledReports();
        console.log(`[SCHEDULER] Found ${dueSchedules.length} due schedule(s)`);
        const results = [];

        for (const schedule of dueSchedules) {
            console.log(`[SCHEDULER] Processing: ${schedule.name} | recipients: ${JSON.stringify(schedule.recipients)} | next_run_at: ${schedule.next_run_at}`);
            try {
                // 1. Cari dataset terbaru yang valid untuk workspace/user ini
                const { data: dataset } = await supabase
                    .from('datasets')
                    .select('id')
                    .not('total_customers', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!dataset?.id) {
                    throw new Error('No valid dataset found to generate scheduled report');
                }

                const dataset_id = dataset.id;
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
                const fileName = `${report.id}.${type}`;

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
                const storagePath = `workspace_${schedule.workspace_id}/${fileName}`;
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
                const now = new Date();
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
                                from: 'Arkanalytics Reports <onboarding@resend.dev>',
                                to: schedule.recipients,
                                subject: `[Arkanalytics] Scheduled Report: ${schedule.name}`,
                                html: `
                                    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #111;">
                                        <h2 style="color: #000;">Arkanalytics Automated Report</h2>
                                        <p>Hello,</p>
                                        <p>Your scheduled report <strong>"${schedule.name}"</strong> has been successfully generated.</p>
                                        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                            <tr style="border-bottom: 1px solid #eee;">
                                                <td style="padding: 8px 0; color: #666;">Category:</td>
                                                <td style="padding: 8px 0; font-weight: bold; text-transform: uppercase;">${schedule.report_category}</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid #eee;">
                                                <td style="padding: 8px 0; color: #666;">Target Segment:</td>
                                                <td style="padding: 8px 0; font-weight: bold;">${schedule.include_segments}</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid #eee;">
                                                <td style="padding: 8px 0; color: #666;">Format:</td>
                                                <td style="padding: 8px 0; font-weight: bold; text-transform: uppercase;">${schedule.export_type}</td>
                                            </tr>
                                        </table>
                                        <p style="margin-top: 20px; font-size: 13px; color: #888;">
                                            The document is attached to this email. You can also view historical exports directly within your Arkanalytics workspace dashboard.
                                        </p>
                                    </div>
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
