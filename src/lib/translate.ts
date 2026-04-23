// Lightweight on-demand translation via MyMemory (free, no API key,
// accessible inside Russia). Used by the chat "Translate" button so
// visitors / pavilion staff can read incoming messages in their own
// language without any LLM dependency.
//
// MyMemory docs: https://mymemory.translated.net/doc/spec.php
//   GET https://api.mymemory.translated.net/get?q=...&langpair=en|ru&de=...
// Free anonymous quota: 5000 words/day/IP. With a `de=<email>` param:
// 10_000 words/day (email just needs to be valid syntactically).

import type { AppLanguage } from './i18n';

const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';

// Hardcoded fallback email for MyMemory quota isolation. Without a
// `de=<email>` param, MyMemory tracks quota per source IP and Vercel's
// shared IP pool exhausts the 5000-word/day bucket across every app
// using the service. With an email, the bucket is per-email (10000
// words/day), isolated from other apps. MYMEMORY_EMAIL env var can
// override this if someone wants to swap it without a deploy.
const MYMEMORY_DEFAULT_EMAIL = 'aerobabel308@gmail.com';

// Map our app codes to MyMemory's IETF codes (same for these three).
const LANG_CODE: Record<AppLanguage, string> = {
    en: 'en',
    ru: 'ru',
    zh: 'zh-CN',
};

const hasCyrillic = (value: string) => /[\u0400-\u04FF]/.test(value);
const hasHan = (value: string) => /[\u3400-\u9FFF]/.test(value);

export const guessLanguage = (value: string): AppLanguage => {
    if (hasHan(value)) return 'zh';
    if (hasCyrillic(value)) return 'ru';
    return 'en';
};

export type TranslateResult = {
    translatedText: string;
    sourceLanguage: AppLanguage;
    targetLanguage: AppLanguage;
};

type MyMemoryResponse = {
    responseData?: { translatedText?: string; match?: number };
    responseStatus?: number;
    matches?: Array<{ translation?: string; quality?: string | number }>;
};

export const translateWithMyMemory = async (
    text: string,
    targetLanguage: AppLanguage,
    sourceLanguage?: AppLanguage
): Promise<TranslateResult> => {
    const resolvedSource = sourceLanguage ?? guessLanguage(text);
    if (resolvedSource === targetLanguage) {
        return { translatedText: text, sourceLanguage: resolvedSource, targetLanguage };
    }

    const langpair = `${LANG_CODE[resolvedSource]}|${LANG_CODE[targetLanguage]}`;
    const params = new URLSearchParams({ q: text, langpair });
    const contactEmail = process.env.MYMEMORY_EMAIL?.trim() || MYMEMORY_DEFAULT_EMAIL;
    params.set('de', contactEmail);

    const res = await fetch(`${MYMEMORY_ENDPOINT}?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        // MyMemory sometimes stalls; give it a sane ceiling.
        signal: AbortSignal.timeout(8000),
    });

    if (res.status === 429) {
        // MyMemory's free anonymous tier is 5000 words/day/IP. With a
        // syntactically-valid email in the `de=` param it bumps to
        // 10000. Propagate a machine-readable code so the UI can show
        // a friendly message.
        throw new Error('rate_limited');
    }
    if (!res.ok) {
        throw new Error(`Translation service returned ${res.status}`);
    }

    const body = (await res.json()) as MyMemoryResponse;
    const direct = body.responseData?.translatedText?.trim();
    if (direct && direct.toLowerCase() !== text.toLowerCase()) {
        return { translatedText: direct, sourceLanguage: resolvedSource, targetLanguage };
    }

    // Fall back to the best-ranked `matches[]` entry when responseData is empty
    // or equals the source (MyMemory occasionally returns the input unchanged).
    const match = body.matches
        ?.filter((m) => typeof m.translation === 'string' && m.translation.trim().length > 0)
        ?.sort((a, b) => Number(b.quality ?? 0) - Number(a.quality ?? 0))?.[0];
    if (match?.translation) {
        return {
            translatedText: match.translation.trim(),
            sourceLanguage: resolvedSource,
            targetLanguage,
        };
    }

    throw new Error('Translation unavailable');
};
