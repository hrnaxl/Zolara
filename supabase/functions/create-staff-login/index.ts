// create-staff-login: creates auth user for staff without signing out the admin
// Uses service role admin API — browser signUp() would sign out the current admin session
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { staff_id, email, password, role, name } = await req.json();
    if (!staff_id || !email || !password) {
      return new Response(JSON.stringify({ error: "staff_id, email and password required" }), { status: 400, headers: cors });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user via admin API — does NOT affect caller's session
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm so they can log in immediately
      user_metadata: { role: role || "staff", name },
    });

    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("No user ID returned");

    // Link to staff record and set role
    await supabase.from("user_roles").upsert({ user_id: userId, role: role || "staff" });
    await supabase.from("staff").update({ user_id: userId }).eq("id", staff_id);

    return new Response(JSON.stringify({ success: true, user_id: userId }), { headers: cors });

  } catch (err: any) {
    console.error("create-staff-login error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
