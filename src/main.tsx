import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SettingsProvider } from "./context/SettingsContext.tsx";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";

// Initialise Sentry before anything renders
initSentry();
initPostHog();

createRoot(document.getElementById("root")!).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>
);
