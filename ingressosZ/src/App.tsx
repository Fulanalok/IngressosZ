import { QueryErrorResetBoundary } from "@tanstack/react-query";
import React, { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import DevPanel from "@/components/DevPanel";
import FirebaseDebug from "@/components/FirebaseDebug";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { postClientError } from "@/services/logger";

const EventDetailPage = lazy(() =>
  import("@/pages/EventDetailPage").then((module) => ({ default: module.default }))
);
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const Login = lazy(() => import("@/pages/Login"));
const MyTicketsPage = lazy(() => import("@/pages/MyTicketsPage"));
const DevAutoPage = lazy(() => import("@/pages/DevAutoPage"));
const PaymentCanceled = lazy(() => import("@/pages/PaymentCanceled"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const QRTestPage = lazy(() => import("@/pages/QRTestPage"));
const SignUp = lazy(() => import("@/pages/SignUp"));
const ValidatorPage = lazy(() => import("@/pages/ValidatorPage"));
const DocViewPage = lazy(() => import("@/pages/DocView"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"));

function App() {
  function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const location = useLocation();
    if (!user)
      return <Navigate to="/login" state={{ from: location }} replace />;
    return <>{children}</>;
  }
  function ScrollAndFocus() {
    const location = useLocation();
    useEffect(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const el = document.getElementById("main-content");
      if (el) el.focus();
    }, [location]);
    return null;
  }
  function RequireRole({
    role,
    children,
  }: {
    role: string | string[];
    children: React.ReactNode;
  }) {
    const { userProfile } = useAuth();
    const allowedRoles = Array.isArray(role)
      ? role.map((r) => r.toLowerCase())
      : [role.toLowerCase()];
    const userRole = String(userProfile?.role || "").toLowerCase();
    const hasRole = allowedRoles.includes(userRole);

    if (!hasRole) {
      // Em desenvolvimento, mostramos uma mensagem explicativa em vez de redirecionar silenciosamente
      if (import.meta.env.DEV) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <h2 className="text-xl font-bold mb-2">
              Acesso Restrito (DEV Mode)
            </h2>
            <p className="text-muted-foreground mb-4">
              Esta rota exige um dos seguintes papéis:{" "}
              <code className="bg-muted px-1 rounded">
                {allowedRoles.join(", ")}
              </code>
            </p>
            <p className="mb-6">
              Seu papel atual é:{" "}
              <code className="bg-muted px-1 rounded">
                {userRole || "nenhum (user)"}
              </code>
            </p>
            <div className="flex gap-4">
              <Button asChild variant="outline">
                <Link to="/">Voltar para Início</Link>
              </Button>
            </div>
          </div>
        );
      }
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }
  function NotFound() {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🧭</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground mb-6">
            Verifique o endereço ou volte para a página inicial.
          </p>
          <Button asChild>
            <Link to="/">Voltar para início</Link>
          </Button>
        </div>
      </div>
    );
  }
  class ErrorBoundary extends React.Component<
    { onReset: () => void; children: React.ReactNode },
    { hasError: boolean }
  > {
    constructor(props: { onReset: () => void; children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
      return { hasError: true };
    }
    componentDidCatch(error: unknown, info: unknown) {
      const payload = {
        type: "render-error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        info,
        route: window.location.pathname,
        ua: navigator.userAgent,
        ts: Date.now(),
      };
      void postClientError(payload);
    }
    reset = () => {
      this.setState({ hasError: false });
      this.props.onReset();
    };
    render() {
      if (this.state.hasError) {
        return (
          <div className="min-h-screen gradient-bg flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Algo deu errado
              </h2>
              <p className="text-muted-foreground mb-6">
                Tente novamente. Se persistir, volte para a página inicial.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={this.reset}>Tentar novamente</Button>
                <Button variant="secondary" asChild>
                  <Link to="/">Início</Link>
                </Button>
              </div>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }

  return (
    <ThemeProvider>
      <Toaster richColors position="top-right" closeButton />
      <BrowserRouter>
        {/* Skip link acessível para teclado */}
        <a
          href="#main-content"
          className="fixed left-4 top-4 -translate-y-full focus:translate-y-0 bg-primary text-primary-foreground px-3 py-2 z-50"
        >
          Pular para o conteúdo
        </a>

        <header>
          <Navbar />
        </header>

        <main id="main-content" tabIndex={-1}>
          <ScrollAndFocus />
          {(() => {
            function GlobalErrorListeners() {
              useEffect(() => {
                const onError = (e: ErrorEvent) => {
                  const payload = {
                    type: "window-error",
                    message: e.message,
                    stack: e.error?.stack,
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno,
                    route: window.location.pathname,
                    ua: navigator.userAgent,
                    ts: Date.now(),
                  };
                  void postClientError(payload);
                };
                const onRejection = (e: PromiseRejectionEvent) => {
                  const payload = {
                    type: "unhandled-rejection",
                    reason:
                      e.reason instanceof Error
                        ? e.reason.message
                        : String(e.reason),
                    stack:
                      e.reason instanceof Error ? e.reason.stack : undefined,
                    route: window.location.pathname,
                    ua: navigator.userAgent,
                    ts: Date.now(),
                  };
                  void postClientError(payload);
                };
                window.addEventListener("error", onError);
                window.addEventListener("unhandledrejection", onRejection);
                return () => {
                  window.removeEventListener("error", onError);
                  window.removeEventListener("unhandledrejection", onRejection);
                };
              }, []);
              return null;
            }
            return <GlobalErrorListeners />;
          })()}
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-primary"></div>
              </div>
            }
          >
            <QueryErrorResetBoundary>
              {({ reset }) => (
                <ErrorBoundary onReset={reset}>
                  <Routes>
                    {}
                    <Route path="/login" element={<Login />} />
                    <Route path="/cadastro" element={<SignUp />} />

                    {}
                    {/* Rota dev para auto-setup (sem exigir login) */}
                    <Route path="/dev-auto" element={<DevAutoPage />} />

                    {/* Rota de Debug para verificar configuração Firebase (sem exigir login) */}
                    <Route path="/debug/firebase" element={<FirebaseDebug />} />
                    <Route path="/doc" element={<DocViewPage />} />

                    <Route
                      path="/"
                      element={
                        <RequireAuth>
                          <HomePage />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/eventos"
                      element={
                        <RequireAuth>
                          <EventsPage />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/evento/:eventId"
                      element={
                        <RequireAuth>
                          <EventDetailPage />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/meus-ingressos"
                      element={
                        <RequireAuth>
                          <MyTicketsPage />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/perfil"
                      element={
                        <RequireAuth>
                          <ProfilePage />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/validador"
                      element={
                        <RequireAuth>
                          <RequireRole
                            role={["validator", "organizer", "admin"]}
                          >
                            <ValidatorPage />
                          </RequireRole>
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/teste-qr"
                      element={
                        <RequireAuth>
                          <RequireRole role="validator">
                            <QRTestPage />
                          </RequireRole>
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <RequireAuth>
                          <RequireRole role="organizer">
                            <AdminPage />
                          </RequireRole>
                        </RequireAuth>
                      }
                    />

                    {/* Rotas de pagamento */}
                    <Route
                      path="/pagamento/sucesso"
                      element={
                        <RequireAuth>
                          <PaymentSuccess />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/pagamento/sucesso/:sessionId"
                      element={
                        <RequireAuth>
                          <PaymentSuccess />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/pagamento/cancelado"
                      element={
                        <RequireAuth>
                          <PaymentCanceled />
                        </RequireAuth>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </Suspense>
        </main>
        {/* DevPanel precisa estar dentro do Router para useNavigate */}
        <DevPanel />

        {/* Região de anúncio para mensagens não críticas */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="aria-live-region"
        ></div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
export default App;
