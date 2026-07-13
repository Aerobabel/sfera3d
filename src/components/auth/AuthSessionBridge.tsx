'use client';

import { useEffect, useRef } from "react";
import { clearServerAuthSession, syncServerAuthSession } from "@/lib/auth/browser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const getSessionKey = (accessToken: string, refreshToken: string) =>
  `${accessToken}:${refreshToken}`;

export default function AuthSessionBridge() {
  const lastSyncedSessionKeyRef = useRef("");

  useEffect(() => {
    const syncSession = async (
      session:
        | {
            access_token: string;
            refresh_token: string;
          }
        | null
        | undefined
    ) => {
      if (!session) {
        if (!lastSyncedSessionKeyRef.current) return;

        lastSyncedSessionKeyRef.current = "";
        await clearServerAuthSession().catch(() => {
          // Ignore background cleanup failures.
        });
        return;
      }

      const nextSessionKey = getSessionKey(
        session.access_token,
        session.refresh_token
      );

      if (lastSyncedSessionKeyRef.current === nextSessionKey) {
        return;
      }

      lastSyncedSessionKeyRef.current = nextSessionKey;
      await syncServerAuthSession(session).catch(() => {
        // Ignore background sync failures.
      });
    };

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          void syncSession(nextSession);
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    } catch {
      return () => {};
    }
  }, []);

  return null;
}
