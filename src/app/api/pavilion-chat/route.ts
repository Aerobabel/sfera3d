import { NextResponse } from 'next/server';
import { authenticateAppRequest } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isPavilionId, getPavilionById } from '@/lib/pavilions';
import {
    getPavilionStaffFor,
    type PavilionMessage,
    type PavilionMessageSenderKind,
} from '@/lib/pavilionChat';
import {
    buildPavilionReplyEmail,
    buildVisitorMessageEmail,
    sendPavilionEmail,
} from '@/lib/pavilionNotify';

type MessageRow = {
    id: string;
    pavilion_id: string;
    counterparty_user_id: string;
    sender_kind: PavilionMessageSenderKind;
    sender_user_id: string;
    sender_display_name: string | null;
    body: string;
    created_at: string;
};

const jsonError = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status });

const toApiMessage = (row: MessageRow): PavilionMessage => ({
    id: row.id,
    pavilionId: row.pavilion_id,
    counterpartyUserId: row.counterparty_user_id,
    senderKind: row.sender_kind,
    senderUserId: row.sender_user_id,
    senderDisplayName: row.sender_display_name,
    body: row.body,
    createdAt: Date.parse(row.created_at),
});

// GET /api/pavilion-chat?pavilionId=pav_doublelin&counterpartyUserId=<uuid>
// - Visitor: omits counterpartyUserId → defaults to their own auth uid.
// - Pavilion staff inspecting a specific thread: passes counterpartyUserId.
export async function GET(request: Request) {
    const user = await authenticateAppRequest(request);
    if (!user) return jsonError(401, 'Unauthorized. Sign in and retry.');

    const url = new URL(request.url);
    const pavilionId = (url.searchParams.get('pavilionId') ?? '').trim().toLowerCase();
    const requestedCounterparty = (url.searchParams.get('counterpartyUserId') ?? '').trim();
    if (!isPavilionId(pavilionId)) return jsonError(400, 'Unknown pavilion.');

    const staffFor = getPavilionStaffFor(user.user);
    // Only pavilion staff for THIS pavilion can read arbitrary threads.
    // Everyone else can only read their own thread.
    const isStaffOfThisPavilion = staffFor === `pav_${pavilionId}`;
    const counterpartyUserId = isStaffOfThisPavilion && requestedCounterparty
        ? requestedCounterparty
        : user.id;

    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('pavilion_messages')
            .select('id,pavilion_id,counterparty_user_id,sender_kind,sender_user_id,sender_display_name,body,created_at')
            .eq('pavilion_id', `pav_${pavilionId}`)
            .eq('counterparty_user_id', counterpartyUserId)
            .order('created_at', { ascending: true })
            .limit(500);
        if (error) return jsonError(500, error.message);
        const messages = (data as MessageRow[]).map(toApiMessage);
        return NextResponse.json({ success: true, messages, counterpartyUserId });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load messages.';
        return jsonError(500, msg);
    }
}

type PostBody = {
    pavilionId?: string;
    counterpartyUserId?: string;
    body?: string;
};

export async function POST(request: Request) {
    const user = await authenticateAppRequest(request);
    if (!user) return jsonError(401, 'Unauthorized. Sign in and retry.');

    let payload: PostBody;
    try { payload = (await request.json()) as PostBody; }
    catch { return jsonError(400, 'Invalid JSON body.'); }

    const pavilionId = (payload.pavilionId ?? '').trim().toLowerCase();
    const body = (payload.body ?? '').trim();
    if (!isPavilionId(pavilionId)) return jsonError(400, 'Unknown pavilion.');
    if (!body) return jsonError(400, 'Message body is required.');
    if (body.length > 4000) return jsonError(400, 'Message too long.');

    const staffFor = getPavilionStaffFor(user.user);
    const isStaffOfThisPavilion = staffFor === `pav_${pavilionId}`;

    // Self-messaging guard: a pavilion's staff can't post into their own
    // pavilion's chat as a visitor — it would create a thread where the
    // "visitor" is the pavilion itself, which is nonsensical.
    // They can still REPLY to existing visitor threads (sender_kind='pavilion').
    if (staffFor === `pav_${pavilionId}` && !payload.counterpartyUserId) {
        return jsonError(400, 'Pavilion staff cannot open a new thread in their own pavilion. Use the inbox to reply to a visitor.');
    }

    // Determine the thread counterparty + sender kind.
    // - Staff posting with counterpartyUserId → reply; sender_kind='pavilion'
    // - Anyone else posting → a visitor message; counterparty = self
    let counterpartyUserId: string;
    let senderKind: PavilionMessageSenderKind;
    if (isStaffOfThisPavilion) {
        if (!payload.counterpartyUserId) {
            return jsonError(400, 'counterpartyUserId is required for pavilion replies.');
        }
        counterpartyUserId = payload.counterpartyUserId;
        senderKind = 'pavilion';
    } else {
        counterpartyUserId = user.id;
        senderKind = 'visitor';
    }

    const senderDisplayName = user.displayName || user.email || null;

    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('pavilion_messages')
            .insert({
                pavilion_id: `pav_${pavilionId}`,
                counterparty_user_id: counterpartyUserId,
                sender_kind: senderKind,
                sender_user_id: user.id,
                sender_display_name: senderDisplayName,
                body,
            })
            .select('id,pavilion_id,counterparty_user_id,sender_kind,sender_user_id,sender_display_name,body,created_at')
            .single();
        if (error || !data) return jsonError(500, error?.message || 'Failed to create message.');

        // Fire-and-forget email notification. Never blocks the response.
        void notifyRecipient({
            pavilionId,
            senderKind,
            counterpartyUserId,
            senderDisplayName,
            senderEmail: user.email,
            body,
            request,
        }).catch((err) => console.warn('[pavilion-chat] notify failed', err));

        return NextResponse.json({ success: true, message: toApiMessage(data as MessageRow) });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create message.';
        return jsonError(500, msg);
    }
}

// --- Notification side-effect ---

const notifyRecipient = async (args: {
    pavilionId: string;
    senderKind: PavilionMessageSenderKind;
    counterpartyUserId: string;
    senderDisplayName: string | null;
    senderEmail: string | null;
    body: string;
    request: Request;
}) => {
    const pavilion = getPavilionById(args.pavilionId);
    if (!pavilion) return;

    const origin = new URL(args.request.url).origin;

    if (args.senderKind === 'visitor') {
        // Notify all pavilion staff registered for this pavilion.
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
        if (error || !data?.users) return;
        const recipients = data.users.filter((u) => {
            const m = (u.user_metadata ?? {}) as Record<string, unknown>;
            return typeof m.pavilion_staff_for === 'string' &&
                m.pavilion_staff_for.trim().toLowerCase() === `pav_${args.pavilionId}`;
        });
        const { text, html } = buildVisitorMessageEmail({
            pavilionName: pavilion.name,
            visitorName: args.senderDisplayName ?? 'Visitor',
            visitorEmail: args.senderEmail ?? null,
            body: args.body,
            inboxUrl: `${origin}/pavilion-inbox`,
        });
        for (const recipient of recipients) {
            if (!recipient.email) continue;
            await sendPavilionEmail({
                to: recipient.email,
                subject: `New message for ${pavilion.name}`,
                html,
                text,
            });
        }
    } else {
        // Pavilion replied — notify the counterparty user if we have their email.
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase.auth.admin.getUserById(args.counterpartyUserId);
        if (error || !data?.user?.email) return;
        const { text, html } = buildPavilionReplyEmail({
            pavilionName: pavilion.name,
            body: args.body,
            pavilionUrl: `${origin}/fastview`,
        });
        await sendPavilionEmail({
            to: data.user.email,
            subject: `${pavilion.name} replied`,
            html,
            text,
        });
    }
};
