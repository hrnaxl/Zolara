import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Phone, Mail, Cake, Save } from "lucide-react";

const G      = "#C8A97E";
const G_DARK = "#8B6914";
const TXT    = "#1C160E";
const TXT_M  = "#78716C";
const TXT_S  = "#A8A29E";
const CREAM  = "#FAFAF8";
const WHITE  = "#FFFFFF";
const BORDER = "#EDE8E0";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const inp: React.CSSProperties = {
  width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 14, color: TXT, outline: "none",
  background: WHITE, fontFamily: "Montserrat, sans-serif",
};
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: TXT_S,
  textTransform: "uppercase", display: "block", marginBottom: 6,
};

export default function ClientProfile() {
  const { client, setClient } = useOutletContext<any>();

  const [form, setForm] = useState({
    name:          client?.name          || "",
    phone:         client?.phone         || "",
    email:         client?.email         || "",
    birthday: client?.birthday || "",
  });
  const [saving, setSaving]         = useState(false);
}