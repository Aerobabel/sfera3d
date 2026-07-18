'use client';

import { FormEvent, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, Send, ShieldCheck, Users } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type AccountType = 'player' | 'visitor' | 'supplier';

const COPY = {
    en: {
        eyebrow: 'Founding early access',
        title: 'Pre-register for 3DSFERA',
        body: 'Pre-register by August 1, 2026 to reserve free lifetime access to 3DSFERA. No login account will be created until access opens.',
        name: 'Full name', email: 'Email address', phone: 'Phone', company: 'Company (optional)',
        accountType: 'I want access as', player: 'Player', visitor: 'Visitor / buyer', supplier: 'Supplier',
        message: 'Comment (optional)',
        consent: 'I agree that 3DSFERA may store these details and email me about access, platform changes, and launch timing.',
        submit: 'Reserve early access', submitting: 'Saving pre-registration…', back: 'Back to 3DSFERA',
        successTitle: 'Pre-registration complete',
        successBody: 'Your details are saved. No login account has been created yet.',
        successFree: 'Your free lifetime access to 3DSFERA has been reserved.',
        emailSent: 'A confirmation was sent to your email.',
        emailPending: 'Your details are saved. Confirmation email delivery is still pending.',
        activation: 'When access opens, we will email a secure link that lets you create your password and activate your account.',
        returnHome: 'Return to 3DSFERA', again: 'Register another participant', error: 'We could not save your pre-registration. Please try again.',
        secure: 'No account created yet', review: 'Free lifetime access', updates: 'Secure activation by email', loginLabel: 'Registration email',
    },
    zh: {
        eyebrow: '创始抢先体验',
        title: '预注册 3DSFERA',
        body: '在 2026 年 8 月 1 日前预注册，即可预留 3DSFERA 终身免费访问资格。开放访问前不会创建登录账号。',
        name: '姓名', email: '邮箱地址', phone: '电话', company: '公司（选填）',
        accountType: '申请身份', player: '玩家', visitor: '访客 / 买家', supplier: '供应商',
        message: '备注（选填）',
        consent: '我同意 3DSFERA 保存这些信息，并通过邮件通知访问权限、平台变更和上线时间。',
        submit: '预留抢先体验资格', submitting: '正在保存预注册…', back: '返回 3DSFERA',
        successTitle: '预注册完成',
        successBody: '您的资料已保存。目前尚未创建登录账号。',
        successFree: '您的 3DSFERA 终身免费访问资格已预留。',
        emailSent: '确认邮件已发送到您的邮箱。',
        emailPending: '您的资料已保存。确认邮件仍在等待发送。',
        activation: '开放访问时，我们会发送安全链接，供您创建密码并激活账号。',
        returnHome: '返回 3DSFERA', again: '注册其他参与者', error: '无法保存预注册，请重试。',
        secure: '暂不创建账号', review: '终身免费访问', updates: '通过邮件安全激活', loginLabel: '预注册邮箱',
    },
} as const;

export default function PreRegisterPage() {
    const { language } = useLanguage();
    const t = language === 'zh' ? COPY.zh : COPY.en;
    const [accountType, setAccountType] = useState<AccountType>('player');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState('');
    const [emailWasSent, setEmailWasSent] = useState(false);
    const [complimentaryAccess, setComplimentaryAccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        const form = new FormData(event.currentTarget);

        try {
            const response = await fetch('/api/pre-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: form.get('fullName'),
                    email: form.get('email'),
                    phone: form.get('phone'),
                    company: form.get('company'),
                    accountType,
                    message: form.get('message'),
                    website: form.get('website'),
                    source: new URLSearchParams(window.location.search).get('source'),
                    locale: language === 'zh' ? 'zh' : 'en',
                    consent: form.get('consent') === 'on',
                }),
            });
            const payload = await response.json() as {
                success?: boolean;
                error?: string;
                emailSent?: boolean;
                complimentaryAccess?: boolean;
                email?: string;
            };
            if (!response.ok || !payload.success) throw new Error(payload.error || t.error);
            setEmailWasSent(Boolean(payload.emailSent));
            setComplimentaryAccess(Boolean(payload.complimentaryAccess));
            setRegisteredEmail(payload.email ?? String(form.get('email') ?? ''));
            setIsComplete(true);
            window.dispatchEvent(new Event('sfera:success'));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : t.error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="sfera-cinematic-shell sfera-page-enter relative min-h-dvh overflow-x-hidden px-4 py-6 text-white sm:grid sm:place-items-center sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(102,217,203,.2),transparent_30%),radial-gradient(circle_at_88%_82%,rgba(246,186,79,.15),transparent_32%),linear-gradient(145deg,#05070b,#0b1219)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:52px_52px]" />

            <div className="sfera-glass-premium relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] lg:grid-cols-[.82fr_1.18fr]">
                <aside className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(155deg,rgba(102,217,203,.15),rgba(5,10,15,.55))] p-6 lg:border-b-0 lg:border-r lg:p-9">
                    <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
                    <div className="relative">
                        <BrandLogo size="lg" priority />
                        <p className="mt-9 text-[10px] font-black uppercase tracking-[.28em] text-cyan-100">{t.eyebrow}</p>
                        <h1 className="sfera-display mt-4 text-4xl leading-[.98] sm:text-5xl">{t.title}</h1>
                        <p className="mt-5 text-sm leading-7 text-slate-300">{t.body}</p>
                        <div className="mt-8 grid gap-3 text-xs text-slate-200">
                            <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-cyan-100" />{t.secure}</span>
                            <span className="flex items-center gap-3"><Users className="h-4 w-4 text-amber-200" />{t.review}</span>
                            <span className="flex items-center gap-3"><Mail className="h-4 w-4 text-cyan-100" />{t.updates}</span>
                        </div>
                    </div>
                </aside>

                <section className="p-5 sm:p-7 lg:p-9">
                    {isComplete ? (
                        <div className="flex min-h-[30rem] flex-col items-center justify-center text-center">
                            <span className="grid h-20 w-20 place-items-center rounded-full border border-emerald-200/30 bg-emerald-300/10 text-emerald-100 shadow-[0_0_45px_rgba(110,231,183,.15)]"><CheckCircle2 className="h-9 w-9" /></span>
                            <h2 className="sfera-display mt-7 text-3xl">{t.successTitle}</h2>
                            <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">{t.successBody}</p>
                            {complimentaryAccess && <p className="mt-3 max-w-md text-sm font-bold leading-6 text-amber-100">{t.successFree}</p>}
                            <div className="mt-5 w-full max-w-md rounded-xl border border-cyan-200/18 bg-cyan-200/[.06] px-4 py-3 text-left">
                                <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">{t.loginLabel}</p>
                                <p className="mt-1 break-all font-mono text-sm font-bold text-cyan-50">{registeredEmail}</p>
                            </div>
                            <p className={`mt-4 max-w-md text-xs leading-5 ${emailWasSent ? 'text-emerald-100' : 'text-amber-100'}`}>{emailWasSent ? t.emailSent : t.emailPending}</p>
                            <p className="mt-3 max-w-md text-xs leading-5 text-slate-300">{t.activation}</p>
                            <Link href="/" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-cyan-200 px-6 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.02]"><ArrowLeft className="h-4 w-4" />{t.returnHome}</Link>
                            <button type="button" onClick={() => setIsComplete(false)} className="mt-4 text-sm text-slate-400 transition hover:text-white">{t.again}</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t.name}><input name="fullName" required minLength={2} maxLength={120} autoComplete="name" className={inputClass} /></Field>
                                <Field label={t.email}><input name="email" required type="email" maxLength={254} autoComplete="email" className={inputClass} /></Field>
                                <Field label={t.phone}><input name="phone" required maxLength={40} autoComplete="tel" className={inputClass} /></Field>
                                <Field label={t.company}><input name="company" maxLength={160} autoComplete="organization" className={inputClass} /></Field>
                            </div>

                            <fieldset>
                                <legend className="mb-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{t.accountType}</legend>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['player', 'visitor', 'supplier'] as const).map((type) => (
                                        <button key={type} type="button" onClick={() => setAccountType(type)} className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${accountType === type ? 'border-cyan-100/50 bg-cyan-300/12 text-cyan-50' : 'border-white/10 bg-white/[.035] text-slate-400 hover:bg-white/[.07]'}`}>
                                            {t[type]}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <Field label={t.message}><textarea name="message" maxLength={1500} rows={3} className={`${inputClass} resize-none`} /></Field>
                            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />

                            <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-300">
                                <input name="consent" required type="checkbox" className="mt-1 h-4 w-4 accent-[#66d9cb]" />
                                <span>{t.consent}</span>
                            </label>

                            {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[.08] px-4 py-3 text-sm text-rose-100">{error}</p>}

                            <button disabled={isSubmitting} type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#66d9cb,#d8fff9)] px-5 py-3 text-sm font-black uppercase tracking-[.1em] text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
                                {isSubmitting ? t.submitting : t.submit}<Send className="h-4 w-4" />
                            </button>
                            <Link href="/" className="mx-auto inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/45 focus:bg-black/35';

function Field({ label, children }: { label: string; children: ReactNode }) {
    return <label className="grid gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400"><span>{label}</span>{children}</label>;
}
