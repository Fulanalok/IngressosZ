import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail, signInWithEmailAndPassword, } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { auth, functions } from "../firebaseConfig";
function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading: authLoading } = useAuth();
    const recaptchaRef = useRef(null);
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const [recaptchaError, setRecaptchaError] = useState("");
    const testSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
    const siteKey = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY ||
        (import.meta.env.DEV ? testSiteKey : "");
    const from = location.state?.from
        ?.pathname;
    const handleLogin = async (event) => {
        event.preventDefault();
        setError("");
        setRecaptchaError("");
        setLoading(true);
        try {
            if (!siteKey) {
                setRecaptchaError("reCAPTCHA não configurado.");
                return;
            }
            if (!recaptchaToken) {
                setRecaptchaError("Confirme o reCAPTCHA para continuar.");
                return;
            }
            const verifyRecaptcha = httpsCallable(functions, "verifyRecaptchaV2");
            await verifyRecaptcha({ token: recaptchaToken });
            await signInWithEmailAndPassword(auth, email, password);
            navigate(from || "/", { replace: true });
        }
        catch (err) {
            console.error("Erro ao fazer login:", err);
            const errorCode = typeof err === "object" && err !== null && "code" in err
                ? err.code
                : null;
            if (errorCode) {
                switch (errorCode) {
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
            recaptchaRef.current?.reset();
            setRecaptchaToken(null);
        }
        finally {
            setLoading(false);
        }
    };
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!forgotEmail.trim())
            return;
        setForgotLoading(true);
        setForgotMessage(null);
        try {
            await sendPasswordResetEmail(auth, forgotEmail.trim());
            setForgotMessage({
                type: "success",
                text: "Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.",
            });
        }
        catch (err) {
            if (err instanceof FirebaseError && err.code === "auth/invalid-email") {
                setForgotMessage({ type: "error", text: "E-mail inválido." });
            }
            else {
                setForgotMessage({
                    type: "error",
                    text: "Não foi possível enviar o e-mail. Tente novamente.",
                });
            }
        }
        finally {
            setForgotLoading(false);
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
    return (_jsx("div", { className: "min-h-screen gradient-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-3xl font-bold text-foreground", children: "Bem-vindo de volta!" }), _jsx("p", { className: "mt-2 text-muted-foreground", children: "Entre na sua conta para acessar seus ingressos" })] }), _jsxs(Card, { className: "mt-8", children: [_jsxs(CardContent, { children: [_jsxs("form", { onSubmit: handleLogin, className: "space-y-6", "aria-busy": loading, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-foreground mb-2", children: "Email" }), _jsx("div", { className: "relative", children: _jsx(Input, { id: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, placeholder: "seu@email.com", className: "pl-4", "aria-invalid": !!error, "aria-describedby": error ? "login-error" : undefined }) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-foreground mb-2", children: "Senha" }), _jsx("div", { className: "relative", children: _jsx(Input, { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, placeholder: "Sua senha", className: "pl-4", "aria-invalid": !!error, "aria-describedby": error ? "login-error" : undefined }) })] }), error && (_jsx("div", { id: "login-error", role: "alert", "aria-live": "assertive", className: "bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-lg p-4", children: _jsx("div", { className: "flex", children: _jsx("div", { className: "ml-3", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-300", children: error }) }) }) })), _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: () => {
                                                    setShowForgot(true);
                                                    setForgotEmail(email);
                                                    setForgotMessage(null);
                                                }, className: "text-sm text-primary hover:opacity-80 underline-offset-2 hover:underline", children: "Esqueci minha senha" }) }), siteKey ? (_jsx("div", { className: "flex justify-center", children: _jsx(ReCAPTCHA, { ref: recaptchaRef, sitekey: siteKey, onChange: (token) => setRecaptchaToken(token), onExpired: () => setRecaptchaToken(null) }) })) : (_jsx("div", { className: "text-center text-sm text-muted-foreground", children: "reCAPTCHA n\u00E3o configurado neste ambiente" })), recaptchaError && (_jsx("div", { role: "alert", "aria-live": "assertive", className: "bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-lg p-4", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-300", children: recaptchaError }) })), _jsx(Button, { type: "submit", disabled: loading, className: "w-full", children: loading ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-none h-4 w-4 border-b-2 border-primary-foreground mr-2" }), "Entrando..."] })) : (_jsx(_Fragment, { children: "Entrar" })) })] }), showForgot && (_jsxs("div", { className: "mt-4 rounded-lg border border-border p-4 space-y-3", children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: "Redefinir senha" }), _jsxs("form", { onSubmit: handleForgotPassword, className: "space-y-2", children: [_jsx(Input, { type: "email", value: forgotEmail, onChange: (e) => setForgotEmail(e.target.value), placeholder: "seu@email.com", required: true, disabled: forgotLoading }), forgotMessage && (_jsx("p", { className: `text-xs ${forgotMessage.type === "success"
                                                        ? "text-green-700"
                                                        : "text-red-600"}`, children: forgotMessage.text })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "submit", disabled: forgotLoading, className: "flex-1", children: forgotLoading ? "Enviando…" : "Enviar link" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => setShowForgot(false), disabled: forgotLoading, children: "Cancelar" })] })] })] }))] }), _jsxs(CardFooter, { className: "mt-0 flex-col", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-border" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "px-2 bg-background text-muted-foreground", children: "N\u00E3o tem uma conta?" }) })] }), _jsx("div", { className: "mt-6 w-full", children: _jsx(Button, { variant: "secondary", asChild: true, className: "w-full", children: _jsx(Link, { to: "/cadastro", children: "Criar conta gratuita" }) }) })] })] }), _jsx("div", { className: "text-center text-sm text-muted-foreground", children: _jsxs("p", { children: ["Ao entrar, voc\u00EA concorda com nossos", " ", _jsx("a", { href: "#", className: "text-primary hover:opacity-90", children: "Termos de Uso" }), " ", "e", " ", _jsx("a", { href: "#", className: "text-primary hover:opacity-90", children: "Pol\u00EDtica de Privacidade" })] }) })] }) }));
}
export default Login;
