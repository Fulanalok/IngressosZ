import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthProvider";
import { HelmetProvider } from "@dr.pogodin/react-helmet";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Strip potentially sensitive fields before sending to Sentry
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>;
      delete h["authorization"];
      delete h["cookie"];
    }
    return event;
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
