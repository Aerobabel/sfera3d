import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SupplierChatRow = {
  id: string;
  supplier_id: string;
  sender_role: "buyer" | "supplier";
  sender_name: string;
  message: string;
  created_at: string;
};

type SupplierChatApiMessage = {
  id: string;
  supplierId: string;
  senderRole: "buyer" | "supplier";
  senderName: string;
  text: string;
  createdAt: number;
};

const toApiMessage = (row: SupplierChatRow): SupplierChatApiMessage => ({
  id: row.id,
  supplierId: row.supplier_id,
  senderRole: row.sender_role,
  senderName: row.sender_name,
  text: row.message,
  createdAt: Date.parse(row.created_at),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId")?.trim() || "sup_nonagon";

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
  const payload: unknown = await request.json();
  const body = (payload && typeof payload === "object"
    ? payload
    : {}) as {
    supplierId?: unknown;
    senderRole?: unknown;
    senderName?: unknown;
    text?: unknown;
  };

  const supplierId =
    typeof body.supplierId === "string" && body.supplierId.trim().length > 0
      ? body.supplierId.trim()
      : "";
  const senderRole = body.senderRole === "supplier" ? "supplier" : "buyer";
  const senderName =
    typeof body.senderName === "string" && body.senderName.trim().length > 0
      ? body.senderName.trim()
      : senderRole === "supplier"
      ? "Supplier"
      : "Buyer";
  const text = typeof body.text === "string" ? body.text.trim() : "";

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

    return NextResponse.json({ success: true, message: toApiMessage(data as SupplierChatRow) });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create supplier message.";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
