import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export function useInactivityLogout(timeoutMs: number) {
  const navigate  = useNavigate();
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/app/auth", { replace: true });
      }, timeoutMs);
    };

    // Start timer immediately
    reset();

    // Reset on any activity
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);
}
