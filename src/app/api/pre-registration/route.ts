import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendPreRegistrationConfirmation } from '@/lib/preRegistrationEmail';

type PreRegistrationBody = {
    fullName?: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    accountType?: string;
    message?: string;
    locale?: string;
    consent?: boolean;
    website?: string;
    source?: string;
};

const ACCOUNT_TYPES = new Set(['player', 'visitor', 'supplier']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_REGISTRATION_DEADLINE = Date.parse('2026-08-01T23:59:59+03:00');
const trim = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const jsonError = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status });

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
    const address = trim(payload.address);
    const accountType = trim(payload.accountType).toLowerCase();
    const message = trim(payload.message);
    const locale: 'en' | 'zh' = trim(payload.locale) === 'zh' ? 'zh' : 'en';
    const source = trim(payload.source) === 'phone_reward' ? 'phone_reward_pre_registration' : 'public_pre_registration';

    if (fullName.length < 2 || fullName.length > 120) return jsonError(400, 'Enter your full name.');
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return jsonError(400, 'Enter a valid email address.');
    if (!ACCOUNT_TYPES.has(accountType)) return jsonError(400, 'Choose an account type.');
    if (phone.length < 3) return jsonError(400, 'Enter your phone number.');
    if (phone.length > 40) return jsonError(400, 'Phone number is too long.');
    if (company.length > 160) return jsonError(400, 'Company name is too long.');
    if (address.length < 5) return jsonError(400, 'Enter your probable delivery location.');
    if (address.length > 1000) return jsonError(400, 'Delivery location is too long.');
    if (message.length > 1500) return jsonError(400, 'Message is too long.');
    if (payload.consent !== true) return jsonError(400, 'Consent is required.');
    if (Date.now() > FREE_REGISTRATION_DEADLINE) {
        return jsonError(403, 'Free registration has closed. Paid registration information will be announced soon.');
    }

    try {
        const supabase = getSupabaseAdminClient();
        const complimentaryAccess = true;

        let registrationWrite = await supabase
            .from('pre_registrations')
            .upsert({
                full_name: fullName,
                email,
                phone: phone || null,
                company: company || null,
                address,
                account_type: accountType,
                message: message || null,
                locale,
                consent_at: new Date().toISOString(),
                source,
                status: 'pending',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'email' })
            .select('id, status, created_at')
            .single();

        let storage = 'pre_registrations';
        if (
            registrationWrite.error &&
            /address|schema cache/i.test(registrationWrite.error.message)
        ) {
            const legacyMessage = [
                `Probable delivery location: ${address}`,
                message ? `Comment: ${message}` : null,
            ].filter(Boolean).join('\n');
            registrationWrite = await supabase
                .from('pre_registrations')
                .upsert({
                    full_name: fullName,
                    email,
                    phone: phone || null,
                    company: company || null,
                    account_type: accountType,
                    message: legacyMessage,
                    locale,
                    consent_at: new Date().toISOString(),
                    source,
                    status: 'pending',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'email' })
                .select('id, status, created_at')
                .single();
            if (!registrationWrite.error) storage = 'pre_registrations_address_in_message';
        }

        const { data, error } = registrationWrite;
        let registration: unknown = data;
        if (error) {
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
                        `Source: ${source}`,
                        `Complimentary access: ${complimentaryAccess ? 'yes' : 'no'}`,
                        `Probable delivery location: ${address}`,
                        message ? `Message: ${message}` : 'Message: —',
                    ].join('\n'),
                });

            if (fallbackError) {
                console.error('[pre-registration] Fallback write failed:', fallbackError.message);
                return jsonError(500, 'We could not save your registration. Please try again.');
            }

            storage = 'contact_queue_fallback';
            registration = { status: 'pending' };
        }

        const emailSent = await sendPreRegistrationConfirmation({
            to: email,
            fullName,
            phone,
            company,
            address,
            comment: message,
            locale,
            complimentaryAccess,
        });

        return NextResponse.json({
            success: true,
            registration,
            storage,
            emailSent,
            complimentaryAccess,
            email,
            accountCreated: false,
        });
    } catch (error) {
        console.error('[pre-registration] Request failed:', error);
        return jsonError(500, 'We could not create your registration. Please try again.');
    }
}
