'use client';

import { FormEvent, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type AccountType = 'player' | 'visitor' | 'supplier';

const copy = {
    en: {
        eyebrow: 'Early access',
        title: 'Pre-register for 3DSFERA',
        body: 'Leave your details and the Sfera team will review your request. This does not create an account automatically.',
        name: 'Full name', email: 'Email address', phone: 'Phone or Telegram', company: 'Company (optional)',
        accountType: 'I want access as', player: 'Player', visitor: 'Visitor / buyer', supplier: 'Supplier',
        message: 'What would you like to do in 3DSFERA? (optional)',
        consent: 'I agree that 3DSFERA may store these details and contact me about access.',
        submit: 'Request early access', submitting: 'Saving request…', back: 'Back to sign in',
        successTitle: 'You are on the list', successBody: 'Your request was saved. The Sfera team will contact you after review.',
        again: 'Submit another request', error: 'We could not save your request. Please try again.',
        secure: 'Saved securely', review: 'Reviewed by the team', noAccount: 'No account is created yet',
    },
    ru: {
        eyebrow: 'Ранний доступ',
        title: 'Предварительная регистрация в 3DSFERA',
        body: 'Оставьте данные, и команда Sfera рассмотрит заявку. Аккаунт не создаётся автоматически.',
        name: 'Имя и фамилия', email: 'Email', phone: 'Телефон или Telegram', company: 'Компания (необязательно)',
        accountType: 'Мне нужен доступ как', player: 'Игрок', visitor: 'Посетитель / покупатель', supplier: 'Поставщик',
        message: 'Что вы хотите делать в 3DSFERA? (необязательно)',
        consent: 'Я согласен(на), что 3DSFERA сохранит эти данные и свяжется со мной по вопросу доступа.',
        submit: 'Запросить ранний доступ', submitting: 'Сохраняем заявку…', back: 'Вернуться ко входу',
        successTitle: 'Заявка принята', successBody: 'Заявка сохранена. Команда Sfera свяжется с вами после рассмотрения.',
        again: 'Отправить ещё одну заявку', error: 'Не удалось сохранить заявку. Попробуйте ещё раз.',
        secure: 'Безопасное хранение', review: 'Проверка командой', noAccount: 'Аккаунт пока не создаётся',
    },
    zh: {
        eyebrow: '抢先体验',
        title: '预注册 3DSFERA',
        body: '请留下您的信息，Sfera 团队将审核申请。提交申请不会自动创建账户。',
        name: '姓名', email: '邮箱地址', phone: '电话或 Telegram', company: '公司（选填）',
        accountType: '申请身份', player: '玩家', visitor: '访客 / 买家', supplier: '供应商',
        message: '您希望在 3DSFERA 中做什么？（选填）',
        consent: '我同意 3DSFERA 存储这些信息，并就访问权限与我联系。',
        submit: '申请抢先体验', submitting: '正在保存申请…', back: '返回登录',
        successTitle: '申请已提交', successBody: '您的申请已保存。Sfera 团队审核后会与您联系。',
        again: '提交其他申请', error: '无法保存申请，请重试。',
        secure: '安全保存', review: '团队审核', noAccount: '暂不创建账户',
    },
} as const;

export default function PreRegisterPage() {
    const { language } = useLanguage();
    const t = copy[language];
    const [accountType, setAccountType] = useState<AccountType>('player');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState('');

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
                    locale: language,
                    consent: form.get('consent') === 'on',
                }),
            });
            const payload = await response.json() as { success?: boolean; error?: string };
            if (!response.ok || !payload.success) throw new Error(payload.error || t.error);
            setIsComplete(true);
            window.dispatchEvent(new Event('sfera:success'));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : t.error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="sfera-cinematic-shell sfera-page-enter relative min-h-screen overflow-hidden px-4 py-8 text-white sm:grid sm:place-items-center sm:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(102,217,203,.2),transparent_30%),radial-gradient(circle_at_88%_82%,rgba(246,186,79,.15),transparent_32%),linear-gradient(145deg,#05070b,#0b1219)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:52px_52px]" />

            <div className="sfera-glass-premium relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] lg:grid-cols-[.82fr_1.18fr]">
                <aside className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(155deg,rgba(102,217,203,.15),rgba(5,10,15,.55))] p-7 lg:border-b-0 lg:border-r lg:p-10">
                    <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
                    <div className="relative">
                        <BrandLogo size="lg" priority />
                        <p className="mt-12 text-[10px] font-black uppercase tracking-[.28em] text-cyan-100">{t.eyebrow}</p>
                        <h1 className="sfera-display mt-4 text-4xl leading-[.98] sm:text-5xl">{t.title}</h1>
                        <p className="mt-5 text-sm leading-7 text-slate-300">{t.body}</p>
                        <div className="mt-9 grid gap-3 text-xs text-slate-200">
                            <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-cyan-100" />{t.secure}</span>
                            <span className="flex items-center gap-3"><Users className="h-4 w-4 text-cyan-100" />{t.review}</span>
                            <span className="flex items-center gap-3"><Sparkles className="h-4 w-4 text-amber-200" />{t.noAccount}</span>
                        </div>
                    </div>
                </aside>

                <section className="p-6 sm:p-8 lg:p-10">
                    {isComplete ? (
                        <div className="flex min-h-[30rem] flex-col items-center justify-center text-center">
                            <span className="grid h-20 w-20 place-items-center rounded-full border border-emerald-200/30 bg-emerald-300/10 text-emerald-100 shadow-[0_0_45px_rgba(110,231,183,.15)]"><CheckCircle2 className="h-9 w-9" /></span>
                            <h2 className="sfera-display mt-7 text-3xl">{t.successTitle}</h2>
                            <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">{t.successBody}</p>
                            <button type="button" onClick={() => setIsComplete(false)} className="mt-7 rounded-full border border-white/15 px-5 py-3 text-sm font-bold transition hover:bg-white/10">{t.again}</button>
                            <Link href="/login?role=player" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-100 hover:underline"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="grid gap-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t.name}><input name="fullName" required minLength={2} maxLength={120} autoComplete="name" className={inputClass} /></Field>
                                <Field label={t.email}><input name="email" required type="email" maxLength={254} autoComplete="email" className={inputClass} /></Field>
                                <Field label={t.phone}><input name="phone" maxLength={40} autoComplete="tel" className={inputClass} /></Field>
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

                            <Field label={t.message}><textarea name="message" maxLength={1500} rows={4} className={`${inputClass} resize-none`} /></Field>
                            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />

                            <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-300">
                                <input name="consent" required type="checkbox" className="mt-1 h-4 w-4 accent-[#66d9cb]" />
                                <span>{t.consent}</span>
                            </label>

                            {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[.08] px-4 py-3 text-sm text-rose-100">{error}</p>}

                            <button disabled={isSubmitting} type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#66d9cb,#d8fff9)] px-5 py-3 text-sm font-black uppercase tracking-[.12em] text-slate-950 transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60">
                                {isSubmitting ? t.submitting : t.submit}<Send className="h-4 w-4" />
                            </button>
                            <Link href="/login?role=player" className="mx-auto inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
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
