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
        || process.env.PAVILION_EMAIL_FROM?.trim()
        || '3DSFERA <notifications@3dsfera.app>';
    const isChinese = args.locale === 'zh';
    const valueOrDash = (value: string) => value || '—';
    const subject = isChinese
        ? '您已成功注册 3DSFERA'
        : 'You are successfully registered for 3DSFERA';
    const accessLine = args.complimentaryAccess
        ? (isChinese ? '您已预留首批 100 位参与者的免费体验资格。' : 'Your complimentary place among the first 100 participants has been reserved.')
        : (isChinese ? '您的预注册已记录；付费访问详情将在上线前发送。' : 'Your pre-registration is recorded; paid-access details will be sent before launch.');
    const labels = isChinese
        ? { name: '姓名', login: '登录账号', password: '密码', phone: '电话', company: '公司', comment: '备注' }
        : { name: 'Name', login: 'Login', password: 'Password', phone: 'Phone', company: 'Company', comment: 'Comment' };
    const passwordValue = isChinese ? '您在注册时创建的密码（为安全起见，邮件中不显示）' : 'The password you created during registration (hidden from email for security)';
    const intro = isChinese
        ? `恭喜，${args.fullName}！您已成功注册 3dsfera.org。`
        : `Congratulations, ${args.fullName}! You have successfully registered at 3dsfera.org.`;
    const outro = isChinese
        ? '有关平台变更和上线时间的消息，我们会通过此邮箱另行通知。'
        : 'We will send all platform changes and launch-timing updates to this email address.';

    const rows = [
        [labels.name, args.fullName],
        [labels.login, args.to],
        [labels.password, passwordValue],
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
        'https://3dsfera.org/login?role=player',
    ].join('\n');
    const htmlRows = rows.map(([label, value]) => `
        <tr>
            <td style="padding:9px 12px;color:#87a1b8;font-size:12px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
            <td style="padding:9px 12px;color:#f4f8fb;font-size:13px;line-height:1.5;word-break:break-word;">${escapeHtml(value)}</td>
        </tr>`).join('');
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#071018;color:#edf7f7;padding:32px;border-radius:20px;max-width:620px;margin:0 auto;">
            <div style="font-size:10px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:#66d9cb;margin-bottom:14px;">3DSFERA · EARLY ACCESS</div>
            <h1 style="font-size:25px;line-height:1.2;margin:0 0 16px;color:#fff;">${escapeHtml(subject)}</h1>
            <p style="font-size:14px;line-height:1.7;color:#c8d6e1;margin:0 0 12px;">${escapeHtml(intro)}</p>
            <p style="font-size:14px;line-height:1.7;color:#ffe1a3;margin:0 0 22px;">${escapeHtml(accessLine)}</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#03080d;border:1px solid #1c3540;border-radius:12px;overflow:hidden;">${htmlRows}</table>
            <p style="font-size:13px;line-height:1.7;color:#9fb3c7;margin:22px 0 0;">${escapeHtml(outro)}</p>
            <a href="https://3dsfera.org/login?role=player" style="display:inline-block;margin-top:22px;background:#66d9cb;color:#04110f;padding:12px 20px;border-radius:999px;font-weight:800;text-decoration:none;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">3DSFERA LOGIN</a>
        </div>`;

    try {
        const response = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from, to: [args.to], subject, html, text }),
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
