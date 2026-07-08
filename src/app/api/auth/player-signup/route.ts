import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type PlayerSignupBody = {
  email?: unknown;
  password?: unknown;
};

const jsonError = (status: number, error: string) =>
  NextResponse.json({ success: false, error }, { status });

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizePassword = (value: unknown) =>
  typeof value === "string" ? value : "";

const nameFromEmail = (email: string) => {
  const localPart = email.split("@")[0] ?? "";
  return localPart
    .split(/[._-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const isExistingUserError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists")
  );
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as PlayerSignupBody | null;
  const email = normalizeEmail(payload?.email);
  const password = normalizePassword(payload?.password);

  if (!email || !email.includes("@")) {
    return jsonError(400, "Enter a valid email address.");
  }

  if (password.length < 6) {
    return jsonError(400, "Password must be at least 6 characters.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "buyer",
      full_name: nameFromEmail(email),
    },
  });

  if (error) {
    if (isExistingUserError(error)) {
      return jsonError(409, "This account already exists. Sign in with the password instead.");
    }

    return jsonError(500, error.message || "Unable to create account.");
  }

  return NextResponse.json({ success: true });
}
