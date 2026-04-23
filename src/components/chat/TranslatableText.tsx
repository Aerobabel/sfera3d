'use client';

// Renders a message body with an inline "Translate" action. Only shows
// the action when the source language differs from the viewer's preferred
// language. On click, calls /api/translate (MyMemory-backed) and appends
// the translated copy under the original. Caches the result so clicking
// again doesn't re-fetch.

import { useCallback, useMemo, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { guessLanguage } from '@/lib/translate';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { AppLanguage } from '@/lib/i18n';

type Tone = 'onDark' | 'onLight';

type Copy = {
    translate: string;
    translating: string;
    translated: string;
    original: string;
    retry: string;
    unavailable: string;
};

const COPY: Record<AppLanguage, Copy> = {
    en: {
        translate: 'Translate',
        translating: 'Translating…',
        translated: 'Translated',
        original: 'Original',
        retry: 'Retry',
        unavailable: 'Translation unavailable.',
    },
    ru: {
        translate: 'Перевести',
        translating: 'Переводим…',
        translated: 'Перевод',
        original: 'Оригинал',
        retry: 'Повторить',
        unavailable: 'Перевод недоступен.',
    },
    zh: {
        translate: '翻译',
        translating: '翻译中…',
        translated: '已翻译',
        original: '原文',
        retry: '重试',
        unavailable: '翻译服务不可用。',
    },
};

interface Props {
    text: string;
    /** Known source language (skip auto-detect). */
    sourceLanguage?: AppLanguage;
    /** Hide translate action entirely (e.g. for outgoing optimistic messages). */
    hideAction?: boolean;
    /** Visual tone — controls colour contrast for the action/meta line. */
    tone?: Tone;
}

export default function TranslatableText({ text, sourceLanguage, hideAction, tone = 'onDark' }: Props) {
    const { language } = useLanguage();
    const copy = COPY[language];
    const effectiveSource = useMemo(
        () => sourceLanguage ?? guessLanguage(text),
        [sourceLanguage, text]
    );
    const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [translated, setTranslated] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canTranslate = !hideAction && effectiveSource !== language && text.trim().length > 0;

    const handleTranslate = useCallback(async () => {
        if (state === 'loading') return;
        if (translated !== null) {
            // Toggle collapse on repeat click? Keep it simple: no-op.
            return;
        }
        setState('loading');
        setError(null);
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, targetLanguage: language, sourceLanguage: effectiveSource }),
            });
            const body = (await res.json()) as { success?: boolean; translatedText?: string; error?: string };
            if (!res.ok || !body.success || !body.translatedText) {
                throw new Error(body.error || copy.unavailable);
            }
            setTranslated(body.translatedText);
            setState('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : copy.unavailable);
            setState('error');
        }
    }, [state, translated, text, language, effectiveSource, copy.unavailable]);

    const metaClass =
        tone === 'onLight'
            ? 'text-slate-800/60 hover:text-slate-900'
            : 'text-gray-400 hover:text-white';
    const dividerClass = tone === 'onLight' ? 'border-slate-800/15' : 'border-white/10';
    const translatedLabelClass = tone === 'onLight' ? 'text-slate-700/70' : 'text-cyan-300/80';
    const originalLabelClass = tone === 'onLight' ? 'text-slate-700/50' : 'text-gray-400/70';

    return (
        <div>
            <div className="whitespace-pre-wrap break-words">{text}</div>

            {translated !== null && state === 'done' && (
                <div className={`mt-2 pt-2 text-[11px] leading-relaxed border-t ${dividerClass}`}>
                    <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.18em] ${translatedLabelClass}`}>
                        {copy.translated} · {language.toUpperCase()}
                    </div>
                    <div className={tone === 'onLight' ? 'text-slate-800' : 'text-gray-100'}>
                        {translated}
                    </div>
                </div>
            )}

            {canTranslate && (
                <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                    {state !== 'done' && (
                        <button
                            type="button"
                            onClick={() => void handleTranslate()}
                            disabled={state === 'loading'}
                            className={`inline-flex items-center gap-1 font-semibold uppercase tracking-[0.12em] transition disabled:opacity-50 ${metaClass}`}
                        >
                            {state === 'loading' ? (
                                <>
                                    <Loader2 size={10} className="animate-spin" />
                                    {copy.translating}
                                </>
                            ) : (
                                <>
                                    <Languages size={11} />
                                    {state === 'error' ? copy.retry : copy.translate}
                                </>
                            )}
                        </button>
                    )}
                    {state === 'done' && (
                        <span className={`inline-flex items-center gap-1 ${originalLabelClass}`}>
                            <Languages size={11} /> {copy.original}: {effectiveSource.toUpperCase()}
                        </span>
                    )}
                    {state === 'error' && error && (
                        <span className="text-rose-400/80">{error}</span>
                    )}
                </div>
            )}
        </div>
    );
}
