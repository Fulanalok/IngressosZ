import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
function Navbar() {
    const { userProfile, logout } = useAuth();
    const location = useLocation();
    const isActive = (path) => location.pathname.startsWith(path);
    const handleLogout = async () => {
        try {
            await logout();
        }
        catch (e) {
            console.error("Erro ao deslogar", e);
        }
    };
    return (_jsx("nav", { className: "nav-bg", children: _jsx("div", { className: "page-container", children: _jsxs("div", { className: "flex justify-between items-center h-16", children: [_jsxs(Link, { to: "/", className: "flex items-center text-foreground hover:text-primary transition-colors", children: [_jsx("span", { className: "text-2xl mr-2", children: "\uD83C\uDFAB" }), _jsx("span", { className: "text-xl font-bold", children: "IngressosZ" })] }), _jsxs("div", { className: "hidden md:flex items-center space-x-6", children: [_jsx(Link, { to: "/", className: `nav-link ${isActive("/") && location.pathname === "/"
                                    ? "text-foreground"
                                    : ""}`, children: "In\u00EDcio" }), _jsx(Link, { to: "/eventos", className: `nav-link ${isActive("/eventos") ? "text-foreground" : ""}`, children: "Eventos" }), _jsx(Link, { to: "/meus-ingressos", className: `nav-link ${isActive("/meus-ingressos") ? "text-foreground" : ""}`, children: "Meus ingressos" }), _jsx(Link, { to: "/perfil", className: `nav-link ${isActive("/perfil") ? "text-foreground" : ""}`, children: "Perfil" }), userProfile?.role === "organizer" && (_jsx(Link, { to: "/admin", className: `nav-link ${isActive("/admin") ? "text-foreground" : ""}`, children: "Painel Admin" })), userProfile?.role === "validator" && (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/validador", className: `nav-link ${isActive("/validador") ? "text-foreground" : ""}`, children: "Validador" }), _jsx(Link, { to: "/teste-qr", className: `nav-link ${isActive("/teste-qr") ? "text-foreground" : ""}`, children: "Teste QR" })] })), _jsx(Link, { to: "/doc", className: `nav-link ${isActive("/doc") ? "text-foreground" : ""}`, children: "Docs" })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(ThemeToggle, {}), userProfile && (_jsxs(_Fragment, { children: [_jsxs("span", { className: "hidden sm:block text-sm text-muted-foreground", children: ["Ol\u00E1, ", userProfile.displayName || userProfile.email] }), _jsx(Button, { variant: "destructive", size: "sm", onClick: handleLogout, children: "Sair" })] }))] })] }) }) }));
}
export default Navbar;
