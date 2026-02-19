import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInAnonymously } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { TestDataService } from "../services/testDataService";
function DevAutoPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState("Inicializando...");
    useEffect(() => {
        const run = async () => {
            if (import.meta.env.PROD) {
                setStatus("Rota disponível apenas em desenvolvimento.");
                return;
            }
            try {
                setStatus("Verificando autenticação...");
                if (!auth.currentUser) {
                    setStatus("Autenticando anonimamente...");
                    await signInAnonymously(auth);
                }
                setStatus("Criando eventos de teste...");
                const eventIds = await TestDataService.createTestEvents();
                setStatus("Criando ingressos de teste...");
                await TestDataService.createTestTickets(eventIds);
                setStatus("Concluído! Redirecionando...");
                navigate("/meus-ingressos", { replace: true });
            }
            catch (err) {
                console.error("DevAutoPage error:", err);
                const message = err instanceof Error ? err.message : String(err);
                setStatus(`Erro: ${message}`);
            }
        };
        run();
    }, [navigate]);
    return (_jsx("div", { className: "min-h-screen gradient-bg flex items-center justify-center", children: _jsxs("div", { className: "card p-6 text-center", children: [_jsx("div", { className: "text-5xl mb-3", children: "\uD83D\uDEE0\uFE0F" }), _jsx("h1", { className: "text-2xl font-bold text-foreground mb-2", children: "Dev Auto Setup" }), _jsx("p", { className: "text-muted-foreground", children: status })] }) }));
}
export default DevAutoPage;
