import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { auth, functions } from "../firebaseConfig";
function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
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
    const handleSignUp = async (event) => {
        event.preventDefault();
        setError("");
        setRecaptchaError("");
        // Validação de senha
        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }
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
            await createUserWithEmailAndPassword(auth, email, password);
            navigate(from || "/", { replace: true });
        }
        catch (err) {
            console.error("Erro ao criar usuário:", err);
            const errorCode = typeof err === "object" && err !== null && "code" in err
                ? err.code
                : null;
            if (errorCode) {
                switch (errorCode) {
                    case "auth/email-already-in-use":
                        setError("Este e-mail já está em uso.");
                        break;
                    case "auth/weak-password":
                        setError("A senha deve ter pelo menos 6 caracteres.");
                        break;
                    case "auth/invalid-email":
                        setError("E-mail inválido.");
                        break;
                    case "auth/network-request-failed":
                        setError("Falha de rede ao criar conta. Verifique sua conexão e tente novamente.");
                        break;
                    case "auth/configuration-not-found":
                        setError("Erro de configuração do Firebase. Verifique as configurações do projeto.");
                        break;
                    case "auth/api-key-not-valid":
                        setError("Chave de API do Firebase inválida.");
                        break;
                    default:
                        setError("Não foi possível criar a conta. Tente novamente em alguns instantes.");
                        toast.error("Erro ao criar conta. Tente novamente.");
                }
            }
            else {
                setError("Ocorreu um erro ao criar a conta.");
                toast.error("Ocorreu um erro inesperado.");
            }
            recaptchaRef.current?.reset();
            setRecaptchaToken(null);
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
    return (_jsx("div", { className: "min-h-screen gradient-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-3xl font-bold text-foreground", children: "Crie sua conta" }), _jsx("p", { className: "mt-2 text-muted-foreground", children: "Junte-se ao IngressosZ e descubra eventos incr\u00EDveis" })] }), _jsxs(Card, { className: "mt-8", children: [_jsx(CardContent, { children: _jsxs("form", { onSubmit: handleSignUp, className: "space-y-6", "aria-busy": loading, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-foreground mb-2", children: "Email" }), _jsx("div", { className: "relative", children: _jsx(Input, { id: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, placeholder: "seu@email.com", className: "pl-4", "aria-invalid": !!error, "aria-describedby": error ? "signup-error" : undefined }) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-foreground mb-2", children: "Senha" }), _jsx("div", { className: "relative", children: _jsx(Input, { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 6, placeholder: "M\u00EDnimo 6 caracteres", className: "pl-4", "aria-invalid": !!error, "aria-describedby": error ? "signup-error" : undefined }) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirmPassword", className: "block text-sm font-medium text-foreground mb-2", children: "Confirmar Senha" }), _jsx("div", { className: "relative", children: _jsx(Input, { id: "confirmPassword", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), required: true, placeholder: "Confirme sua senha", className: "pl-4", "aria-invalid": !!error, "aria-describedby": error ? "signup-error" : undefined }) })] }), error && (_jsx("div", { id: "signup-error", role: "alert", "aria-live": "assertive", className: "bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-lg p-4", children: _jsx("div", { className: "flex", children: _jsx("div", { className: "ml-3", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-300", children: error }) }) }) })), siteKey ? (_jsx("div", { className: "flex justify-center", children: _jsx(ReCAPTCHA, { ref: recaptchaRef, sitekey: siteKey, onChange: (token) => setRecaptchaToken(token), onExpired: () => setRecaptchaToken(null) }) })) : (_jsx("div", { className: "text-center text-sm text-muted-foreground", children: "reCAPTCHA n\u00E3o configurado neste ambiente" })), recaptchaError && (_jsx("div", { role: "alert", "aria-live": "assertive", className: "bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-lg p-4", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-300", children: recaptchaError }) })), _jsx(Button, { type: "submit", disabled: loading, className: "w-full", children: loading ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-none h-4 w-4 border-b-2 border-primary-foreground mr-2" }), "Criando conta..."] })) : (_jsx(_Fragment, { children: "Criar conta gratuita" })) })] }) }), _jsxs(CardFooter, { className: "mt-0 flex-col", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-border" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "px-2 bg-background text-muted-foreground", children: "J\u00E1 tem uma conta?" }) })] }), _jsx("div", { className: "mt-6 w-full", children: _jsx(Button, { variant: "secondary", asChild: true, className: "w-full", children: _jsx(Link, { to: "/login", children: "Fazer login" }) }) })] })] }), _jsxs("div", { className: "bg-background rounded-none p-6 shadow-sm border border-border", children: [_jsx("h3", { className: "text-lg font-medium text-foreground mb-4", children: "Por que se cadastrar?" }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex items-center", children: _jsx("span", { className: "text-muted-foreground", children: "Compre ingressos de forma segura" }) }), _jsx("div", { className: "flex items-center", children: _jsx("span", { className: "text-muted-foreground", children: "Acesse seus ingressos no celular" }) }), _jsx("div", { className: "flex items-center", children: _jsx("span", { className: "text-muted-foreground", children: "Receba notifica\u00E7\u00F5es sobre eventos" }) }), _jsx("div", { className: "flex items-center", children: _jsx("span", { className: "text-muted-foreground", children: "Hist\u00F3rico de compras" }) })] })] }), _jsx("div", { className: "text-center text-sm text-muted-foreground", children: _jsxs("p", { children: ["Ao criar uma conta, voc\u00EA concorda com nossos", " ", _jsx("a", { href: "#", className: "text-primary hover:opacity-90", children: "Termos de Uso" }), " ", "e", " ", _jsx("a", { href: "#", className: "text-primary hover:opacity-90", children: "Pol\u00EDtica de Privacidade" })] }) })] }) }));
}
export default SignUp;
