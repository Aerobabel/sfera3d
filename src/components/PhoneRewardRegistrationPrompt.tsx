'use client';

import Link from 'next/link';
import { Check, Copy, ExternalLink, Gift, Mail, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { AppLanguage } from '@/lib/i18n';

const COPY = {
    en: {
        eyebrow: 'Limited-time free registration',
        title: 'Register before August 1, 2026',
        body: 'Everyone who registers by August 1, 2026 receives free lifetime access to 3DSFERA. Registration will become paid afterward, so secure your access now.',
        email: 'Launch dates, access updates, and important platform news will be sent to the email used during registration.',
        secure: 'Your password is stored securely and is never shown in email.',
        linkLabel: 'Pre-registration link',
        copy: 'Copy link',
        copied: 'Copied',
        action: 'Pre-register now',
        later: 'Continue to dashboard',
        close: 'Close registration offer',
    },
    zh: {
        eyebrow: '限时免费注册',
        title: '请在 2026 年 8 月 1 日前注册',
        body: '所有在 2026 年 8 月 1 日前完成注册的用户都将获得 3DSFERA 终身免费访问权限。之后注册将转为付费，请立即锁定您的资格。',
        email: '上线日期、访问更新和重要平台消息将发送到您注册时填写的邮箱。',
        secure: '您的密码会被安全保存，绝不会通过邮件明文显示。',
        linkLabel: '预注册链接',
        copy: '复制链接',
        copied: '已复制',
        action: '立即预注册',
        later: '继续前往控制面板',
        close: '关闭注册提示',
    },
} as const;

export default function PhoneRewardRegistrationPrompt({
    language,
    onClose,
}: {
    language: AppLanguage;
    onClose: () => void;
}) {
    const t = language === 'zh' ? COPY.zh : COPY.en;
    const [isCopied, setIsCopied] = useState(false);
    const linkRef = useRef<HTMLInputElement | null>(null);
    const registrationPath = '/pre-register?source=phone-reward';
    const displayUrl = 'https://3dsfera.org/pre-register';

    const copyLink = async () => {
        const url = typeof window === 'undefined'
            ? displayUrl
            : new URL(registrationPath, window.location.origin).toString();

        try {
            await navigator.clipboard.writeText(url);
        } catch {
            linkRef.current?.select();
            document.execCommand('copy');
        }

        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 1800);
    };

    return (
        <div className="absolute inset-0 z-[128] grid place-items-center overflow-y-auto overscroll-contain bg-[#020408]/88 p-3 text-white backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="phone-registration-title">
            <section className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-cyan-200/20 bg-[linear-gradient(145deg,rgba(7,18,26,.98),rgba(7,9,17,.98))] shadow-[0_45px_160px_rgba(0,0,0,.78)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(102,217,203,.2),transparent_34%),radial-gradient(circle_at_88%_86%,rgba(246,186,79,.16),transparent_36%)]" />
                <button type="button" onClick={onClose} className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-black/35 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label={t.close}>
                    <X className="h-4 w-4" />
                </button>

                <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[.72fr_1.28fr] md:items-center md:p-10">
                    <div className="mx-auto grid h-36 w-36 place-items-center rounded-full border border-amber-200/25 bg-amber-200/[.07] shadow-[0_0_80px_rgba(246,186,79,.16)] sm:h-44 sm:w-44">
                        <span className="grid h-24 w-24 place-items-center rounded-[2rem] border border-cyan-200/25 bg-cyan-200/10 text-cyan-100 shadow-[0_0_50px_rgba(102,217,203,.22)] sm:h-28 sm:w-28">
                            <Gift className="h-12 w-12" />
                        </span>
                    </div>

                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-cyan-100"><Sparkles className="h-3.5 w-3.5" />{t.eyebrow}</p>
                        <h2 id="phone-registration-title" className="sfera-display mt-3 text-3xl leading-[1.02] sm:text-4xl">{t.title}</h2>
                        <p className="mt-4 text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">{t.body}</p>

                        <div className="mt-5 grid gap-2 text-xs leading-5 text-slate-300">
                            <p className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" />{t.email}</p>
                            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />{t.secure}</p>
                        </div>

                        <div className="mt-6 rounded-xl border border-white/10 bg-black/28 p-2">
                            <p className="px-2 pb-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">{t.linkLabel}</p>
                            <div className="flex gap-2">
                                <input ref={linkRef} readOnly value={displayUrl} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-xs text-cyan-50 outline-none sm:text-sm" aria-label={t.linkLabel} />
                                <button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-200/22 bg-cyan-200/10 px-3 py-2 text-xs font-bold text-cyan-50 transition hover:bg-cyan-200/16">
                                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    <span className="hidden sm:inline">{isCopied ? t.copied : t.copy}</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                            <Link href={registrationPath} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#66d9cb,#d8fff9)] px-5 py-3 text-sm font-black uppercase tracking-[.1em] text-slate-950 transition hover:scale-[1.01]">
                                {t.action}<ExternalLink className="h-4 w-4" />
                            </Link>
                            <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-white/12 px-4 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/[.07] hover:text-white">{t.later}</button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
