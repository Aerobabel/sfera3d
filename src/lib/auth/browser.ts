import type { Session } from "@supabase/supabase-js";

type SessionPayload = Pick<Session, "access_token" | "refresh_token">;

export const syncServerAuthSession = async (session: SessionPayload) => {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to sync server auth session.");
  }
};

export const clearServerAuthSession = async () => {
  await fetch("/api/auth/session", {
    method: "DELETE",
    cache: "no-store",
  });
};
