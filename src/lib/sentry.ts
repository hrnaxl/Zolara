import * as Sentry from "@sentry/react";

export function initSentry() {
  Sentry.init({
    dsn: "https://98dec9e1ee77087131745266f1d3aaff@o4511098796244992.ingest.de.sentry.io/4511098803781712",
    environment: import.meta.env.MODE, // "production" or "development"
    // Only run in production — no noise from local dev
    enabled: import.meta.env.PROD,
    // Capture 100% of errors
    sampleRate: 1.0,
    // Capture 10% of performance traces (free tier friendly)
    tracesSampleRate: 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Ignore known non-actionable errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "Network request failed",
      "Failed to fetch",
      "Load failed",
    ],
    beforeSend(event) {
      // Strip any sensitive data before sending
      if (event.request?.cookies) delete event.request.cookies;
      return event;
    },
  });
}

// Call this after login to tag errors with the user's role
export function setSentryUser(userId: string, role: string, name?: string) {
  Sentry.setUser({ id: userId, username: name || userId, role });
}

// Clear user on logout
export function clearSentryUser() {
  Sentry.setUser(null);
}

export { Sentry };
