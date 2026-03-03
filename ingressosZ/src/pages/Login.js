import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { auth } from "../firebaseConfig";
function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading: authLoading } = useAuth();
    const from = location.state?.from
        ?.pathname;
    const handleLogin = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log("Usuário logado com sucesso!");
            navigate(from || "/", { replace: true });
        }
        catch (err) {
            console.error("Erro ao fazer login:", err);
            if (err instanceof FirebaseError) {
                switch (err.code) {
                    case "auth/invalid-credential":
                    case "auth/wrong-password":
                    case "auth/user-not-found":
                    case "auth/invalid-email":
                        setError("E-mail ou senha inválidos.");
                        break;
                    case "auth/too-many-requests":
                        setError("Muitas tentativas de login. Tente novamente mais tarde.");
                        break;
                    case "auth/network-request-failed":
                        setError("Falha de rede ao tentar entrar. Verifique sua conexão e tente novamente.");
                        break;
                    case "auth/configuration-not-found":
                        setError("Erro de configuração do Firebase. Verifique as configurações do projeto.");
                        break;
                    case "auth/api-key-not-valid":
                        setError("Chave de API do Firebase inválida.");
                        break;
                    default:
                        setError("Não foi possível fazer login. Tente novamente em alguns instantes.");
                        toast.error("Erro ao fazer login. Tente novamente.");
                }
            }
            else {
                setError("Ocorreu um erro ao fazer login.");
                toast.error("Ocorreu um erro inesperado.");
            }
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (user && !authLoading) {
            navigate(from || "/", { replace: true });
        }
    }, [authLoading, from, navigate, user]);
    if (user && !authLoading) {
        return null;
    }
    return (_jsx("div", { className: "min-h-screen gradient-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83C\uDFAB" }), _jsx("h2", { className: "text-3xl font-bold text-foreground", children: "Bem-vindo de volta!" }), _jsx("p", { className: "mt-2 text-muted-foreground", children: "Entre na sua conta para acessar seus ingressos" })] }), _jsxs(Card, { className: "mt-8", children: [_jsx(CardContent, { children: _jsxs("form", { onSubmit: handleLogin, className: "space-y-6", "aria-busy": loading, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-foreground mb-2", children: "Email" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, placeholder: "seu@email.com", className: "pl-10", "aria-invalid": !!error, "aria-describedby": error ? "login-error" : undefined }), _jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx("span", { className: "text-muted-foreground", children: "\uD83D\uDCE7" }) })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-foreground mb-2", children: "Senha" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, placeholder: "Sua senha", className: "pl-10", "aria-invalid": !!error, "aria-describedby": error ? "login-error" : undefined }), _jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx("span", { className: "text-muted-foreground", children: "\uD83D\uDD12" }) })] })] }), error && (_jsx("div", { id: "login-error", role: "alert", "aria-live": "assertive", className: "bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-lg p-4", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("span", { className: "text-red-500 dark:text-red-400", children: "\u26A0\uFE0F" }) }), _jsx("div", { className: "ml-3", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-300", children: error }) })] }) })), _jsx(Button, { type: "submit", disabled: loading, className: "w-full", children: loading ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-none h-4 w-4 border-b-2 border-primary-foreground mr-2" }), "Entrando..."] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "mr-2", children: "\uD83D\uDE80" }), "Entrar"] })) })] }) }), _jsxs(CardFooter, { className: "mt-0 flex-col", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-border" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "px-2 bg-background text-muted-foreground", children: "N\u00E3o tem uma conta?" }) })] }), _jsx("div", { className: "mt-6 w-full", children: _jsx(Button, { variant: "secondary", asChild: true, className: "w-full", children: _jsxs(Link, { to: "/cadastro", children: [_jsx("span", { className: "mr-2", children: "\u2728" }), "Criar conta gratuita"] }) }) })] })] }), _jsx("div", { className: "text-center text-sm text-muted-foreground", children: _jsxs("p", { children: ["Ao entrar, voc\u00EA concorda com nossos", " ", _jsx("a", { href: "#", className: "text-primary hover:opacity-90", children: "Termos de Uso" }), " ", "e", " ", _jsx("a", { href: "#", className: "text-primary hover:opacity-90", children: "Pol\u00EDtica de Privacidade" })] }) })] }) }));
}
export default Login;
