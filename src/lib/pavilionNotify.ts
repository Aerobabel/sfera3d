// Email notification for pavilion chat events. Uses Resend's REST API
// directly via fetch — no SDK dependency. Silently no-ops if
// RESEND_API_KEY isn't configured so the chat still works in envs where
// you haven't wired email yet.

type ResendResponse = {
    id?: string;
    message?: string;
    error?: string;
};

type NotifyArgs = {
    to: string;
    subject: string;
    html: string;
    text: string;
};

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export const sendPavilionEmail = async ({ to, subject, html, text }: NotifyArgs): Promise<void> => {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
        // No-op: email notifications are opt-in; chat still functions.
        return;
    }
    const fromAddress = process.env.PAVILION_EMAIL_FROM?.trim() || 'notifications@3dsfera.app';
    try {
        const res = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromAddress,
                to: [to],
                subject,
                html,
                text,
            }),
        });
        if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as ResendResponse;
            console.warn('[pavilion-notify] resend error', res.status, body);
        }
    } catch (err) {
        console.warn('[pavilion-notify] fetch failed', err);
    }
};

// Human-friendly notification for a new visitor-to-pavilion message.
// Sent to the pavilion's public catalogue email (e.g. sales@doublelin.cn).
// Contains ONLY a link to the staff dashboard — do not reply by email.
export const buildVisitorMessageEmail = (args: {
    pavilionName: string;
    visitorName: string;
    visitorEmail: string | null;
    body: string;
    inboxUrl: string;
}) => {
    const preview = args.body.length > 220 ? args.body.slice(0, 220) + '…' : args.body;
    const text = [
        `New message for ${args.pavilionName}`,
        '',
        `From: ${args.visitorName}${args.visitorEmail ? ` <${args.visitorEmail}>` : ''}`,
        '',
        preview,
        '',
        `To reply, sign in to the staff dashboard: ${args.inboxUrl}`,
        '(Do not reply to this email — it isn\'t monitored.)',
    ].join('\n');
    const html = `
        <div style="font-family:Geist,Helvetica,Arial,sans-serif;background:#0a0e1a;color:#e6ebf2;padding:32px;border-radius:16px;max-width:560px;margin:0 auto;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#66d9cb;margin-bottom:12px;">${escapeHtml(args.pavilionName)}</div>
            <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;">New message from a visitor</h2>
            <div style="font-size:13px;color:#9fb3c7;margin-bottom:16px;">
                <strong style="color:#e6ebf2;">${escapeHtml(args.visitorName)}</strong>${args.visitorEmail ? ` &lt;${escapeHtml(args.visitorEmail)}&gt;` : ''}
            </div>
            <div style="border-left:3px solid #66d9cb;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:6px;font-size:14px;line-height:1.6;color:#e6ebf2;white-space:pre-wrap;">${escapeHtml(preview)}</div>
            <a href="${escapeHtmlAttr(args.inboxUrl)}" style="display:inline-block;margin-top:24px;background:#66d9cb;color:#04110f;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;">Open staff dashboard</a>
            <div style="margin-top:20px;font-size:12px;color:#9fb3c7;">
                Replies sent back to this email are not delivered — sign in with your staff account to respond.
            </div>
            <div style="margin-top:24px;font-size:11px;color:#5a6b7f;">You received this because you are listed as the contact for ${escapeHtml(args.pavilionName)} on 3DSFERA.</div>
        </div>
    `.trim();
    return { text, html };
};

// Human-friendly notification for a pavilion reply to a visitor.
export const buildPavilionReplyEmail = (args: {
    pavilionName: string;
    body: string;
    pavilionUrl: string;
}) => {
    const preview = args.body.length > 220 ? args.body.slice(0, 220) + '…' : args.body;
    const text = [
        `${args.pavilionName} replied to your message`,
        '',
        preview,
        '',
        `Continue the conversation: ${args.pavilionUrl}`,
    ].join('\n');
    const html = `
        <div style="font-family:Geist,Helvetica,Arial,sans-serif;background:#0a0e1a;color:#e6ebf2;padding:32px;border-radius:16px;max-width:560px;margin:0 auto;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#c49a6c;margin-bottom:12px;">${escapeHtml(args.pavilionName)}</div>
            <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;">You have a new reply</h2>
            <div style="border-left:3px solid #c49a6c;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:6px;font-size:14px;line-height:1.6;color:#e6ebf2;white-space:pre-wrap;">${escapeHtml(preview)}</div>
            <a href="${escapeHtmlAttr(args.pavilionUrl)}" style="display:inline-block;margin-top:24px;background:#c49a6c;color:#04110f;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;">Continue chat</a>
        </div>
    `.trim();
    return { text, html };
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const escapeHtmlAttr = (value: string) => escapeHtml(value);
