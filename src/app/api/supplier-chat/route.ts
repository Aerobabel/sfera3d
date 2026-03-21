import { NextResponse } from "next/server";
import { authenticateAppRequest } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildChatLocalizations, CHAT_TRANSLATION_LANGUAGES, resolveChatLanguage } from "@/lib/chatTranslation";
import { AppLanguage } from "@/lib/i18n";
import { SupplierChatApiMessage } from "@/lib/supplierChat";

type SupplierChatRow = {
  id: string;
  supplier_id: string;
  sender_role: "buyer" | "supplier";
  sender_name: string;
  message: string;
  created_at: string;
};

type SupplierChatTranslationRow = {
  message_id: string;
  language: AppLanguage;
  translated_text: string;
};

type ViewerTranslationLookup = {
  viewerTranslations: Map<string, string>;
  translationCounts: Map<string, number>;
};

const DEFAULT_SUPPLIER_ID = "sup_nonagon";
const MAX_TRANSLATION_BACKFILL_MESSAGES = 24;
const UNAUTHORIZED_ERROR = "Unauthorized. Sign in and retry.";

const isMissingRelationError = (error: { code?: string; message?: string } | null | undefined) => {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /does not exist/i.test(error.message ?? "") ||
    /Could not find the table/i.test(error.message ?? "")
  );
};

const toApiMessage = (
  row: SupplierChatRow,
  viewerLanguage?: AppLanguage | null,
  translatedText?: string
): SupplierChatApiMessage => {
  const originalText = row.message;
  const isTranslated = Boolean(
    viewerLanguage &&
      translatedText &&
      translatedText.trim().length > 0 &&
      translatedText.trim() !== originalText.trim()
  );

  return {
    id: row.id,
    supplierId: row.supplier_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    text: isTranslated ? translatedText!.trim() : originalText,
    createdAt: Date.parse(row.created_at),
    originalText: isTranslated ? originalText : undefined,
    viewerLanguage: viewerLanguage ?? undefined,
    isTranslated,
  };
};

const getViewerTranslations = async (
  viewerLanguage: AppLanguage | null,
  rows: SupplierChatRow[]
) : Promise<ViewerTranslationLookup> => {
  if (!viewerLanguage || rows.length === 0) {
    return {
      viewerTranslations: new Map<string, string>(),
      translationCounts: new Map<string, number>(),
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const messageIds = rows.map((row) => row.id);
    const { data, error } = await supabase
      .from("supplier_message_translations")
      .select("message_id,language,translated_text")
      .in("message_id", messageIds);

    if (error) {
      if (isMissingRelationError(error)) {
        return {
          viewerTranslations: new Map<string, string>(),
          translationCounts: new Map<string, number>(),
        };
      }

      throw new Error(error.message);
    }

    const viewerTranslations = new Map<string, string>();
    const translationCounts = new Map<string, number>();

    for (const row of (data ?? []) as SupplierChatTranslationRow[]) {
      translationCounts.set(row.message_id, (translationCounts.get(row.message_id) ?? 0) + 1);
      if (row.language === viewerLanguage) {
        viewerTranslations.set(row.message_id, row.translated_text);
      }
    }

    return { viewerTranslations, translationCounts };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load supplier chat translations.";
    console.error(message);
    return {
      viewerTranslations: new Map<string, string>(),
      translationCounts: new Map<string, number>(),
    };
  }
};

const cacheMessageTranslations = async (
  messageId: string,
  text: string,
  senderLanguage: AppLanguage | null
) => {
  try {
    const localizations = await buildChatLocalizations(text, senderLanguage);
    const rows = CHAT_TRANSLATION_LANGUAGES.map((language) => {
      const localizedText = localizations[language];
      if (!localizedText || localizedText.trim().length === 0) {
        return null;
      }

      return {
        message_id: messageId,
        language,
        translated_text: localizedText.trim(),
      };
    }).filter(Boolean);

    if (rows.length === 0) return;

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("supplier_message_translations")
      .upsert(rows, { onConflict: "message_id,language" });

    if (error && !isMissingRelationError(error)) {
      console.error(error.message);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to cache supplier chat translations.";
    console.error(message);
  }
};

const upsertTranslationRows = async (
  rows: Array<{
    message_id: string;
    language: AppLanguage;
    translated_text: string;
  }>
) => {
  if (rows.length === 0) return;

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("supplier_message_translations")
      .upsert(rows, { onConflict: "message_id,language" });

    if (error && !isMissingRelationError(error)) {
      console.error(error.message);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upsert supplier chat translations.";
    console.error(message);
  }
};

const backfillViewerTranslations = async (
  viewerLanguage: AppLanguage | null,
  rows: SupplierChatRow[],
  existingTranslations: Map<string, string>,
  translationCounts: Map<string, number>
) => {
  if (!viewerLanguage || rows.length === 0) {
    return existingTranslations;
  }

  const missingRows = rows
    .filter((row) => {
      const cachedCount = translationCounts.get(row.id) ?? 0;
      return !existingTranslations.has(row.id) || cachedCount < CHAT_TRANSLATION_LANGUAGES.length;
    })
    .slice(-MAX_TRANSLATION_BACKFILL_MESSAGES);

  if (missingRows.length === 0) {
    return existingTranslations;
  }

  const translationRows: Array<{
    message_id: string;
    language: AppLanguage;
    translated_text: string;
  }> = [];
  const hydratedTranslations = new Map(existingTranslations);

  for (const row of missingRows) {
    const localizations = await buildChatLocalizations(row.message);
    const translatedForViewer = localizations[viewerLanguage];

    for (const language of CHAT_TRANSLATION_LANGUAGES) {
      const localizedText = localizations[language];
      if (!localizedText || localizedText.trim().length === 0) continue;

      translationRows.push({
        message_id: row.id,
        language,
        translated_text: localizedText.trim(),
      });
    }

    if (translatedForViewer && translatedForViewer.trim().length > 0) {
      hydratedTranslations.set(row.id, translatedForViewer.trim());
    }
  }

  await upsertTranslationRows(translationRows);
  return hydratedTranslations;
};

export async function GET(request: Request) {
  const authenticatedUser = await authenticateAppRequest(request);
  if (!authenticatedUser) {
    return NextResponse.json(
      { success: false, error: UNAUTHORIZED_ERROR, messages: [] },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedSupplierId = searchParams.get("supplierId")?.trim() || DEFAULT_SUPPLIER_ID;
  const viewerLanguage = resolveChatLanguage(searchParams.get("viewerLanguage"));
  const supplierId =
    authenticatedUser.role === "supplier"
      ? authenticatedUser.supplierId?.trim() || requestedSupplierId
      : requestedSupplierId;

  if (
    authenticatedUser.role === "supplier" &&
    authenticatedUser.supplierId &&
    requestedSupplierId !== authenticatedUser.supplierId
  ) {
    return NextResponse.json(
      { success: false, error: "Forbidden.", messages: [] },
      { status: 403 }
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("supplier_messages")
      .select("id,supplier_id,sender_role,sender_name,message,created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, messages: [] },
        { status: 500 }
      );
    }

    const rows = data as SupplierChatRow[];
    const { viewerTranslations, translationCounts } = await getViewerTranslations(viewerLanguage, rows);
    const hydratedTranslationMap = await backfillViewerTranslations(
      viewerLanguage,
      rows,
      viewerTranslations,
      translationCounts
    );
    const messages = rows.map((row) =>
      toApiMessage(row, viewerLanguage, hydratedTranslationMap.get(row.id))
    );

    return NextResponse.json({ success: true, messages });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load supplier messages.";

    return NextResponse.json(
      { success: false, error: errorMessage, messages: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authenticatedUser = await authenticateAppRequest(request);
  if (!authenticatedUser) {
    return NextResponse.json(
      { success: false, error: UNAUTHORIZED_ERROR },
      { status: 401 }
    );
  }

  const payload: unknown = await request.json();
  const body = (payload && typeof payload === "object"
    ? payload
    : {}) as {
    supplierId?: unknown;
    senderRole?: unknown;
    senderName?: unknown;
    text?: unknown;
    senderLanguage?: unknown;
  };

  const requestedSupplierId =
    typeof body.supplierId === "string" && body.supplierId.trim().length > 0
      ? body.supplierId.trim()
      : "";
  const supplierId =
    authenticatedUser.role === "supplier"
      ? authenticatedUser.supplierId?.trim() || requestedSupplierId || DEFAULT_SUPPLIER_ID
      : requestedSupplierId;
  const senderRole = authenticatedUser.role === "supplier" ? "supplier" : "buyer";
  const senderName =
    senderRole === "supplier"
      ? authenticatedUser.supplierName || authenticatedUser.displayName
      : authenticatedUser.displayName;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const senderLanguage = resolveChatLanguage(body.senderLanguage);

  if (
    authenticatedUser.role === "supplier" &&
    authenticatedUser.supplierId &&
    requestedSupplierId &&
    requestedSupplierId !== authenticatedUser.supplierId
  ) {
    return NextResponse.json(
      { success: false, error: "Forbidden." },
      { status: 403 }
    );
  }

  if (!supplierId) {
    return NextResponse.json(
      { success: false, error: "supplierId is required." },
      { status: 400 }
    );
  }

  if (!text) {
    return NextResponse.json(
      { success: false, error: "Message text is required." },
      { status: 400 }
    );
  }

  if (text.length > 2000) {
    return NextResponse.json(
      { success: false, error: "Message text exceeds 2000 characters." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("supplier_messages")
      .insert({
        supplier_id: supplierId,
        sender_role: senderRole,
        sender_name: senderName,
        message: text,
      })
      .select("id,supplier_id,sender_role,sender_name,message,created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message ?? "Failed to create message." },
        { status: 500 }
      );
    }

    await cacheMessageTranslations(data.id, text, senderLanguage);

    return NextResponse.json({
      success: true,
      message: toApiMessage(data as SupplierChatRow, senderLanguage),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create supplier message.";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
