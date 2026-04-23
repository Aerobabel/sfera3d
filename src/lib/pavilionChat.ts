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
import { PAVILION_IDS } from './pavilions';

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

// Identify pavilion staff from ANY of three signals, no manual metadata
// editing required:
//   1. user_metadata.pavilion_staff_for = "pav_<id>"   (explicit opt-in)
//   2. user_metadata.pavilion_id        = "pav_<id>"   (written by supplier signup)
//   3. email local-part matches a known pavilion id    (e.g. doublelin@… → pav_doublelin)
// Matches only when the resulting value names one of our real pavilions
// (pav_doublelin / pav_youbo) so e.g. "pav_nonagon" suppliers aren't
// accidentally promoted to staff.
const STAFF_METADATA_KEYS = ['pavilion_staff_for', 'pavilion_id'];
const KNOWN_PAVILION_SUPPLIER_IDS = new Set(PAVILION_IDS.map((id) => `pav_${id}`));

export const getPavilionStaffFor = (
    user: Pick<User, 'user_metadata' | 'email'> | null | undefined
): string | null => {
    if (!user) return null;

    // 1+2: metadata keys.
    const metadata = user.user_metadata;
    if (metadata && typeof metadata === 'object') {
        const record = metadata as Record<string, unknown>;
        for (const key of STAFF_METADATA_KEYS) {
            const raw = record[key];
            if (typeof raw !== 'string') continue;
            const trimmed = raw.trim().toLowerCase();
            if (KNOWN_PAVILION_SUPPLIER_IDS.has(trimmed)) return trimmed;
        }
    }

    // 3: email local-part heuristic. `doublelin@…` → `pav_doublelin`.
    const email = user.email?.trim().toLowerCase() ?? '';
    if (email) {
        const localPart = email.split('@')[0] ?? '';
        const candidate = `pav_${localPart}`;
        if (KNOWN_PAVILION_SUPPLIER_IDS.has(candidate)) return candidate;
    }

    return null;
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
