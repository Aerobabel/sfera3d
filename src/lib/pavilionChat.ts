// Shared types + helpers for the threaded pavilion chat.
//
// A thread is identified by (pavilion_id, counterparty_user_id):
//   - Visitor viewing pavilion chat:  counterparty_user_id = their own auth uid
//   - Pavilion staff inbox:           lists distinct counterparty_user_ids
//   - Pavilion A staff messaging B:   counterparty_user_id = A's staff uid
//
// Messages never use the pavilion itself as the counterparty — the
// counterparty is always a real auth.users row.

import type { User } from '@supabase/supabase-js';

export type PavilionMessageSenderKind = 'visitor' | 'pavilion';

export type PavilionMessage = {
    id: string;
    pavilionId: string;
    counterpartyUserId: string;
    senderKind: PavilionMessageSenderKind;
    senderUserId: string;
    senderDisplayName: string | null;
    body: string;
    createdAt: number;
};

export type PavilionThreadSummary = {
    pavilionId: string;
    counterpartyUserId: string;
    counterpartyDisplayName: string | null;
    counterpartyEmail: string | null;
    lastMessage: PavilionMessage;
    messageCount: number;
};

// Match the auth metadata key written by login/page.tsx for pavilion staff.
// We DELIBERATELY use a distinct key (`pavilion_staff_for`) from the
// existing supplier `pavilion_id`/`pavilion_name` to avoid collision with
// supplier dashboards.
export const PAVILION_STAFF_METADATA_KEY = 'pavilion_staff_for';

export const getPavilionStaffFor = (user: Pick<User, 'user_metadata'> | null | undefined): string | null => {
    if (!user) return null;
    const metadata = user.user_metadata;
    if (!metadata || typeof metadata !== 'object') return null;
    const raw = (metadata as Record<string, unknown>)[PAVILION_STAFF_METADATA_KEY];
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim().toLowerCase();
    return trimmed.startsWith('pav_') ? trimmed : null;
};

export const getDisplayNameFromUser = (user: Pick<User, 'user_metadata' | 'email'> | null | undefined): string | null => {
    if (!user) return null;
    const metadata = user.user_metadata;
    if (metadata && typeof metadata === 'object') {
        const record = metadata as Record<string, unknown>;
        const candidates = ['display_name', 'full_name', 'name', 'supplier_name'];
        for (const key of candidates) {
            const value = record[key];
            if (typeof value === 'string' && value.trim().length > 0) return value.trim();
        }
    }
    const email = user.email?.trim() ?? '';
    if (!email) return null;
    return email.split('@')[0].replace(/[._-]+/g, ' ');
};
