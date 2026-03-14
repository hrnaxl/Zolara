import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF";

export function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      // Show after 3 seconds if not dismissed before
      const dismissed = sessionStorage.getItem("pwa-prompt-dismissed");
      if (!dismissed) setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler as any);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as any);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
  };

  if (!show || installed) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, maxWidth: 360, width: "calc(100% - 32px)",
      background: "#0F1E35", borderRadius: 16, padding: "16px 20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", gap: 14,
      animation: "slideUp 0.3s ease",
    }}>
      <style>{`
        @keyframes slideUp { from { transform: translateX(-50%) translateY(80px); opacity:0; } to { transform: translateX(-50%) translateY(0); opacity:1; } }
      `}</style>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${G},${G_D})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Smartphone size={22} color={WHITE} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: WHITE, margin: "0 0 2px", fontFamily: "Montserrat,sans-serif" }}>Install Zolara App</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0, fontFamily: "Montserrat,sans-serif" }}>Add to your home screen for quick access</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={handleInstall} style={{ padding: "8px 14px", borderRadius: 10, background: `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "Montserrat,sans-serif" }}>
          <Download size={13} /> Install
        </button>
        <button onClick={dismiss} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
