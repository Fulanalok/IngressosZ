import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import Navbar from "@/components/layout/Navbar";
import { ThemeProvider } from "@/context/theme/ThemeContext";
import { AppRoutes } from "@/routing/AppRoutes";
import { GlobalErrorListeners } from "@/routing/GlobalErrorListeners";
import { ScrollAndFocus } from "@/routing/ScrollAndFocus";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";

const DevPanel = import.meta.env.DEV
  ? lazy(() => import("@/components/dev/DevPanel"))
  : null;

function App() {
  return (
    <ThemeProvider>
      <Toaster richColors position="top-right" closeButton />
      <BrowserRouter>
        <header>
          <Navbar />
        </header>

        <main id="main-content" tabIndex={-1}>
          <ScrollAndFocus />
          <GlobalErrorListeners />
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-primary" />
              </div>
            }
          >
            <QueryErrorResetBoundary>
              {({ reset }) => (
                <AppErrorBoundary onReset={reset}>
                  <AppRoutes />
                </AppErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </Suspense>
        </main>

        {import.meta.env.DEV && DevPanel && <DevPanel />}

        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="aria-live-region"
        />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
