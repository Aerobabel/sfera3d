import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isPavilionId } from '@/lib/pavilions';

type BookingRequestBody = {
    pavilionId?: string;
    name?: string;
    email?: string;
    company?: string;
    slotAt?: string; // ISO string
    durationMinutes?: number;
    notes?: string;
};

const jsonError = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status });

const trim = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// Return any booking slots already taken for a pavilion on/after the given day.
export async function GET(request: Request) {
    const url = new URL(request.url);
    const pavilionId = (url.searchParams.get('pavilionId') ?? '').trim().toLowerCase();
    if (!isPavilionId(pavilionId)) return jsonError(400, 'Unknown pavilion.');

    const fromParam = url.searchParams.get('from');
    const fromIso = fromParam && !Number.isNaN(Date.parse(fromParam)) ? fromParam : new Date().toISOString();

    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('pavilion_bookings')
            .select('slot_at, duration_minutes, status')
            .eq('pavilion_id', pavilionId)
            .in('status', ['requested', 'confirmed'])
            .gte('slot_at', fromIso)
            .order('slot_at', { ascending: true });

        if (error) return jsonError(500, error.message);
        return NextResponse.json({
            success: true,
            taken: (data ?? []).map((row) => ({
                slotAt: row.slot_at,
                durationMinutes: row.duration_minutes,
            })),
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load bookings.';
        return jsonError(500, msg);
    }
}

export async function POST(request: Request) {
    let payload: BookingRequestBody;
    try {
        payload = (await request.json()) as BookingRequestBody;
    } catch {
        return jsonError(400, 'Invalid JSON body.');
    }

    const pavilionId = trim(payload.pavilionId).toLowerCase();
    const name = trim(payload.name);
    const email = trim(payload.email);
    const company = trim(payload.company);
    const notes = trim(payload.notes);
    const slotAtRaw = trim(payload.slotAt);
    const durationMinutes =
        typeof payload.durationMinutes === 'number' && payload.durationMinutes > 0
            ? Math.min(240, Math.round(payload.durationMinutes))
            : 30;

    if (!isPavilionId(pavilionId)) return jsonError(400, 'Unknown pavilion.');
    if (!name) return jsonError(400, 'Name is required.');
    if (!email) return jsonError(400, 'Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(400, 'Email is invalid.');
    if (!slotAtRaw) return jsonError(400, 'Meeting time is required.');
    const slotMs = Date.parse(slotAtRaw);
    if (Number.isNaN(slotMs)) return jsonError(400, 'Meeting time is invalid.');
    if (slotMs < Date.now() - 60_000) return jsonError(400, 'Meeting time must be in the future.');

    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('pavilion_bookings')
            .insert({
                pavilion_id: pavilionId,
                name,
                email,
                company: company || null,
                slot_at: new Date(slotMs).toISOString(),
                duration_minutes: durationMinutes,
                notes: notes || null,
            })
            .select('id, slot_at, duration_minutes, status')
            .single();

        if (error) return jsonError(500, error.message || 'Failed to create booking.');
        return NextResponse.json({ success: true, booking: data });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create booking.';
        return jsonError(500, msg);
    }
}
