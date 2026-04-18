import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isPavilionId } from '@/lib/pavilions';

type ContactRequestBody = {
    pavilionId?: string;
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    message?: string;
};

const jsonError = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status });

const trim = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export async function POST(request: Request) {
    let payload: ContactRequestBody;
    try {
        payload = (await request.json()) as ContactRequestBody;
    } catch {
        return jsonError(400, 'Invalid JSON body.');
    }

    const pavilionId = trim(payload.pavilionId).toLowerCase();
    const name = trim(payload.name);
    const email = trim(payload.email);
    const message = trim(payload.message);
    const company = trim(payload.company);
    const phone = trim(payload.phone);

    if (!isPavilionId(pavilionId)) return jsonError(400, 'Unknown pavilion.');
    if (!name) return jsonError(400, 'Name is required.');
    if (!email) return jsonError(400, 'Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(400, 'Email is invalid.');
    if (!message) return jsonError(400, 'Message is required.');
    if (message.length > 4000) return jsonError(400, 'Message too long.');

    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('pavilion_contact_requests')
            .insert({
                pavilion_id: pavilionId,
                name,
                company: company || null,
                email,
                phone: phone || null,
                message,
            })
            .select('id, created_at')
            .single();

        if (error) return jsonError(500, error.message || 'Failed to save contact request.');
        return NextResponse.json({ success: true, request: data });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save contact request.';
        return jsonError(500, msg);
    }
}
