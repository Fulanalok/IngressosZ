import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
function FirebaseDebug() {
    const [status, setStatus] = useState("Verificando...");
    const [details, setDetails] = useState([]);
    useEffect(() => {
        const checkFirebaseConnection = async () => {
            const newDetails = [];
            try {
                // Verificar se a configuração está presente
                newDetails.push(`Firebase Config carregado`);
                const projectId = auth.app?.options?.projectId || "(sem projectId)";
                const apiKeyPrefix = auth.app?.options?.apiKey
                    ? auth.app.options.apiKey.substring(0, 10) + "..."
                    : "(sem apiKey)";
                const authDomain = auth.app?.options?.authDomain || "(sem authDomain)";
                newDetails.push(`Project ID: ${projectId}`);
                newDetails.push(`API Key: ${apiKeyPrefix}`);
                newDetails.push(`Auth Domain: ${authDomain}`);
                // Verificar currentUser
                newDetails.push(`Usuário atual: ${auth.currentUser ? "Logado" : "Não logado"}`);
                // Tentar uma operação simples de inicialização do Auth
                const maybeAuth = auth;
                const hasAuthStateReady = typeof maybeAuth.authStateReady === "function";
                if (hasAuthStateReady) {
                    await maybeAuth.authStateReady();
                }
                else {
                    await new Promise((resolve) => {
                        const unsub = onAuthStateChanged(auth, () => {
                            unsub();
                            resolve();
                        });
                    });
                }
                newDetails.push(`Auth service inicializado`);
                setStatus("Firebase conectado com sucesso!");
            }
            catch (error) {
                console.error("Erro na verificação:", error);
                newDetails.push(`Erro: ${error instanceof Error ? error.message : String(error)}`);
                setStatus("Erro na configuração do Firebase");
            }
            setDetails(newDetails);
        };
        checkFirebaseConnection();
    }, []);
    return (_jsxs("div", { className: "card max-w-md mx-auto", children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: "Debug Firebase" }), _jsxs("div", { className: "mb-4", children: [_jsx("strong", { children: "Status:" }), " ", status] }), _jsx("div", { className: "space-y-1", children: details.map((detail, index) => (_jsx("div", { className: "text-sm text-gray-600", children: detail }, index))) }), _jsx("div", { className: "mt-4 p-3 bg-blue-50 rounded-md", children: _jsxs("p", { className: "text-sm text-blue-800", children: [_jsx("strong", { children: "Dica:" }), " Se voc\u00EA estiver vendo erro de configura\u00E7\u00E3o, verifique se o Firebase Authentication est\u00E1 habilitado no console e se o dom\u00EDnio localhost est\u00E1 autorizado."] }) })] }));
}
export default FirebaseDebug;
