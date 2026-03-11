import { supabase } from "@/integrations/supabase/client";

/**
 * Find an existing client by phone OR email, or create one if not found.
 * Prevents duplicate client records across all booking flows.
 *
 * Match priority:
 *   1. Phone match (strongest signal — phone is unique per person)
 *   2. Email match (if no phone match)
 *   3. Create new if neither matches
 *
 * On match, updates the record with any new/better info (name, email, phone, user_id).
 */
export async function findOrCreateClient(params: {
  name: string;
  phone?: string | null;
  email?: string | null;
  userId?: string | null;   // auth user id to link to client record
}): Promise<string | null> {
  const { name, userId } = params;
  const phone = params.phone?.replace(/\s/g, "").replace(/^0/, "+233") || null;
  const cleanPhone = params.phone?.replace(/\s/g, "") || null;
  const email = params.email?.toLowerCase().trim() || null;

  if (!name) return null;

  let existingId: string | null = null;
  let existingRecord: any = null;

  // 1. Try phone match first
  if (cleanPhone) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone, user_id")
      .eq("phone", cleanPhone)
      .maybeSingle();
    if (data) { existingId = data.id; existingRecord = data; }
  }

  // 2. Try email match if no phone match
  if (!existingId && email) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone, user_id")
      .eq("email", email)
      .maybeSingle();
    if (data) { existingId = data.id; existingRecord = data; }
  }

  // 3. Found existing — update with any new info
  if (existingId && existingRecord) {
    const updates: Record<string, any> = {};
    if (name && name !== existingRecord.name) updates.name = name;
    if (email && !existingRecord.email) updates.email = email;
    if (cleanPhone && !existingRecord.phone) updates.phone = cleanPhone;
    if (userId && !existingRecord.user_id) updates.user_id = userId;

    if (Object.keys(updates).length > 0) {
      await supabase.from("clients").update(updates).eq("id", existingId);
    }
    return existingId;
  }

  // 4. No match — create new client
  const { data: newClient } = await supabase
    .from("clients")
    .insert({
      name,
      phone: cleanPhone || null,
      email: email || null,
      user_id: userId || null,
    })
    .select("id")
    .single();

  return newClient?.id ?? null;
}
