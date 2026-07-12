import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type PreRegistrationBody = {
    fullName?: string;
    email?: string;
    phone?: string;
    company?: string;
    accountType?: string;
    message?: string;
    locale?: string;
    consent?: boolean;
    website?: string;
};

const ACCOUNT_TYPES = new Set(['player', 'visitor', 'supplier']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const trim = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const jsonError = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status });

const getStorageClient = () => {
    try {
        return getSupabaseAdminClient();
    } catch {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) throw new Error('Supabase is not configured.');
        return createClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
};

export async function POST(request: Request) {
    let payload: PreRegistrationBody;
    try {
        payload = (await request.json()) as PreRegistrationBody;
    } catch {
        return jsonError(400, 'Invalid JSON body.');
    }

    // Honeypot: bots tend to fill every field. Return a normal success response
    // without writing anything so the field is not useful for probing.
    if (trim(payload.website)) {
        return NextResponse.json({ success: true });
    }

    const fullName = trim(payload.fullName);
    const email = trim(payload.email).toLowerCase();
    const phone = trim(payload.phone);
    const company = trim(payload.company);
    const accountType = trim(payload.accountType).toLowerCase();
    const message = trim(payload.message);
    const locale = ['en', 'ru', 'zh'].includes(trim(payload.locale)) ? trim(payload.locale) : 'en';

    if (fullName.length < 2 || fullName.length > 120) return jsonError(400, 'Enter your full name.');
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return jsonError(400, 'Enter a valid email address.');
    if (!ACCOUNT_TYPES.has(accountType)) return jsonError(400, 'Choose an account type.');
    if (phone.length > 40) return jsonError(400, 'Phone number is too long.');
    if (company.length > 160) return jsonError(400, 'Company name is too long.');
    if (message.length > 1500) return jsonError(400, 'Message is too long.');
    if (payload.consent !== true) return jsonError(400, 'Consent is required.');

    try {
        const supabase = getStorageClient();
        const { data, error } = await supabase
            .from('pre_registrations')
            .upsert({
                full_name: fullName,
                email,
                phone: phone || null,
                company: company || null,
                account_type: accountType,
                message: message || null,
                locale,
                consent_at: new Date().toISOString(),
                source: 'public_pre_registration',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'email' })
            .select('id, status, created_at')
            .single();

        if (!error) {
            return NextResponse.json({ success: true, registration: data, storage: 'pre_registrations' });
        }

        // Deployments created before the pre_registrations migration already
        // have this private contact-request table. Use it as a durable bridge
        // so public requests are never lost while the migration rolls out.
        console.warn('[pre-registration] Primary table unavailable, using contact queue:', error.message);
        const { error: fallbackError } = await supabase
            .from('pavilion_contact_requests')
            .insert({
                pavilion_id: 'pre-registration',
                name: fullName,
                company: company || null,
                email,
                phone: phone || null,
                message: [
                    `Account type: ${accountType}`,
                    `Locale: ${locale}`,
                    message ? `Message: ${message}` : 'Message: —',
                ].join('\n'),
            });

        if (fallbackError) {
            console.error('[pre-registration] Fallback write failed:', fallbackError.message);
            return jsonError(500, 'We could not save your request. Please try again.');
        }

        return NextResponse.json({
            success: true,
            registration: { status: 'pending' },
            storage: 'contact_queue_fallback',
        });
    } catch (error) {
        console.error('[pre-registration] Request failed:', error);
        return jsonError(500, 'We could not save your request. Please try again.');
    }
}
