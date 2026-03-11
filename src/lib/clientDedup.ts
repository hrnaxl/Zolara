import { supabase } from "@/integrations/supabase/client";

/**
 * Normalize a Ghanaian phone number to canonical +233XXXXXXXXX form.
 * Handles: 0XX... → +233XX..., +233XX... → +233XX..., 233XX... → +233XX...
 * Strips all spaces.
 */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/\s/g, "").replace(/-/g, "");
  if (!stripped) return null;

  if (stripped.startsWith("+233")) return stripped;           // already canonical
  if (stripped.startsWith("233")) return "+" + stripped;     // missing leading +
  if (stripped.startsWith("0")) return "+233" + stripped.slice(1); // local 0XX form
  return stripped; // unknown format — keep as-is
}

/**
 * Return both canonical (+233) and local (0) forms so we can match
 * whichever format is stored in the DB.
 */
function phoneForms(raw?: string | null): string[] {
  const canonical = normalizePhone(raw);
  if (!canonical) return [];
  const forms = new Set<string>([canonical]);
  // Also add local 0XX form
  if (canonical.startsWith("+233")) forms.add("0" + canonical.slice(4));
  if (canonical.startsWith("+233")) forms.add("233" + canonical.slice(4));
  return [...forms];
}

/**
 * Find an existing client by phone OR email, or create one if not found.
 *
 * Match priority:
 *   1. Phone match — checked against +233, 0, and 233 forms simultaneously
 *   2. Email match — case-insensitive
 *   3. Create new if neither matches
 *
 * On match, normalises the stored phone to canonical form and fills any missing fields.
 */
export async function findOrCreateClient(params: {
  name: string;
  phone?: string | null;
  email?: string | null;
  userId?: string | null;
}): Promise<string | null> {
  const { name, userId } = params;
  const canonical = normalizePhone(params.phone);
  const email = params.email?.toLowerCase().trim() || null;

  if (!name) return null;

  let existingId: string | null = null;
  let existingRecord: any = null;

  // 1. Phone match — query all known forms at once
  if (canonical) {
    const forms = phoneForms(params.phone);
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone, user_id")
      .in("phone", forms)
      .limit(1)
      .maybeSingle();
    if (data) { existingId = data.id; existingRecord = data; }
  }

  // 2. Email match — case-insensitive
  if (!existingId && email) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone, user_id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (data) { existingId = data.id; existingRecord = data; }
  }

  // 3. Found — patch any missing/better fields
  if (existingId && existingRecord) {
    const updates: Record<string, any> = {};

    // Always normalise phone to canonical form if stored in a different format
    if (canonical && existingRecord.phone !== canonical) updates.phone = canonical;
    if (email && !existingRecord.email) updates.email = email;
    if (userId && !existingRecord.user_id) updates.user_id = userId;

    if (Object.keys(updates).length > 0) {
      await supabase.from("clients").update(updates).eq("id", existingId);
    }
    return existingId;
  }

  // 4. No match — create new, always store canonical phone
  const { data: newClient } = await supabase
    .from("clients")
    .insert({
      name,
      phone: canonical || null,
      email: email || null,
      user_id: userId || null,
    })
    .select("id")
    .single();

  return newClient?.id ?? null;
}
