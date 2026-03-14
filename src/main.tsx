import { createRoot } from "react-dom/client";

// ── PWA Safe Area: read actual pixel values and expose as CSS vars ──
// This works reliably on iOS Safari and all PWA modes
function applySafeAreaVars() {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed", "top:0", "left:0", "right:0", "bottom:0",
    "pointer-events:none", "visibility:hidden",
    "padding-top:env(safe-area-inset-top,0px)",
    "padding-bottom:env(safe-area-inset-bottom,0px)",
    "padding-left:env(safe-area-inset-left,0px)",
    "padding-right:env(safe-area-inset-right,0px)",
  ].join(";");
  document.documentElement.appendChild(el);
  const s = getComputedStyle(el);
  const top    = s.paddingTop;
  const bottom = s.paddingBottom;
  const left   = s.paddingLeft;
  const right  = s.paddingRight;
  document.documentElement.removeChild(el);
  const r = document.documentElement.style;
  r.setProperty("--sat", top);
  r.setProperty("--sab", bottom);
  r.setProperty("--sal", left);
  r.setProperty("--sar", right);
}
applySafeAreaVars();
// Re-apply on orientation change
window.addEventListener("orientationchange", () => setTimeout(applySafeAreaVars, 200));
window.addEventListener("resize", applySafeAreaVars);
import App from "./App.tsx";
import "./index.css";
import { SettingsProvider } from "./context/SettingsContext.tsx";

createRoot(document.getElementById("root")!).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>
);
