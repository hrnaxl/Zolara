/**
 * sessionManager.ts
 * 
 * Handles single-session enforcement (one active session per user).
 * Uses a `user_sessions` table in Supabase to track active tokens.
 * 
 * SQL to run once in Supabase:
 * 
 * CREATE TABLE IF NOT EXISTS public.user_sessions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   session_token TEXT NOT NULL UNIQUE,
 *   device_info TEXT,
 *   last_active TIMESTAMPTZ DEFAULT NOW(),
 *   is_active BOOLEAN DEFAULT TRUE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
 * CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
 * ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "service_role_full" ON public.user_sessions FOR ALL USING (true);
 */

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "zolara_session_token";

/** Generate a secure random token */
function genToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Device info string for display */
function getDeviceInfo(): string {
  return navigator.userAgent.slice(0, 200);
}

/**
 * Called after successful login.
 * Invalidates all previous sessions for this user and creates a new one.
 */
export async function registerSession(userId: string): Promise<string> {
  const token = genToken();

  // Invalidate all previous sessions server-side
  await (supabase as any)
    .from("user_sessions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  // Insert the new session
  await (supabase as any).from("user_sessions").insert({
    user_id: userId,
    session_token: token,
    device_info: getDeviceInfo(),
    is_active: true,
    last_active: new Date().toISOString(),
  });

  localStorage.setItem(SESSION_KEY, token);
  return token;
}

/**
 * Called on every route load / app focus.
 * Returns true if the current session is still the active one.
 * Returns false if another device has logged in (token mismatch).
 */
export async function validateSession(userId: string): Promise<boolean> {
  const localToken = localStorage.getItem(SESSION_KEY);
  if (!localToken) return false;

  const { data } = await (supabase as any)
    .from("user_sessions")
    .select("is_active")
    .eq("user_id", userId)
    .eq("session_token", localToken)
    .maybeSingle();

  return data?.is_active === true;
}

/** Update last_active timestamp — called on user interactions */
export async function pingSession(userId: string): Promise<void> {
  const localToken = localStorage.getItem(SESSION_KEY);
  if (!localToken) return;
  await (supabase as any)
    .from("user_sessions")
    .update({ last_active: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("session_token", localToken)
    .eq("is_active", true);
}

/** Clear local session token */
export function clearLocalSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
