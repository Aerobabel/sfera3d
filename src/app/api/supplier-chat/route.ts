import { NextResponse } from "next/server";
import { authenticateAppRequest } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SupplierChatApiMessage } from "@/lib/supplierChat";

// Eager per-message translation (OpenAI) was removed because OpenAI /
// Anthropic APIs aren't reliably reachable from Russia. Clients now
// translate on demand via /api/translate (MyMemory-backed) using the
// TranslatableText component. The supplier_message_translations table
// is preserved for historical reads but we no longer write to it.

type SupplierChatRow = {
  id: string;
  supplier_id: string;
  sender_role: "buyer" | "supplier";
  sender_name: string;
  message: string;
  created_at: string;
};

const DEFAULT_SUPPLIER_ID = "sup_nonagon";
const UNAUTHORIZED_ERROR = "Unauthorized. Sign in and retry.";

const toApiMessage = (row: SupplierChatRow): SupplierChatApiMessage => ({
  id: row.id,
  supplierId: row.supplier_id,
  senderRole: row.sender_role,
  senderName: row.sender_name,
  text: row.message,
  createdAt: Date.parse(row.created_at),
  // Legacy fields retained on the wire for compatibility with the
  // existing ChatMessage shape on the client. They now always indicate
  // "no server-side translation" — the UI calls /api/translate directly.
  originalText: undefined,
  viewerLanguage: undefined,
  isTranslated: false,
});

export async function GET(request: Request) {
  const authenticatedUser = await authenticateAppRequest(request);
  if (!authenticatedUser) {
    return NextResponse.json(
      { success: false, error: UNAUTHORIZED_ERROR, messages: [] },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedSupplierId =
    searchParams.get("supplierId")?.trim() || DEFAULT_SUPPLIER_ID;

  // Pavilion-scoped conversations (pav_*) are open to any authenticated user.
  // For real supplier threads, suppliers can only read their own.
  const isPavilionConversation = requestedSupplierId.startsWith("pav_");
  const supplierId = isPavilionConversation
    ? requestedSupplierId
    : authenticatedUser.role === "supplier"
      ? authenticatedUser.supplierId?.trim() || requestedSupplierId
      : requestedSupplierId;
  if (
    !isPavilionConversation &&
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

    const messages = (data as SupplierChatRow[]).map(toApiMessage);
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
  const body = (payload && typeof payload === "object" ? payload : {}) as {
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
  const isPavilionConversationWrite = requestedSupplierId.startsWith("pav_");

  const supplierId = isPavilionConversationWrite
    ? requestedSupplierId
    : authenticatedUser.role === "supplier"
      ? authenticatedUser.supplierId?.trim() || requestedSupplierId || DEFAULT_SUPPLIER_ID
      : requestedSupplierId;

  // Pavilion threads don't yet have a staff-reply surface; every post in
  // a pavilion thread is 'buyer' (right-side bubble). Real supplier
  // threads keep the normal role mapping.
  const senderRole = isPavilionConversationWrite
    ? ("buyer" as const)
    : authenticatedUser.role === "supplier"
      ? "supplier"
      : "buyer";
  const senderName =
    senderRole === "supplier"
      ? authenticatedUser.supplierName || authenticatedUser.displayName
      : authenticatedUser.displayName;
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (
    !isPavilionConversationWrite &&
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

    return NextResponse.json({
      success: true,
      message: toApiMessage(data as SupplierChatRow),
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
