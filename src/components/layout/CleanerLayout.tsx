import { useEffect, useState } from "react";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { format } from "date-fns";
import { toast } from "sonner";

const G = "#C8A97E", G_DARK = "#8B6914", DARK = "#1C160E";
const CREAM = "#FAFAF8", WHITE = "#FFFFFF", BORDER = "#EDE8E0";
const TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";
const GREEN = "#22C55E", GREEN_BG = "#F0FDF4";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const MORNING_TASKS = [
  "Sweep and mop all floor areas",
  "Wipe down all service chairs and headrests",
  "Clean all mirrors — no smudges or water marks",
  "Sanitise the reception desk surface",
  "Empty all rubbish bins and replace liners",
  "Clean the bathroom: toilet, sink, mirrors, floor",
  "Restock soap and tissue in bathroom",
  "Lay out fresh towels at all stations",
  "Wipe down the front entrance inside and out",
  "Check that bottled water is stocked (min 20 bottles)",
];

const MIDDAY_TASKS = [
  "Walkthrough of all service areas — clear any mess",
  "Empty bins in service areas if half full",
  "Clean the bathroom (midday check)",
  "Mop any wet or slippery floors immediately",
  "Restock tissue and soap in bathroom",
  "Clear any product spills at styling stations",
];

const EVENING_TASKS = [
  "Sweep and mop all floor areas thoroughly",
  "Wipe down all chairs, headrests, and surfaces",
  "Clean all mirrors",
  "Empty all bins and replace liners",
  "Full bathroom clean",
  "Wipe down reception desk and waiting area",
  "Remove any items left behind by clients",
  "Report any damage or maintenance issues to manager",
];

export default function CleanerLayout() {
  useInactivityLogout(10 * 60 * 1000);
  useSessionGuard();
  const { settings } = useSettings();
  const [staffName, setStaffName] = useState("");
  const [clockedIn, setClockedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);

  // Checklist state — persisted in localStorage keyed by date
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const loadChecks = (prefix: string) => {
    try { return JSON.parse(localStorage.getItem(`zolara_clean_${prefix}_${todayKey}`) || "{}"); } catch { return {}; }
  };
  const [morningChecks, setMorningChecks] = useState<Record<number, boolean>>(loadChecks("morning"));
  const [middayChecks, setMiddayChecks] = useState<Record<number, boolean>>(loadChecks("midday"));
  const [eveningChecks, setEveningChecks] = useState<Record<number, boolean>>(loadChecks("evening"));

  const saveChecks = (prefix: string, val: Record<number, boolean>) => {
    try { localStorage.setItem(`zolara_clean_${prefix}_${todayKey}`, JSON.stringify(val)); } catch {}
  };

  const toggle = (prefix: string, idx: number, setter: any, current: Record<number, boolean>) => {
    const next = { ...current, [idx]: !current[idx] };
    setter(next);
    saveChecks(prefix, next);
    if (!current[idx]) toast.success("Task marked complete");
  };

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await (supabase as any).from("staff").select("id, name").eq("user_id", user.id).maybeSingle();
    if (profile) { setStaffName(profile.name); setStaffId(profile.id); }
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const { data: att } = await (supabase as any).from("attendance").select("check_in, check_out")
      .eq("staff_id", profile?.id).eq("date", todayStr).maybeSingle();
    if (att) { setClockedIn(!att.check_out); setCheckInTime(att.check_in); }
  };

  const dayLabel = format(new Date(), "EEEE, MMMM d, yyyy");
  const hour = new Date().getHours();
  const isMorning = hour < 12;
  const isMidDay = hour >= 11 && hour < 15;
  const isEvening = hour >= 14;

  const ChecklistSection = ({ title, tasks, checks, prefix, setter }: any) => {
    const done = tasks.filter((_: any, i: number) => checks[i]).length;
    const pct = Math.round((done / tasks.length) * 100);
    return (
      <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: "24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_SOFT, marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 13, color: TXT_MID }}>{done} of {tasks.length} complete</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: pct === 100 ? GREEN : DARK }}>{pct}%</div>
          </div>
        </div>
        <div style={{ height: 6, background: "#F0ECE4", borderRadius: 4, marginBottom: 18, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? GREEN : `linear-gradient(90deg,${G_DARK},${G})`, borderRadius: 4, transition: "width 0.3s ease" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((task: string, i: number) => (
            <button key={i} onClick={() => toggle(prefix, i, setter, checks)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: `1px solid ${checks[i] ? "rgba(34,197,94,0.3)" : BORDER}`, background: checks[i] ? GREEN_BG : CREAM, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checks[i] ? GREEN : "#C8BFB4"}`, background: checks[i] ? GREEN : WHITE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                {checks[i] && <span style={{ color: WHITE, fontSize: 13, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: checks[i] ? GREEN : DARK, fontWeight: checks[i] ? 600 : 400, textDecoration: checks[i] ? "line-through" : "none", flex: 1, textDecorationColor: "rgba(34,197,94,0.5)" }}>{task}</span>
            </button>
          ))}
        </div>
        {pct === 100 && (
          <div style={{ marginTop: 16, padding: "10px 16px", background: GREEN_BG, border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, color: GREEN, textAlign: "center" }}>
            ✓ Section complete — great work!
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(20px,4vw,40px) clamp(16px,4vw,32px)", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: 4 }}>{dayLabel}</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: DARK, margin: 0 }}>
            {greeting()}{staffName ? `, ${staffName.split(" ")[0]}` : ""}
          </h1>
          <p style={{ fontSize: 13, color: TXT_MID, marginTop: 4 }}>Zolara Cleaning Checklist · {todayKey}</p>
        </div>

        {/* Status row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: "20px 22px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_SOFT, marginBottom: 8 }}>ATTENDANCE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: clockedIn ? GREEN : "#EF4444" }} />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: DARK }}>{clockedIn ? "Clocked In" : "Not Clocked In"}</span>
            </div>
            {checkInTime && <p style={{ fontSize: 11, color: TXT_MID, margin: "4px 0 0" }}>Since {format(new Date(checkInTime), "h:mm a")}</p>}
            <a href="/app/cleaner/attendance" style={{ display: "inline-block", marginTop: 12, fontSize: 11, fontWeight: 700, color: G_DARK, textDecoration: "none", background: "rgba(200,169,126,0.1)", padding: "5px 14px", borderRadius: 20, border: "1px solid rgba(200,169,126,0.3)" }}>
              {clockedIn ? "Clock Out →" : "Clock In →"}
            </a>
          </div>
          <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: "20px 22px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_SOFT, marginBottom: 8 }}>TODAY'S PROGRESS</div>
            {[["Morning", MORNING_TASKS, morningChecks], ["Midday", MIDDAY_TASKS, middayChecks], ["Evening", EVENING_TASKS, eveningChecks]].map(([label, tasks, checks]: any) => {
              const done = tasks.filter((_: any, i: number) => checks[i]).length;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: TXT_MID }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: done === tasks.length ? GREEN : DARK }}>{done}/{tasks.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Checklists — show relevant ones based on time */}
        {isMorning && <ChecklistSection title="MORNING DUTIES — Complete before 8:15 AM" tasks={MORNING_TASKS} checks={morningChecks} prefix="morning" setter={setMorningChecks} />}
        {isMidDay && <ChecklistSection title="MIDDAY DUTIES — Check at 12:00 PM" tasks={MIDDAY_TASKS} checks={middayChecks} prefix="midday" setter={setMiddayChecks} />}
        {isEvening && <ChecklistSection title="EVENING CLOSING DUTIES — Complete before 8:00 PM" tasks={EVENING_TASKS} checks={eveningChecks} prefix="evening" setter={setEveningChecks} />}

        {/* Show all if none match (edge case) */}
        {!isMorning && !isMidDay && !isEvening && (
          <>
            <ChecklistSection title="MORNING DUTIES" tasks={MORNING_TASKS} checks={morningChecks} prefix="morning" setter={setMorningChecks} />
            <ChecklistSection title="MIDDAY DUTIES" tasks={MIDDAY_TASKS} checks={middayChecks} prefix="midday" setter={setMiddayChecks} />
            <ChecklistSection title="EVENING DUTIES" tasks={EVENING_TASKS} checks={eveningChecks} prefix="evening" setter={setEveningChecks} />
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: TXT_SOFT, marginTop: 24 }}>Zolara Beauty Studio · Sakasaka, Opposite CalBank, Tamale</p>
      </div>
    </div>
  );
}
