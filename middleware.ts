import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  getAudienceForPath,
  getDefaultRedirectPath,
  getUserRole,
  normalizeNextPath,
  writeSessionCookies,
} from "@/lib/auth/shared";

type SupabaseAuthUser = {
  email?: string | null;
  user_metadata?: unknown;
};

type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
  user: SupabaseAuthUser | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const buildLoginRedirect = (request: NextRequest) => {
  const audience = getAudienceForPath(request.nextUrl.pathname);
  const requestsPlayerEntry =
    request.nextUrl.pathname === "/roles" ||
    (request.nextUrl.pathname === "/fastview" && request.nextUrl.searchParams.get("mode") === "player");
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("role", requestsPlayerEntry ? "player" : audience);
  loginUrl.searchParams.set(
    "next",
    normalizeNextPath(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      getDefaultRedirectPath(audience)
    )
  );

  return loginUrl;
};

const fetchSupabaseUser = async (accessToken: string) => {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as SupabaseAuthUser;
  } catch {
    return null;
  }
};

const refreshSupabaseSession = async (refreshToken: string): Promise<RefreshedSession | null> => {
  if (!supabaseUrl || !supabaseAnonKey || !refreshToken) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      user?: SupabaseAuthUser | null;
    };

    if (!data.access_token || !data.refresh_token) {
      return null;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: data.user ?? null,
    };
  } catch {
    return null;
  }
};

export async function middleware(request: NextRequest) {
  const loginUrl = buildLoginRedirect(request);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? "";

  let user = accessToken ? await fetchSupabaseUser(accessToken) : null;
  let nextAccessToken = accessToken;
  let nextRefreshToken = refreshToken;

  if (!user && refreshToken) {
    const refreshedSession = await refreshSupabaseSession(refreshToken);
    if (refreshedSession) {
      nextAccessToken = refreshedSession.accessToken;
      nextRefreshToken = refreshedSession.refreshToken;
      user =
        refreshedSession.user ?? (await fetchSupabaseUser(refreshedSession.accessToken));
    }
  }

  if (!user) {
    const response = NextResponse.redirect(loginUrl);
    clearSessionCookies(response);
    return response;
  }

  const requiresSupplierRole = request.nextUrl.pathname.startsWith("/supplier/dashboard");
  if (requiresSupplierRole && getUserRole(user) !== "supplier") {
    return NextResponse.redirect(new URL(getDefaultRedirectPath("user"), request.url));
  }

  const response = NextResponse.next();

  if (
    nextAccessToken &&
    nextRefreshToken &&
    (nextAccessToken !== accessToken || nextRefreshToken !== refreshToken)
  ) {
    writeSessionCookies(response, nextAccessToken, nextRefreshToken);
  }

  return response;
}

export const config = {
  matcher: ["/experience", "/fastview", "/roles", "/player/dashboard/:path*", "/supplier/dashboard/:path*"],
};
