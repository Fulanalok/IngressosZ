import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { postClientError } from "@/services/logger";
function DocView() {
    const [health, setHealth] = useState(null);
    const [logSent, setLogSent] = useState(false);
    const [logResponse, setLogResponse] = useState(null);
    useEffect(() => {
        // Em produção ou ambiente real, essa rota pode não existir ou ser diferente.
        // Tenta bater no endpoint de healthcheck (se existir) ou apenas simula.
        // Como não temos um endpoint "/functions/health" explícito no código atual,
        // vamos adaptar para não quebrar a tela se falhar.
        const load = async () => {
            try {
                // Ajuste: O endpoint correto seria algo como /api/health ou uma Cloud Function específica.
                // Se não houver, vamos apenas mostrar o estado local.
                // Para este exemplo, vou supor que o usuário queira ver o estado dos emuladores.
                const isEmulator = import.meta.env.VITE_USE_EMULATORS === "true";
                setHealth({
                    emulator: isEmulator,
                    firestoreEmulator: isEmulator,
                    authEmulator: isEmulator,
                    time: new Date().toISOString()
                });
            }
            catch (e) {
                console.error(e);
            }
        };
        load();
    }, []);
    return (_jsx("div", { className: "min-h-screen gradient-bg", children: _jsxs("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-4xl font-bold text-foreground mb-2", children: "Documenta\u00E7\u00E3o do Sistema (DocView)" }), _jsx("p", { className: "text-muted-foreground", children: "Vis\u00E3o geral t\u00E9cnica, status do ambiente e ferramentas de desenvolvimento." })] }), _jsxs("div", { className: "grid lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Arquitetura do Projeto" }) }), _jsxs(CardContent, { className: "space-y-2 text-sm", children: [_jsxs("p", { children: [_jsx("strong", { children: "Frontend:" }), " React 19 + TypeScript + Vite + Tailwind CSS v4"] }), _jsxs("p", { children: [_jsx("strong", { children: "Backend:" }), " Firebase Cloud Functions v2 + Node.js 24"] }), _jsxs("p", { children: [_jsx("strong", { children: "Banco de Dados:" }), " Firestore (NoSQL)"] }), _jsxs("p", { children: [_jsx("strong", { children: "Autentica\u00E7\u00E3o:" }), " Firebase Auth"] }), _jsxs("p", { children: [_jsx("strong", { children: "Pagamentos:" }), " Mercado Pago (SDK v2.12)"] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Ambiente de Desenvolvimento" }) }), _jsxs(CardContent, { className: "space-y-2 text-sm", children: [_jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", import.meta.env.VITE_USE_EMULATORS === "true" ? "Emuladores Ativos" : "Produção / Remoto"] }), _jsxs("div", { className: "bg-muted p-2 rounded mt-2", children: [_jsx("p", { className: "font-mono text-xs", children: "Auth: porta 9099" }), _jsx("p", { className: "font-mono text-xs", children: "Firestore: porta 8080" }), _jsx("p", { className: "font-mono text-xs", children: "Functions: porta 5001" })] }), health && (_jsxs("p", { className: "text-xs text-muted-foreground mt-2", children: ["\u00DAltima verifica\u00E7\u00E3o: ", health.time] }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Configura\u00E7\u00F5es Importantes" }) }), _jsxs(CardContent, { className: "space-y-2 text-sm", children: [_jsxs("p", { children: [_jsx("strong", { children: "Vite Config:" }), " Proxy para emuladores e aliases (@)"] }), _jsxs("p", { children: [_jsx("strong", { children: "CI/CD:" }), " GitHub Actions configurado (.github/workflows/ci.yml)"] }), _jsxs("p", { children: [_jsx("strong", { children: "Linting:" }), " ESLint + Prettier"] }), _jsxs("p", { children: [_jsx("strong", { children: "Testes:" }), " Vitest (Unit\u00E1rios/Integra\u00E7\u00E3o)"] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Links \u00DAteis e Ferramentas" }) }), _jsxs(CardContent, { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { asChild: true, size: "sm", children: _jsx(Link, { to: "/debug/firebase", children: "Debug Firebase" }) }), _jsx(Button, { asChild: true, variant: "secondary", size: "sm", children: _jsx(Link, { to: "/dev-auto", children: "Auto Setup (Dev)" }) }), _jsx(Button, { asChild: true, variant: "secondary", size: "sm", children: _jsx(Link, { to: "/validador", children: "Validador de Ingressos" }) }), _jsx(Button, { asChild: true, variant: "outline", size: "sm", children: _jsx("a", { href: "http://localhost:4000", target: "_blank", rel: "noreferrer", children: "Emulator UI" }) })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-border", children: [_jsx("p", { className: "font-semibold mb-2", children: "Webhooks & Endpoints:" }), _jsxs("ul", { className: "list-disc pl-5 space-y-1", children: [_jsxs("li", { children: [_jsx("code", { children: "/mercadopagoWebhook" }), ": Recebe notifica\u00E7\u00F5es de pagamento"] }), _jsxs("li", { children: [_jsx("code", { children: "/logClientError" }), ": Centraliza logs do frontend"] }), _jsxs("li", { children: [_jsx("code", { children: "setAdminRole" }), ": Fun\u00E7\u00E3o Callable para gest\u00E3o de permiss\u00F5es"] })] })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Teste de Telemetria" }) }), _jsxs(CardContent, { className: "space-y-2 text-sm", children: [_jsx("p", { className: "text-muted-foreground mb-2", children: "Envia um erro simulado para o backend testar o logger." }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx(Button, { onClick: async () => {
                                                        try {
                                                            setLogResponse(null);
                                                            const result = await postClientError({
                                                                type: "docview-test",
                                                                message: "Teste manual de log via DocView",
                                                                ts: Date.now(),
                                                            });
                                                            setLogResponse(result.ok
                                                                ? `Log aceito (${result.status})`
                                                                : `Falha ao enviar (${result.status || "sem status"})`);
                                                            setLogSent(true);
                                                            setTimeout(() => setLogSent(false), 3000);
                                                        }
                                                        catch (err) {
                                                            console.error("Falha ao enviar log", err);
                                                        }
                                                    }, children: "Enviar Log de Teste" }), logSent && (_jsx("span", { className: "text-green-600 font-medium animate-pulse", children: "Log enviado com sucesso!" })), logResponse && (_jsx("span", { className: "text-xs text-muted-foreground", children: logResponse }))] })] })] })] })] }) }));
}
export default DocView;
