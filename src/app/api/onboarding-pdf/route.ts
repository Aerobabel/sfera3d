import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const FILES = {
  en: "english_onboarding.pdf",
  ru: "russian_onboarding.pdf",
  zh: "chinese_onboarding.pdf",
} as const;

type SupportedLanguage = keyof typeof FILES;

export const runtime = "nodejs";

const resolveLanguage = (request: Request): SupportedLanguage => {
  const lang = new URL(request.url).searchParams.get("lang");
  if (lang === "ru" || lang === "zh" || lang === "en") {
    return lang;
  }
  return "en";
};

export async function GET(request: Request) {
  const language = resolveLanguage(request);
  const filename = FILES[language];
  const filePath = path.join(process.cwd(), "public", "onboarding", filename);

  try {
    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "PDF not found." }, { status: 404 });
  }
}
