import { supabase } from "@/integrations/supabase/client";

export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/\s/g, "").replace(/-/g, "");
  if (!stripped) return null;
  if (stripped.startsWith("+233")) return stripped;
  if (stripped.startsWith("233"))  return "+" + stripped;
  if (stripped.startsWith("0"))    return "+233" + stripped.slice(1);
  return stripped;
}

function phoneForms(raw?: string | null): string[] {
  const canonical = normalizePhone(raw);
  if (!canonical) return [];
  const forms = new Set<string>([canonical]);
  if (canonical.startsWith("+233")) {
    forms.add("0" + canonical.slice(4));
    forms.add("233" + canonical.slice(4));
  }
  return [...forms];
}

/**
 * Append a value to a comma-separated aliases string, deduplicating case-insensitively.
 */
function addAlias(existing: string | null, value: string): string | null {
  if (!value?.trim()) return existing;
  const v = value.trim();
  const parts = existing ? existing.split(",").map(s => s.trim()) : [];
  const lower = parts.map(p => p.toLowerCase());
  if (lower.includes(v.toLowerCase())) return existing; // already there
  return [...parts, v].join(", ");
}

/**
 * Parse alias section from notes. Notes format:
 *   [user-written notes]
 *   --- Aliases ---
 *   Other names: Alice, Alicia
 *   Other emails: alice@a.com, ali@b.com
 */
function parseAliases(notes: string | null): { baseNotes: string; otherNames: string | null; otherEmails: string | null } {
  if (!notes) return { baseNotes: "", otherNames: null, otherEmails: null };
  const divider = "\n--- Aliases ---";
  const idx = notes.indexOf(divider);
  if (idx === -1) return { baseNotes: notes, otherNames: null, otherEmails: null };

  const baseNotes = notes.slice(0, idx).trim();
  const aliasSection = notes.slice(idx + divider.length);
  const nameMatch  = aliasSection.match(/Other names?: ([^\n]+)/i);
  const emailMatch = aliasSection.match(/Other emails?: ([^\n]+)/i);
  return {
    baseNotes,
    otherNames:  nameMatch  ? nameMatch[1].trim()  : null,
    otherEmails: emailMatch ? emailMatch[1].trim() : null,
  };
}

function buildNotes(baseNotes: string, otherNames: string | null, otherEmails: string | null): string {
  let result = baseNotes || "";
  if (otherNames || otherEmails) {
    result = result.trim();
    result += "\n--- Aliases ---";
    if (otherNames)  result += `\nOther names: ${otherNames}`;
    if (otherEmails) result += `\nOther emails: ${otherEmails}`;
  }
  return result.trim();
}

/**
 * Find or create a client. Phone is the primary key.
 *
 * Match priority:
 *   1. Phone match (all Ghanaian formats: +233, 0, 233)
 *   2. Email match (case-insensitive)
 *   3. Create new
 *
 * On match with a different name or email:
 *   - Keep the primary name/email unchanged (first booking wins)
 *   - Store the alternate name/email as aliases in the notes field
 *   - This prevents fake duplication while preserving the booking info
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

  if (!name?.trim()) return null;

  let existingId: string | null = null;
  let existingRecord: any = null;

  // 1. Phone match
  if (canonical) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone, notes, user_id")
      .in("phone", phoneForms(params.phone))
      .limit(1)
      .maybeSingle();
    if (data) { existingId = data.id; existingRecord = data; }
  }

  // 2. Email match if no phone match
  if (!existingId && email) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone, notes, user_id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (data) { existingId = data.id; existingRecord = data; }
  }

  // 3. Found — update fields and store aliases
  if (existingId && existingRecord) {
    const updates: Record<string, any> = {};

    // Always normalise stored phone to canonical
    if (canonical && existingRecord.phone !== canonical) updates.phone = canonical;

    // Fill missing email
    if (email && !existingRecord.email) updates.email = email;

    // Link user if not yet linked
    if (userId && !existingRecord.user_id) updates.user_id = userId;

    // Handle name alias — if different name booked with same phone/email
    const { baseNotes, otherNames, otherEmails } = parseAliases(existingRecord.notes);
    let newOtherNames  = otherNames;
    let newOtherEmails = otherEmails;
    let notesChanged   = false;

    if (name.trim().toLowerCase() !== existingRecord.name?.toLowerCase()) {
      const updated = addAlias(newOtherNames, name.trim());
      if (updated !== newOtherNames) { newOtherNames = updated; notesChanged = true; }
    }

    // Handle email alias — if different email booked with same phone
    if (email && existingRecord.email && email !== existingRecord.email.toLowerCase()) {
      const updated = addAlias(newOtherEmails, email);
      if (updated !== newOtherEmails) { newOtherEmails = updated; notesChanged = true; }
    }

    if (notesChanged) {
      updates.notes = buildNotes(baseNotes, newOtherNames, newOtherEmails);
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("clients").update(updates).eq("id", existingId);
    }

    return existingId;
  }

  // 4. No match — create new
  const { data: newClient } = await supabase
    .from("clients")
    .insert({ name: name.trim(), phone: canonical || null, email: email || null, user_id: userId || null })
    .select("id")
    .single();

  return newClient?.id ?? null;
}
