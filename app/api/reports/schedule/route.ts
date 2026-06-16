import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getScheduledReports, createScheduledReport, deleteScheduledReport } from '@/lib/supabase/db';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspace_id = req.nextUrl.searchParams.get('workspace_id');
    if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

    try {
        const schedules = await getScheduledReports(workspace_id);
        return NextResponse.json(schedules);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
        workspace_id,
        dataset_id,
        name,
        frequency,
        report_category,
        export_type,
        include_segments,
        recipients
    } = body;

    if (!workspace_id || !name || !frequency || !report_category || !export_type) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json({ error: 'At least one recipient email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((e: any) => typeof e !== 'string' || !emailRegex.test(e.trim()));
    if (invalidEmails.length > 0) {
        return NextResponse.json({ error: `Invalid recipient email format: ${invalidEmails.join(', ')}` }, { status: 400 });
    }

    const timeOfDay = body.time_of_day || '08:00';
    const dayOfWeek = body.day_of_week !== undefined && body.day_of_week !== '' ? Number(body.day_of_week) : null;
    const dayOfMonth = body.day_of_month !== undefined && body.day_of_month !== '' ? Number(body.day_of_month) : null;

    // Hitung waktu eksekusi berikutnya yang presisi
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    let nextRunAt = new Date();
    nextRunAt.setHours(hours || 8, minutes || 0, 0, 0);

    // Jika jam untuk hari ini sudah lewat, jadwalkan mulai besok
    if (nextRunAt <= new Date()) {
        nextRunAt.setDate(nextRunAt.getDate() + 1);
    }

    if (frequency === 'weekly' && dayOfWeek !== null) {
        // Cari hari dalam seminggu yang cocok (0=Sun, 1=Mon, ..., 6=Sat)
        while (nextRunAt.getDay() !== dayOfWeek) {
            nextRunAt.setDate(nextRunAt.getDate() + 1);
        }
    } else if (frequency === 'monthly' && dayOfMonth !== null) {
        // Atur tanggal dalam sebulan (1..31)
        nextRunAt.setDate(dayOfMonth);
        if (nextRunAt <= new Date()) {
            // Jika tanggal tersebut di bulan ini sudah lewat, gunakan bulan depan
            nextRunAt.setMonth(nextRunAt.getMonth() + 1);
            // Set ulang tanggal untuk berjaga-jaga jika terjadi pergeseran
            nextRunAt.setDate(dayOfMonth);
        }
    }

    try {
        const schedule = await createScheduledReport({
            workspace_id,
            user_id: user.id,
            dataset_id: dataset_id || null,
            name,
            frequency,
            report_category,
            export_type,
            include_segments: include_segments || 'all',
            recipients: Array.isArray(recipients) ? recipients : [],
            time_of_day: timeOfDay,
            day_of_week: dayOfWeek,
            day_of_month: dayOfMonth,
            next_run_at: nextRunAt.toISOString()
        });

        return NextResponse.json({ status: 'success', schedule });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const scheduleId = req.nextUrl.searchParams.get('id');
    if (!scheduleId) return NextResponse.json({ error: 'id required' }, { status: 400 });

    try {
        await deleteScheduledReport(scheduleId);
        return NextResponse.json({ status: 'success' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
