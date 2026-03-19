import { AppLanguage, isAppLanguage } from "./i18n";

export const CHAT_TRANSLATION_LANGUAGES: AppLanguage[] = ["en", "ru", "zh"];

const CHAT_LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  ru: "Russian",
  zh: "Simplified Chinese",
};

const OPENAI_TRANSLATION_MODEL = "gpt-4.1-mini";

type TranslationResponseShape = Partial<Record<AppLanguage, string>>;

const hasCyrillic = (value: string) => /[\u0400-\u04FF]/.test(value);
const hasHan = (value: string) => /[\u3400-\u9FFF]/.test(value);

export const resolveChatLanguage = (value: unknown): AppLanguage | null =>
  isAppLanguage(value) ? value : null;

export const guessChatLanguage = (value: string): AppLanguage => {
  if (hasHan(value)) return "zh";
  if (hasCyrillic(value)) return "ru";
  return "en";
};

const extractResponseText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;

  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct.trim();
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text =
        (block as { text?: unknown }).text ??
        (block as { output_text?: unknown }).output_text;

      if (typeof text === "string" && text.trim().length > 0) {
        return text.trim();
      }
    }
  }

  return null;
};

const parseTranslationResponse = (rawText: string): TranslationResponseShape | null => {
  const trimmed = rawText.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const normalized: TranslationResponseShape = {};
    for (const language of CHAT_TRANSLATION_LANGUAGES) {
      const candidate = (parsed as Record<string, unknown>)[language];
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        normalized[language] = candidate.trim();
      }
    }

    return normalized;
  } catch {
    return null;
  }
};

const requestTranslationsFromOpenAI = async (
  text: string,
  sourceLanguage: AppLanguage
): Promise<TranslationResponseShape | null> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_TRANSLATION_MODEL,
      instructions: [
        "You translate short B2B marketplace chat messages.",
        "Return only valid JSON with the keys en, ru, zh.",
        `The source language is ${CHAT_LANGUAGE_LABELS[sourceLanguage]}.`,
        "For the source language, copy the original message exactly.",
        "Translate naturally for business chat.",
        "Preserve @mentions, URLs, product codes, SKUs, numbers, prices, currencies, and line breaks.",
        "Do not add explanations, markdown, or extra keys.",
      ].join(" "),
      input: `Message:\n${text}`,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  const responseText = extractResponseText(payload);
  if (!responseText) return null;

  return parseTranslationResponse(responseText);
};

export const buildChatLocalizations = async (
  text: string,
  preferredLanguage?: AppLanguage | null
): Promise<Partial<Record<AppLanguage, string>>> => {
  const guessedLanguage = guessChatLanguage(text);
  const sourceLanguage =
    preferredLanguage && preferredLanguage === guessedLanguage
      ? preferredLanguage
      : guessedLanguage;
  const localizations: Partial<Record<AppLanguage, string>> = {
    [sourceLanguage]: text,
  };

  const translated = await requestTranslationsFromOpenAI(text, sourceLanguage);
  if (!translated) {
    return localizations;
  }

  for (const language of CHAT_TRANSLATION_LANGUAGES) {
    const candidate = translated[language];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      localizations[language] = candidate.trim();
    }
  }

  if (!localizations[sourceLanguage]) {
    localizations[sourceLanguage] = text;
  }

  return localizations;
};
