import posthog from "posthog-js";

export function initPostHog() {
  if (!import.meta.env.PROD) return; // only in production

  posthog.init("phc_PsTCHWlNT6Unz5enYXiEzS34DuIsEdcvoOQpvHrqFRN", {
    api_host: "https://us.i.posthog.com",
    capture_pageview: true,         // auto page views
    capture_pageleave: true,        // how long on each page
    autocapture: false,             // manual events only — less noise
    persistence: "localStorage",
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing(); // never track dev
    },
  });
}

// Tag events with the logged-in user's role
export function identifyUser(userId: string, role: string, name?: string) {
  posthog.identify(userId, { role, name: name || "" });
}

// Clear on logout
export function resetPostHog() {
  posthog.reset();
}

// Track key business events
export function track(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}
