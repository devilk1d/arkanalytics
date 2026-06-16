import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReports, createReport, updateReport, deleteReport, getAllPredictions, getSegments } from '@/lib/supabase/db';
import { buildReportFileName } from '@/lib/report-filename';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const workspace_id = req.nextUrl.searchParams.get('workspace_id');
    if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    try {
        const reports = await getReports(workspace_id);
        return NextResponse.json(reports);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { workspace_id, dataset_id, name, type, report_category, date_range, include_segments } = body;
    if (!workspace_id || !type) return NextResponse.json({ error: 'workspace_id and type are required' }, { status: 400 });

    let report: any;
    try {
        report = await createReport({
            workspace_id,
            user_id: user.id,
            dataset_id,
            name: name || `Report ${new Date().toLocaleDateString()}`,
            type,
            status: 'pending'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
        let fileBuffer: Buffer;
        const now = new Date();
        const reportName = name || report_category || 'report';
        let fileName = buildReportFileName(report_category || 'analytics', reportName, type, now);
        let predictions = await getAllPredictions(dataset_id);
        let segments = await getSegments(dataset_id);

        if (date_range === '7d') predictions = predictions.slice(0, Math.floor(predictions.length * 0.3));
        else if (date_range === '30d') predictions = predictions.slice(0, Math.floor(predictions.length * 0.7));

        if (include_segments && include_segments !== 'all') {
            predictions = predictions.filter(p => p.segment_label === include_segments);
            segments = segments.filter(s => s.segment_label === include_segments);
        }

        const totalCustomers = predictions.length;
        let sumChurn = predictions.reduce((acc, p) => acc + (p.churn_score || 0), 0);
        let avgChurnRaw = totalCustomers > 0 ? sumChurn / totalCustomers : 0;
        const displayAvgChurn = avgChurnRaw <= 1 && avgChurnRaw > 0 ? (avgChurnRaw * 100).toFixed(2) : avgChurnRaw.toFixed(2);
        const highRiskCount = predictions.filter(p => p.risk_level === 'High' || p.risk_level === 'Critical' || p.churn_score > 0.7).length;

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
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');
            fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        } 
        else if (type === 'pdf') {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            const addFooter = (doc: any, pageNum: number) => {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Arkanalytics | ${new Date().toLocaleDateString()}`, 14, pageHeight - 10);
                doc.text(`Page ${pageNum}`, pageWidth - 25, pageHeight - 10);
            };

            // Header - Clean & Minimalist
            doc.setFillColor(0, 0, 0);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('ARKANALYTICS', 14, 20);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            doc.text('ADVANCED CUSTOMER INTELLIGENCE REPORT', 14, 28);

            // Report Meta info
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text(`Ref: ${report.id.slice(0, 8).toUpperCase()}`, pageWidth - 50, 18);
            doc.text(`Target: ${include_segments.toUpperCase()}`, pageWidth - 50, 23);
            doc.text(`Range: ${date_range.toUpperCase()}`, pageWidth - 50, 28);

            // Key Metrics - Unified Style
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Performance Summary', 14, 55);

            autoTable(doc, {
                startY: 60,
                head: [['Metric', 'Value', 'Assessment']],
                body: [
                    ['Total Audience', totalCustomers.toLocaleString(), 'Complete Sample'],
                    ['Mean Churn Score', `${displayAvgChurn}%`, parseFloat(displayAvgChurn) > 50 ? 'High Risk' : 'Healthy'],
                    ['At-Risk Customers', highRiskCount.toLocaleString(), highRiskCount > totalCustomers * 0.2 ? 'Critical' : 'Stable'],
                ],
                theme: 'plain',
                headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 4 },
                columnStyles: { 1: { fontStyle: 'bold' } }
            });

            // Actionable Insights - Simple Bullet Points
            const insightsY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text('Actionable Insights', 14, insightsY);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(75, 85, 99);
            
            const insights = [];
            if (parseFloat(displayAvgChurn) > 40) insights.push("• High churn detected. Immediate retention campaign recommended.");
            else insights.push("• Customer health is stable. Focus on upselling premium plans.");
            if (highRiskCount > totalCustomers * 0.2) insights.push("• Critical Mass: More than 20% of customers are at high risk.");
            if (include_segments.toLowerCase().includes('unhappy')) insights.push("• Investigate ticket history for this segment to identify friction.");
            
            let insightPos = insightsY + 8;
            insights.forEach(text => {
                doc.text(text, 14, insightPos);
                insightPos += 6;
            });

            addFooter(doc, 1);

            // Detailed Table Page
            doc.addPage();
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');

            if (report_category === 'churn') {
                doc.text('Customer Churn Risk Breakdown', 14, 20);
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
                doc.text('Financial Risk & Revenue Forecast', 14, 20);
                autoTable(doc, {
                    startY: 25,
                    head: [['#', 'Segment Label', 'Avg Revenue', 'Churn Risk', 'Revenue at Risk']],
                    body: segments.map((s, i) => {
                        const revenueAtRisk = (s.avg_revenue * s.total_customers * (s.avg_churn_score / 100));
                        return [
                            i + 1, 
                            s.segment_label, 
                            `$${Math.round(s.avg_revenue).toLocaleString()}`, 
                            `${s.avg_churn_score}%`, 
                            `$${Math.round(revenueAtRisk).toLocaleString()}`
                        ];
                    }),
                    theme: 'striped',
                    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
                    styles: { fontSize: 8, cellPadding: 3 },
                    didDrawPage: () => addFooter(doc, doc.getNumberOfPages())
                });
            } else {
                doc.text('Customer Segmentation Overview', 14, 20);
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
            throw new Error('Unsupported export type');
        }

        const storagePath = `workspace_${workspace_id}/${report.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('reports').upload(storagePath, fileBuffer, {
            contentType: type === 'pdf' ? 'application/pdf' : type === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
        });
        if (uploadError) throw uploadError;
        await updateReport(report.id, { status: 'ready', storage_path: storagePath, file_size: fileBuffer.length });
        return NextResponse.json({ status: 'success', report_id: report.id });
    } catch (error: any) {
        console.error('Report Error:', error);
        await updateReport(report.id, { status: 'error', error_message: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const reportId = req.nextUrl.searchParams.get('id');
    if (!reportId) return NextResponse.json({ error: 'id required' }, { status: 400 });
    try {
        const { data: report, error: fetchError } = await supabase.from('reports').select('storage_path').eq('id', reportId).single();
        if (fetchError) throw fetchError;
        if (report?.storage_path) await supabase.storage.from('reports').remove([report.storage_path]);
        await deleteReport(reportId);
        return NextResponse.json({ status: 'success' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
