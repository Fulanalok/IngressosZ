import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import DevPanel from "@/components/DevPanel";
import FirebaseDebug from "@/components/FirebaseDebug";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/services/logger";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, } from "react-router-dom";
import { Toaster } from "sonner";
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage").then((module) => ({
    default: module.default,
})));
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
    function RequireAuth({ children }) {
        const { user } = useAuth();
        const location = useLocation();
        if (!user)
            return _jsx(Navigate, { to: "/login", state: { from: location }, replace: true });
        return _jsx(_Fragment, { children: children });
    }
    function ScrollAndFocus() {
        const location = useLocation();
        useEffect(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            const el = document.getElementById("main-content");
            if (el)
                el.focus();
        }, [location]);
        return null;
    }
    function RequireRole({ role, children, }) {
        const { userProfile } = useAuth();
        const allowedRoles = Array.isArray(role)
            ? role.map((r) => r.toLowerCase())
            : [role.toLowerCase()];
        const userRole = String(userProfile?.role || "").toLowerCase();
        const hasRole = allowedRoles.includes(userRole);
        if (!hasRole) {
            // Em desenvolvimento, mostramos uma mensagem explicativa em vez de redirecionar silenciosamente
            if (import.meta.env.DEV) {
                return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center p-4 text-center", children: [_jsx("h2", { className: "text-xl font-bold mb-2", children: "Acesso Restrito (DEV Mode)" }), _jsxs("p", { className: "text-muted-foreground mb-4", children: ["Esta rota exige um dos seguintes pap\u00E9is:", " ", _jsx("code", { className: "bg-muted px-1 rounded", children: allowedRoles.join(", ") })] }), _jsxs("p", { className: "mb-6", children: ["Seu papel atual \u00E9:", " ", _jsx("code", { className: "bg-muted px-1 rounded", children: userRole || "nenhum (user)" })] }), _jsx("div", { className: "flex gap-4", children: _jsx(Button, { asChild: true, variant: "outline", children: _jsx(Link, { to: "/", children: "Voltar para In\u00EDcio" }) }) })] }));
            }
            return _jsx(Navigate, { to: "/", replace: true });
        }
        return _jsx(_Fragment, { children: children });
    }
    function NotFound() {
        return (_jsx("div", { className: "min-h-screen gradient-bg flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-2xl font-bold text-foreground mb-2", children: "P\u00E1gina n\u00E3o encontrada" }), _jsx("p", { className: "text-muted-foreground mb-6", children: "Verifique o endere\u00E7o ou volte para a p\u00E1gina inicial." }), _jsx(Button, { asChild: true, children: _jsx(Link, { to: "/", children: "Voltar para in\u00EDcio" }) })] }) }));
    }
    class ErrorBoundary extends React.Component {
        constructor(props) {
            super(props);
            Object.defineProperty(this, "reset", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: () => {
                    this.setState({ hasError: false });
                    this.props.onReset();
                }
            });
            this.state = { hasError: false };
        }
        static getDerivedStateFromError() {
            return { hasError: true };
        }
        componentDidCatch(error, info) {
            logger.error("Render Error", error, {
                type: "render-error",
                info,
            });
        }
        render() {
            if (this.state.hasError) {
                return (_jsx("div", { className: "min-h-screen gradient-bg flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-2xl font-bold text-foreground mb-2", children: "Algo deu errado" }), _jsx("p", { className: "text-muted-foreground mb-6", children: "Tente novamente. Se persistir, volte para a p\u00E1gina inicial." }), _jsxs("div", { className: "flex items-center justify-center gap-3", children: [_jsx(Button, { onClick: this.reset, children: "Tentar novamente" }), _jsx(Button, { variant: "secondary", asChild: true, children: _jsx(Link, { to: "/", children: "In\u00EDcio" }) })] })] }) }));
            }
            return this.props.children;
        }
    }
    return (_jsxs(ThemeProvider, { children: [_jsx(Toaster, { richColors: true, position: "top-right", closeButton: true }), _jsxs(BrowserRouter, { children: [_jsx("header", { children: _jsx(Navbar, {}) }), _jsxs("main", { id: "main-content", tabIndex: -1, children: [_jsx(ScrollAndFocus, {}), (() => {
                                function GlobalErrorListeners() {
                                    useEffect(() => {
                                        const onError = (e) => {
                                            logger.error("Window Error", e.error, {
                                                type: "window-error",
                                                message: e.message,
                                                filename: e.filename,
                                                lineno: e.lineno,
                                                colno: e.colno,
                                            });
                                        };
                                        const onRejection = (e) => {
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
                                return _jsx(GlobalErrorListeners, {});
                            })(), _jsx(Suspense, { fallback: _jsx("div", { className: "flex h-screen items-center justify-center", children: _jsx("div", { className: "animate-spin rounded-none h-12 w-12 border-b-2 border-primary" }) }), children: _jsx(QueryErrorResetBoundary, { children: ({ reset }) => (_jsx(ErrorBoundary, { onReset: reset, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/cadastro", element: _jsx(SignUp, {}) }), _jsx(Route, { path: "/dev-auto", element: _jsx(DevAutoPage, {}) }), _jsx(Route, { path: "/debug/firebase", element: _jsx(FirebaseDebug, {}) }), _jsx(Route, { path: "/doc", element: _jsx(DocViewPage, {}) }), _jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/eventos", element: _jsx(EventsPage, {}) }), _jsx(Route, { path: "/evento/:eventId", element: _jsx(EventDetailPage, {}) }), _jsx(Route, { path: "/meus-ingressos", element: _jsx(RequireAuth, { children: _jsx(MyTicketsPage, {}) }) }), _jsx(Route, { path: "/perfil", element: _jsx(RequireAuth, { children: _jsx(ProfilePage, {}) }) }), _jsx(Route, { path: "/validador", element: _jsx(RequireAuth, { children: _jsx(RequireRole, { role: ["validator", "organizer", "admin"], children: _jsx(ValidatorPage, {}) }) }) }), _jsx(Route, { path: "/teste-qr", element: _jsx(RequireAuth, { children: _jsx(RequireRole, { role: "validator", children: _jsx(QRTestPage, {}) }) }) }), _jsx(Route, { path: "/admin", element: _jsx(RequireAuth, { children: _jsx(RequireRole, { role: "organizer", children: _jsx(AdminPage, {}) }) }) }), _jsx(Route, { path: "/pagamento/sucesso", element: _jsx(PaymentSuccess, {}) }), _jsx(Route, { path: "/pagamento/sucesso/:sessionId", element: _jsx(PaymentSuccess, {}) }), _jsx(Route, { path: "/pagamento/cancelado", element: _jsx(PaymentCanceled, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) })) }) })] }), _jsx(DevPanel, {}), _jsx("div", { "aria-live": "polite", "aria-atomic": "true", className: "sr-only", id: "aria-live-region" })] })] }));
}
export default App;
