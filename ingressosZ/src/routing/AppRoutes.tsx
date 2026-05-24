import { Button } from "@/components/ui/button";
import { ADMIN_PANEL_ROLES, VALIDATOR_ROLES } from "@/constants/roles";
import { lazy } from "react";
import { Link, Route, Routes } from "react-router";
import { RequireAuth } from "./RequireAuth";
import { RequireRole } from "./RequireRole";

const EventDetailPage = lazy(() =>
  import("@/pages/event/EventDetailPage").then((module) => ({
    default: module.default,
  }))
);
const EventsPage = lazy(() => import("@/pages/event/EventsPage"));
const HomePage = lazy(() => import("@/pages/event/HomePage"));
const Login = lazy(() => import("@/pages/auth/Login"));
const MyTicketsPage = lazy(() => import("@/pages/event/MyTicketsPage"));
const PaymentCanceled = lazy(() => import("@/pages/checkout/PaymentCanceled"));
const PaymentSuccess = lazy(() => import("@/pages/checkout/PaymentSuccess"));
const QRTestPage = import.meta.env.DEV
  ? lazy(() => import("@/pages/dev/QRTestPage"))
  : null;
const SignUp = lazy(() => import("@/pages/auth/SignUp"));
const ValidatorPage = lazy(() => import("@/pages/validator/ValidatorPage"));
const ProfilePage = lazy(() => import("@/pages/auth/ProfilePage"));
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"));
const TermsPage = lazy(() => import("@/pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/legal/PrivacyPage"));
const DevAutoPage = import.meta.env.DEV
  ? lazy(() => import("@/pages/dev/DevAutoPage"))
  : null;
const FirebaseDebug = import.meta.env.DEV
  ? lazy(() => import("@/components/dev/FirebaseDebug"))
  : null;
const DocViewPage = import.meta.env.DEV
  ? lazy(() => import("@/pages/dev/DocView"))
  : null;

function NotFound() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Pagina nao encontrada
        </h2>
        <p className="text-muted-foreground mb-6">
          Verifique o endereco ou volte para a pagina inicial.
        </p>
        <Button asChild>
          <Link to="/">Voltar para inicio</Link>
        </Button>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<SignUp />} />

      {import.meta.env.DEV && DevAutoPage && FirebaseDebug && DocViewPage && (
        <>
          <Route path="/dev-auto" element={<DevAutoPage />} />
          <Route path="/debug/firebase" element={<FirebaseDebug />} />
          <Route path="/doc" element={<DocViewPage />} />
        </>
      )}

      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />

      <Route path="/" element={<HomePage />} />
      <Route path="/eventos" element={<EventsPage />} />
      <Route path="/evento/:eventId" element={<EventDetailPage />} />
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
            <RequireRole role={VALIDATOR_ROLES}>
              <ValidatorPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      {import.meta.env.DEV && QRTestPage && (
        <Route
          path="/teste-qr"
          element={
            <RequireAuth>
              <RequireRole role={VALIDATOR_ROLES}>
                <QRTestPage />
              </RequireRole>
            </RequireAuth>
          }
        />
      )}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole role={ADMIN_PANEL_ROLES}>
              <AdminPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route path="/pagamento/sucesso" element={<PaymentSuccess />} />
      <Route path="/pagamento/sucesso/:sessionId" element={<PaymentSuccess />} />
      <Route path="/pagamento/cancelado" element={<PaymentCanceled />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
