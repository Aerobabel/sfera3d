import { NextResponse } from 'next/server';
import { authenticateAppRequest } from '@/lib/auth/server';
import { translateWithMyMemory, guessLanguage } from '@/lib/translate';
import { isAppLanguage, type AppLanguage } from '@/lib/i18n';

type Body = {
    text?: string;
    targetLanguage?: string;
    sourceLanguage?: string;
};

const jsonError = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status });

export async function POST(request: Request) {
    // Require auth to prevent abuse of our MyMemory quota. Chat already
    // requires sign-in, so this doesn't add friction to real users.
    const user = await authenticateAppRequest(request);
    if (!user) return jsonError(401, 'Unauthorized.');

    let payload: Body;
    try { payload = (await request.json()) as Body; }
    catch { return jsonError(400, 'Invalid JSON body.'); }

    const text = (payload.text ?? '').trim();
    if (!text) return jsonError(400, 'text is required.');
    if (text.length > 2000) return jsonError(400, 'text too long.');

    const targetLanguage = (payload.targetLanguage ?? '').trim();
    if (!isAppLanguage(targetLanguage)) return jsonError(400, 'targetLanguage must be en, ru, or zh.');

    const rawSource = (payload.sourceLanguage ?? '').trim();
    const sourceLanguage: AppLanguage | undefined = isAppLanguage(rawSource)
        ? rawSource
        : undefined;

    try {
        const result = await translateWithMyMemory(text, targetLanguage, sourceLanguage);
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Translation failed.';
        // Return a soft failure so the UI can fall back to the original.
        return NextResponse.json(
            {
                success: false,
                error: message,
                sourceLanguage: sourceLanguage ?? guessLanguage(text),
                targetLanguage,
            },
            { status: 502 }
        );
    }
}
