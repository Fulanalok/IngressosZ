import DevPanel from "@/components/dev/DevPanel";
import FirebaseDebug from "@/components/dev/FirebaseDebug";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/context/theme/ThemeContext";
import { useAuth } from "@/hooks/auth/useAuth";
import { logger } from "@/services/logger";
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

const EventDetailPage = lazy(() =>
  import("@/pages/event/EventDetailPage").then((module) => ({
    default: module.default,
  }))
);
const EventsPage = lazy(() => import("@/pages/event/EventsPage"));
const HomePage = lazy(() => import("@/pages/event/HomePage"));
const Login = lazy(() => import("@/pages/auth/Login"));
const MyTicketsPage = lazy(() => import("@/pages/event/MyTicketsPage"));
const DevAutoPage = lazy(() => import("@/pages/dev/DevAutoPage"));
const PaymentCanceled = lazy(() => import("@/pages/checkout/PaymentCanceled"));
const PaymentSuccess = lazy(() => import("@/pages/checkout/PaymentSuccess"));
const QRTestPage = lazy(() => import("@/pages/dev/QRTestPage"));
const SignUp = lazy(() => import("@/pages/auth/SignUp"));
const ValidatorPage = lazy(() => import("@/pages/validator/ValidatorPage"));
const DocViewPage = lazy(() => import("@/pages/dev/DocView"));
const ProfilePage = lazy(() => import("@/pages/auth/ProfilePage"));
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"));
const TermsPage = lazy(() => import("@/pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/legal/PrivacyPage"));

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
      logger.error("Render Error", error, {
        type: "render-error",
        info,
      });
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
        <header>
          <Navbar />
        </header>

        <main id="main-content" tabIndex={-1}>
          <ScrollAndFocus />
          {(() => {
            function GlobalErrorListeners() {
              useEffect(() => {
                const onError = (e: ErrorEvent) => {
                  logger.error("Window Error", e.error, {
                    type: "window-error",
                    message: e.message,
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno,
                  });
                };
                const onRejection = (e: PromiseRejectionEvent) => {
                  logger.error("Unhandled Rejection", e.reason, {
                    type: "unhandled-rejection",
                  });
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

                    {/* Rotas de debug — apenas em desenvolvimento */}
                    {import.meta.env.DEV && (
                      <>
                        <Route path="/debug/firebase" element={<FirebaseDebug />} />
                        <Route path="/doc" element={<DocViewPage />} />
                      </>
                    )}

                    <Route path="/termos" element={<TermsPage />} />
                    <Route path="/privacidade" element={<PrivacyPage />} />

                    <Route path="/" element={<HomePage />} />
                    <Route path="/eventos" element={<EventsPage />} />
                    <Route
                      path="/evento/:eventId"
                      element={<EventDetailPage />}
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
                      element={<PaymentSuccess />}
                    />
                    <Route
                      path="/pagamento/sucesso/:sessionId"
                      element={<PaymentSuccess />}
                    />
                    <Route
                      path="/pagamento/cancelado"
                      element={<PaymentCanceled />}
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </Suspense>
        </main>
        {/* DevPanel precisa estar dentro do Router para useNavigate */}
        {import.meta.env.DEV && <DevPanel />}

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
