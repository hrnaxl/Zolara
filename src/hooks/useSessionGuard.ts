/**
 * useSessionGuard
 * 
 * Validates single-session on every route focus/load.
 * If another device has logged in, forces logout with a message.
 * 
 * Usage: call once inside each protected layout.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { validateSession, clearLocalSession, pingSession } from "@/lib/sessionManager";

// Check every 60 seconds — enough to catch displacement quickly without hammering DB
const CHECK_INTERVAL_MS = 60_000;
const PING_INTERVAL_MS  = 5 * 60_000; // ping last_active every 5 min

export function useSessionGuard() {
  const navigate    = useNavigate();
  const checkRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let userId: string | null = null;

    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    };

    const check = async () => {
      if (!userId) userId = await getUserId();
      if (!userId) return;

      const valid = await validateSession(userId);
      if (!valid) {
        clearLocalSession();
        await supabase.auth.signOut();
        navigate("/app/auth", { replace: true, state: { reason: "displaced" } });
      }
    };

    const ping = async () => {
      if (!userId) userId = await getUserId();
      if (userId) pingSession(userId).catch(() => {});
    };

    // Initial check on mount
    check();

    // Periodic checks
    checkRef.current = setInterval(check, CHECK_INTERVAL_MS);
    pingRef.current  = setInterval(ping,  PING_INTERVAL_MS);

    // Also check when window regains focus (user switches tabs/devices)
    window.addEventListener("focus", check);

    return () => {
      if (checkRef.current) clearInterval(checkRef.current);
      if (pingRef.current)  clearInterval(pingRef.current);
      window.removeEventListener("focus", check);
    };
  }, [navigate]);
}
