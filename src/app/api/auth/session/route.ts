import { NextResponse } from "next/server";
import { authenticateAppRequest } from "@/lib/auth/server";
import {
  clearSessionCookies,
  getAudienceFromRole,
  getDefaultRedirectPath,
  getUserDisplayName,
  getUserRole,
  writeSessionCookies,
} from "@/lib/auth/shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SessionBody = {
  accessToken?: unknown;
  refreshToken?: unknown;
};

const jsonError = (status: number, error: string) =>
  NextResponse.json({ success: false, error }, { status });

export async function GET(request: Request) {
  const authenticatedUser = await authenticateAppRequest(request);
  if (!authenticatedUser) {
    return jsonError(401, "Unauthorized.");
  }

  return NextResponse.json({
    success: true,
    user: {
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      displayName: authenticatedUser.displayName,
      supplierId: authenticatedUser.supplierId,
      supplierName: authenticatedUser.supplierName,
      defaultRedirectPath: getDefaultRedirectPath(
        getAudienceFromRole(authenticatedUser.role)
      ),
    },
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SessionBody | null;
  const accessToken =
    typeof payload?.accessToken === "string" ? payload.accessToken.trim() : "";
  const refreshToken =
    typeof payload?.refreshToken === "string" ? payload.refreshToken.trim() : "";

  if (!accessToken || !refreshToken) {
    return jsonError(400, "Both accessToken and refreshToken are required.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return jsonError(401, "Invalid session.");
  }

  const response = NextResponse.json({
    success: true,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      role: getUserRole(data.user),
      displayName: getUserDisplayName(data.user),
    },
  });

  writeSessionCookies(response, accessToken, refreshToken);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
