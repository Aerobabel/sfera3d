import { NextResponse } from 'next/server';
import { authenticateAppRequest } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPavilionStaffPavilionIds, type PavilionMessage, type PavilionThreadSummary } from '@/lib/pavilionChat';

type MessageRow = {
    id: string;
    pavilion_id: string;
    counterparty_user_id: string;
    sender_kind: 'visitor' | 'pavilion';
    sender_user_id: string;
    sender_display_name: string | null;
    body: string;
    created_at: string;
};

type InboxResponse = {
    success: true;
    pavilionId: string | null;
    pavilionIds: string[];
    threads: PavilionThreadSummary[];
};

const jsonError = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status });

// GET /api/pavilion-inbox
// Returns a grouped thread list for the authed pavilion-staff user:
//   - one row per counterparty_user_id
//   - sorted by last-message time, newest first
//   - includes preview, count, counterparty display_name & email
export async function GET(request: Request) {
    const user = await authenticateAppRequest(request);
    if (!user) return jsonError(401, 'Unauthorized. Sign in and retry.');

    const staffFor = getPavilionStaffPavilionIds(user.user);
    if (staffFor.length === 0) return jsonError(403, 'Not a pavilion staff account.');

    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('pavilion_messages')
            .select('id,pavilion_id,counterparty_user_id,sender_kind,sender_user_id,sender_display_name,body,created_at')
            .in('pavilion_id', staffFor)
            .order('created_at', { ascending: false })
            .limit(2000);
        if (error) return jsonError(500, error.message);

        const rows = (data as MessageRow[]) ?? [];

        // Collapse to one summary per counterparty. Because we ordered
        // by created_at desc, the first row we see per counterparty is
        // that thread's most recent message.
        const threadMap = new Map<string, PavilionThreadSummary>();
        for (const row of rows) {
            const key = `${row.pavilion_id}:${row.counterparty_user_id}`;
            if (!threadMap.has(key)) {
                const lastMessage: PavilionMessage = {
                    id: row.id,
                    pavilionId: row.pavilion_id,
                    counterpartyUserId: row.counterparty_user_id,
                    senderKind: row.sender_kind,
                    senderUserId: row.sender_user_id,
                    senderDisplayName: row.sender_display_name,
                    body: row.body,
                    createdAt: Date.parse(row.created_at),
                };
                threadMap.set(key, {
                    pavilionId: row.pavilion_id,
                    counterpartyUserId: row.counterparty_user_id,
                    counterpartyDisplayName: null,
                    counterpartyEmail: null,
                    lastMessage,
                    messageCount: 1,
                });
            } else {
                threadMap.get(key)!.messageCount += 1;
            }
        }

        // Hydrate counterparty display_name + email via a single batch
        // lookup against auth.users.
        const counterpartyIds = Array.from(threadMap.keys());
        if (counterpartyIds.length > 0) {
            const { data: usersResp } = await supabase.auth.admin.listUsers({ perPage: 200 });
            const usersById = new Map((usersResp?.users ?? []).map((u) => [u.id, u]));
            for (const summary of threadMap.values()) {
                const counterparty = usersById.get(summary.counterpartyUserId);
                if (!counterparty) continue;
                const metadata = (counterparty.user_metadata ?? {}) as Record<string, unknown>;
                const displayCandidates = ['display_name', 'full_name', 'name', 'supplier_name'];
                for (const key of displayCandidates) {
                    const value = metadata[key];
                    if (typeof value === 'string' && value.trim().length > 0) {
                        summary.counterpartyDisplayName = value.trim();
                        break;
                    }
                }
                summary.counterpartyEmail = counterparty.email ?? null;
            }
        }

        const threads = Array.from(threadMap.values()).sort(
            (a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt
        );
        const response: InboxResponse = {
            success: true,
            pavilionId: staffFor[0] ?? null,
            pavilionIds: staffFor,
            threads,
        };
        return NextResponse.json(response);
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load inbox.';
        return jsonError(500, msg);
    }
}
