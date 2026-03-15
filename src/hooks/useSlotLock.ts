// Slot locking hook — handles 5-min atomic slot reservation
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LockState = "idle" | "locking" | "locked" | "failed" | "expired";

export function useSlotLock() {
  const [lockState, setLockState] = useState<LockState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const sessionToken = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedStaffId = useRef<string>("");

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const release = useCallback(async () => {
    clearTimer();
    if (sessionToken.current) {
      await (supabase as any).rpc("release_slot_lock", { p_session_token: sessionToken.current });
      sessionToken.current = "";
      lockedStaffId.current = "";
    }
    setLockState("idle");
    setSecondsLeft(0);
  }, []);

  const claimSlot = useCallback(async (params: {
    staffId: string;
    date: string;
    time: string;
    clientName?: string;
    clientPhone?: string;
  }): Promise<boolean> => {
    // If already locked for same staff+slot, extend (return true)
    if (lockState === "locked" && lockedStaffId.current === params.staffId) return true;

    // Release any previous lock
    await release();
    setLockState("locking");

    const token = crypto.randomUUID();
    sessionToken.current = token;

    const { data, error } = await (supabase as any).rpc("try_claim_slot", {
      p_staff_id:      params.staffId,
      p_date:          params.date,
      p_time:          params.time,
      p_session_token: token,
      p_client_name:   params.clientName || null,
      p_client_phone:  params.clientPhone || null,
    });

    if (error || !data) {
      setLockState("failed");
      sessionToken.current = "";
      return false;
    }

    lockedStaffId.current = params.staffId;
    setLockState("locked");
    setSecondsLeft(300); // 5 minutes

    clearTimer();
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          setLockState("expired");
          sessionToken.current = "";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return true;
  }, [lockState, release]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (sessionToken.current) {
        (supabase as any).rpc("release_slot_lock", { p_session_token: sessionToken.current });
      }
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return { lockState, secondsLeft, formattedTime: formatTime(secondsLeft), claimSlot, release, sessionToken };
}
