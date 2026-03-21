import type { User } from "@supabase/supabase-js";

export const ACCESS_TOKEN_COOKIE = "3dsfera-access-token";
export const REFRESH_TOKEN_COOKIE = "3dsfera-refresh-token";

export type AppAuthRole = "buyer" | "supplier";
export type AppAudience = "user" | "supplier";

type CookieTarget = {
  cookies: {
    set: (options: {
      name: string;
      value: string;
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge?: number;
    }) => void;
  };
};

const REFRESH_TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const toTitleCase = (value: string) =>
  value
    .split(/[._-\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const segments = token.split(".");
  if (segments.length < 2) return null;

  try {
    const payload = segments[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(segments[1].length / 4) * 4, "=");
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
};

const getAccessTokenMaxAge = (token: string) => {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (!exp) return undefined;

  const secondsRemaining = exp - Math.floor(Date.now() / 1000);
  return secondsRemaining > 0 ? secondsRemaining : 0;
};

const getCookieValue = (cookieHeader: string, name: string) => {
  const needle = `${name}=`;
  const segment = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(needle));

  if (!segment) return "";

  try {
    return decodeURIComponent(segment.slice(needle.length));
  } catch {
    return segment.slice(needle.length);
  }
};

export const writeSessionCookies = (
  target: CookieTarget,
  accessToken: string,
  refreshToken: string
) => {
  target.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: accessToken,
    ...baseCookieOptions,
    maxAge: getAccessTokenMaxAge(accessToken),
  });

  target.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: refreshToken,
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
  });
};

export const clearSessionCookies = (target: CookieTarget) => {
  target.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    ...baseCookieOptions,
    maxAge: 0,
  });

  target.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: "",
    ...baseCookieOptions,
    maxAge: 0,
  });
};

export const extractBearerToken = (request: Pick<Request, "headers">) => {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return "";
  return authorization.slice("Bearer ".length).trim();
};

export const extractAccessTokenFromRequest = (request: Pick<Request, "headers">) => {
  const bearerToken = extractBearerToken(request);
  if (bearerToken) return bearerToken;

  const cookieHeader = request.headers.get("cookie") ?? "";
  return getCookieValue(cookieHeader, ACCESS_TOKEN_COOKIE);
};

export const extractRefreshTokenFromRequest = (request: Pick<Request, "headers">) => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return getCookieValue(cookieHeader, REFRESH_TOKEN_COOKIE);
};

export const getUserMetadata = (
  user: Pick<User, "user_metadata"> | { user_metadata?: unknown } | null | undefined
) => {
  if (user?.user_metadata && typeof user.user_metadata === "object") {
    return user.user_metadata as Record<string, unknown>;
  }

  return {} as Record<string, unknown>;
};

export const getUserRole = (
  user: Pick<User, "user_metadata"> | { user_metadata?: unknown } | null | undefined
): AppAuthRole => {
  const metadata = getUserMetadata(user);
  if (metadata.role === "supplier") {
    return "supplier";
  }

  const supplierSignals = [
    metadata.supplier_id,
    metadata.supplier_name,
    metadata.pavilion_id,
  ];

  return supplierSignals.some(
    (value) => typeof value === "string" && value.trim().length > 0
  )
    ? "supplier"
    : "buyer";
};

export const getSupplierIdFromUser = (
  user: Pick<User, "user_metadata"> | { user_metadata?: unknown } | null | undefined
) => {
  const metadata = getUserMetadata(user);
  return typeof metadata.supplier_id === "string" && metadata.supplier_id.trim().length > 0
    ? metadata.supplier_id.trim()
    : null;
};

export const getSupplierNameFromUser = (
  user:
    | Pick<User, "email" | "user_metadata">
    | { email?: string | null; user_metadata?: unknown }
    | null
    | undefined
) => {
  const metadata = getUserMetadata(user);
  if (
    typeof metadata.supplier_name === "string" &&
    metadata.supplier_name.trim().length > 0
  ) {
    return metadata.supplier_name.trim();
  }

  return getUserDisplayName(user);
};

export const getUserDisplayName = (
  user:
    | Pick<User, "email" | "user_metadata">
    | { email?: string | null; user_metadata?: unknown }
    | null
    | undefined
) => {
  const metadata = getUserMetadata(user);

  if (typeof metadata.full_name === "string" && metadata.full_name.trim().length > 0) {
    return metadata.full_name.trim();
  }

  if (
    typeof metadata.supplier_name === "string" &&
    metadata.supplier_name.trim().length > 0
  ) {
    return metadata.supplier_name.trim();
  }

  const email = typeof user?.email === "string" ? user.email.trim() : "";
  if (!email) return "Guest";

  const localPart = email.split("@")[0] ?? "Guest";
  return toTitleCase(localPart) || "Guest";
};

export const getAudienceFromRole = (role: AppAuthRole): AppAudience =>
  role === "supplier" ? "supplier" : "user";

export const getDefaultRedirectPath = (audience: AppAudience) =>
  audience === "supplier" ? "/supplier/dashboard" : "/experience";

export const isRoleAllowedForPath = (role: AppAuthRole, path: string) => {
  if (path.startsWith("/supplier/dashboard")) {
    return role === "supplier";
  }

  return true;
};

export const normalizeNextPath = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  return value;
};

export const getAudienceForPath = (path: string): AppAudience =>
  path.startsWith("/supplier/dashboard") ? "supplier" : "user";
