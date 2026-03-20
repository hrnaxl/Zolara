/**
 * useSessionGuard
 *
 * Validates single-session on every route focus/load.
 * If another device has explicitly logged in (invalidating this session),
 * forces logout with a message.
 *
 * Robustness: if local token is missing (cleared storage, new tab, fresh browser),
 * we register a new session rather than treating it as displacement.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { validateSession, clearLocalSession, pingSession, registerSession } from "@/lib/sessionManager";

const CHECK_INTERVAL_MS = 60_000;
const PING_INTERVAL_MS  = 5 * 60_000;

export function useSessionGuard() {
  const navigate = useNavigate();
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let userId: string | null = null;

    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    };

    const check = async () => {
      if (!userId) userId = await getUserId();
      // No user authenticated at all — let normal auth redirect handle it
      if (!userId) return;

      const localToken = localStorage.getItem("zolara_session_token");

      if (!localToken) {
        // No local token — this is NOT displacement. It means localStorage was
        // cleared (refresh, new tab, incognito, etc.). Register a fresh session.
        await registerSession(userId).catch(() => {});
        return;
      }

      const valid = await validateSession(userId);
      if (!valid) {
        // Token exists but DB says it's inactive — REAL displacement
        clearLocalSession();
        await supabase.auth.signOut();
        navigate("/app/auth", { replace: true, state: { reason: "displaced" } });
      }
    };

    const ping = async () => {
      if (!userId) userId = await getUserId();
      if (userId) pingSession(userId).catch(() => {});
    };

    check();

    checkRef.current = setInterval(check, CHECK_INTERVAL_MS);
    pingRef.current  = setInterval(ping, PING_INTERVAL_MS);

    window.addEventListener("focus", check);

    return () => {
      if (checkRef.current) clearInterval(checkRef.current);
      if (pingRef.current)  clearInterval(pingRef.current);
      window.removeEventListener("focus", check);
    };
  }, [navigate]);
}
