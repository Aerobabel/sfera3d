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
import { isPavilionId, PAVILION_IDS } from './pavilions';

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
const CENTRAL_SUPPLIER_EMAIL_LOCAL_PARTS = new Set(['nonagon']);
export const PRIZE_DELIVERY_CHAT_ID = 'rewards';
export const PRIZE_DELIVERY_PAVILION_ID = `pav_${PRIZE_DELIVERY_CHAT_ID}`;
const ALL_CENTRAL_SUPPLIER_CHANNEL_IDS = [
    ...PAVILION_IDS.map((id) => `pav_${id}`),
    PRIZE_DELIVERY_PAVILION_ID,
];

export const isPavilionChatChannelId = (value: string) =>
    isPavilionId(value) || value === PRIZE_DELIVERY_CHAT_ID;

export const getPavilionChatChannelName = (value: string) =>
    value === PRIZE_DELIVERY_PAVILION_ID || value === PRIZE_DELIVERY_CHAT_ID
        ? 'Prize Delivery'
        : null;

const normalizeStaffPavilionId = (value: string): string | null => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;
    return KNOWN_PAVILION_SUPPLIER_IDS.has(trimmed) ? trimmed : null;
};

const collectStaffPavilionIds = (raw: unknown): string[] => {
    if (typeof raw === 'string') {
        return raw
            .split(',')
            .map(normalizeStaffPavilionId)
            .filter((value): value is string => Boolean(value));
    }

    if (Array.isArray(raw)) {
        return raw.flatMap((item) => collectStaffPavilionIds(item));
    }

    return [];
};

export const getPavilionStaffPavilionIds = (
    user: Pick<User, 'user_metadata' | 'email'> | null | undefined
): string[] => {
    if (!user) return [];

    const pavilionIds: string[] = [];
    const addPavilionIds = (values: string[]) => {
        for (const value of values) {
            if (!pavilionIds.includes(value)) pavilionIds.push(value);
        }
    };

    // 1+2: metadata keys.
    const metadata = user.user_metadata;
    if (metadata && typeof metadata === 'object') {
        const record = metadata as Record<string, unknown>;
        for (const key of STAFF_METADATA_KEYS) {
            addPavilionIds(collectStaffPavilionIds(record[key]));
        }
    }

    // 3: email local-part heuristic. `doublelin@…` → `pav_doublelin`.
    const email = user.email?.trim().toLowerCase() ?? '';
    if (email) {
        const localPart = email.split('@')[0] ?? '';
        const candidate = normalizeStaffPavilionId(`pav_${localPart}`);
        if (candidate) addPavilionIds([candidate]);
    }

    return pavilionIds;
};

export const getSupplierStaffPavilionIds = (
    user: Pick<User, 'user_metadata' | 'email'> | null | undefined,
    role: string | null | undefined
): string[] => {
    const explicitPavilionIds = getPavilionStaffPavilionIds(user);
    if (explicitPavilionIds.length > 0 || role !== 'supplier' || !user?.email) {
        return explicitPavilionIds;
    }

    const localPart = user.email.trim().toLowerCase().split('@')[0] ?? '';
    return CENTRAL_SUPPLIER_EMAIL_LOCAL_PARTS.has(localPart)
        ? ALL_CENTRAL_SUPPLIER_CHANNEL_IDS
        : explicitPavilionIds;
};

export const getPavilionStaffFor = (
    user: Pick<User, 'user_metadata' | 'email'> | null | undefined
): string | null => getPavilionStaffPavilionIds(user)[0] ?? null;

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
