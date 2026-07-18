type PreRegistrationEmailArgs = {
    to: string;
    fullName: string;
    phone: string;
    company: string;
    comment: string;
    locale: 'en' | 'zh';
    complimentaryAccess: boolean;
};

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

export async function sendPreRegistrationConfirmation(args: PreRegistrationEmailArgs): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
        console.warn('[pre-registration] RESEND_API_KEY is not configured; confirmation email skipped.');
        return false;
    }

    const from = process.env.PRE_REGISTRATION_EMAIL_FROM?.trim()
        || '3DSFERA <admin@3dsfera.org>';
    const isChinese = args.locale === 'zh';
    const valueOrDash = (value: string) => value || '—';
    const subject = isChinese
        ? '您的 3DSFERA 预注册已确认'
        : 'Your 3DSFERA pre-registration is confirmed';
    const accessLine = args.complimentaryAccess
        ? (isChinese ? '您的 3DSFERA 终身免费访问资格已预留。' : 'Your free lifetime access to 3DSFERA has been reserved.')
        : (isChinese ? '您的预注册已记录；付费访问详情将在上线前发送。' : 'Your pre-registration is recorded; paid-access details will be sent before launch.');
    const labels = isChinese
        ? { name: '姓名', email: '邮箱', phone: '电话', company: '公司', comment: '备注', status: '账号状态' }
        : { name: 'Name', email: 'Email', phone: 'Phone', company: 'Company', comment: 'Comment', status: 'Account status' };
    const intro = isChinese
        ? `恭喜，${args.fullName}！您已成功预注册 3dsfera.org。`
        : `Congratulations, ${args.fullName}! Your pre-registration at 3dsfera.org is confirmed.`;
    const outro = isChinese
        ? '目前尚未创建登录账号。3DSFERA 正式开放时，我们会向此邮箱发送安全激活链接，您可通过该链接创建密码并激活账号。'
        : 'No login account has been created yet. When 3DSFERA opens, we will send a secure activation link to this email so you can create a password and activate your account.';

    const rows = [
        [labels.name, args.fullName],
        [labels.email, args.to],
        [labels.status, isChinese ? '预注册；等待激活' : 'Pre-registered; awaiting activation'],
        [labels.phone, valueOrDash(args.phone)],
        [labels.company, valueOrDash(args.company)],
        [labels.comment, valueOrDash(args.comment)],
    ];
    const text = [
        intro,
        '',
        accessLine,
        '',
        ...rows.map(([label, value]) => `${label}: ${value}`),
        '',
        outro,
        '',
        '3DSFERA: https://3dsfera.org/',
        'https://3dsfera.org/',
    ].join('\n');
    const htmlRows = rows.map(([label, value]) => `
        <tr>
            <td style="padding:9px 12px;color:#87a1b8;font-size:12px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
            <td style="padding:9px 12px;color:#f4f8fb;font-size:13px;line-height:1.5;word-break:break-word;">${escapeHtml(value)}</td>
        </tr>`).join('');
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#071018;color:#edf7f7;padding:32px;border-radius:20px;max-width:620px;margin:0 auto;">
            <a href="https://3dsfera.org/" style="display:inline-block;margin-bottom:18px;text-decoration:none;" aria-label="Open 3DSFERA">
                <img src="https://3dsfera.org/3dsfera-logo-mark.png" width="64" height="67" alt="3DSFERA" style="display:block;width:64px;height:67px;object-fit:contain;border:0;" />
            </a>
            <div style="font-size:10px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:#66d9cb;margin-bottom:14px;">3DSFERA · EARLY ACCESS</div>
            <h1 style="font-size:25px;line-height:1.2;margin:0 0 16px;color:#fff;">${escapeHtml(subject)}</h1>
            <p style="font-size:14px;line-height:1.7;color:#c8d6e1;margin:0 0 12px;">${escapeHtml(intro)}</p>
            <p style="font-size:14px;line-height:1.7;color:#ffe1a3;margin:0 0 22px;">${escapeHtml(accessLine)}</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#03080d;border:1px solid #1c3540;border-radius:12px;overflow:hidden;">${htmlRows}</table>
            <p style="font-size:13px;line-height:1.7;color:#9fb3c7;margin:22px 0 0;">${escapeHtml(outro)}</p>
            <a href="https://3dsfera.org/" style="display:inline-block;margin-top:22px;background:#66d9cb;color:#04110f;padding:12px 20px;border-radius:999px;font-weight:800;text-decoration:none;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">OPEN 3DSFERA</a>
        </div>`;

    try {
        const response = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: [args.to],
                reply_to: 'admin@3dsfera.org',
                subject,
                html,
                text,
            }),
        });

        if (!response.ok) {
            console.warn('[pre-registration] Resend rejected confirmation email:', response.status, await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.warn('[pre-registration] Confirmation email request failed:', error);
        return false;
    }
}
