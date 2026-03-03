import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, } from "../components/ui/card";
import { ScannerSection } from "../components/validator/ScannerSection";
import { ValidationResult } from "../components/validator/ValidationResult";
import { ValidatorForm } from "../components/validator/ValidatorForm";
import { useAuth } from "../hooks/useAuth";
import { useTicketValidator, } from "../hooks/validator/useTicketValidator";
import { TestDataService } from "../services/testDataService";
function ValidatorPage() {
    const { user, userProfile } = useAuth();
    const [ticketCode, setTicketCode] = useState("");
    const [backendStatus, setBackendStatus] = useState(null);
    const [scannerActive, setScannerActive] = useState(false);
    const [isCreatingTestData, setIsCreatingTestData] = useState(false);
    const [recentScans, setRecentScans] = useState([]);
    const { validateTicket, validationResult, isValidating, resetValidation } = useTicketValidator();
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const resp = await fetch("/functions/health", { method: "GET" });
                if (!resp.ok)
                    return;
                const h = await resp.json();
                const parts = [];
                parts.push(h?.emulator ? "Emulador: ativo" : "Emulador: inativo");
                parts.push(h?.firestoreEmulator ? "Firestore: emulador" : "Firestore: real");
                parts.push(h?.authEmulator ? "Auth: emulador" : "Auth: real");
                setBackendStatus(parts.join(" • "));
            }
            catch {
                setBackendStatus("Backend indisponível");
            }
        };
        checkHealth();
    }, []);
    // Códigos de teste válidos
    const testCodes = [
        "TICKET-1756219017406-fh2k739l1",
        "TICKET-JT1ZHCGOVQYIECOUAZCF",
        "TICKET-1756219017407-usado123",
        "TICKET-1735210800000-ABC123",
        "TICKET-1756295230187-lxfcondum",
    ];
    const generateTestCode = () => {
        const randomCode = testCodes[Math.floor(Math.random() * testCodes.length)];
        setTicketCode(randomCode);
    };
    const createTestData = async () => {
        setIsCreatingTestData(true);
        try {
            // Forçar recriação dos dados
            await TestDataService.initializeTestData(true);
            alert("✅ Dados de teste criados com sucesso!\n\nCódigos disponíveis:\n- TICKET-1756219017406-fh2k739l1\n- TICKET-JT1ZHCGOVQYIECOUAZCF\n- TICKET-1756295230187-lxfcondum\n\nCódigo usado (para teste):\n- TICKET-1756219017407-usado123");
        }
        catch (error) {
            console.error("Erro ao criar dados:", error);
            alert("⚠️ Firebase indisponível - Usando modo offline!\n\nCódigos de teste funcionais:\n- TICKET-1756219017406-fh2k739l1\n- TICKET-JT1ZHCGOVQYIECOUAZCF\n- TICKET-1756295230187-lxfcondum\n- TICKET-1756219017407-usado123 (usado)\n\nO validador funcionará normalmente!");
        }
        finally {
            setIsCreatingTestData(false);
        }
    };
    const handleValidate = async (code) => {
        const codeToValidate = code || ticketCode;
        const result = await validateTicket(codeToValidate);
        if (result) {
            // Adicionar timestamp ou ID único para a lista se necessário, mas por enquanto usamos o objeto
            setRecentScans((prev) => [result, ...prev].slice(0, 5));
        }
    };
    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleValidate();
    };
    const handleReset = () => {
        setTicketCode("");
        resetValidation();
    };
    return (_jsx("div", { className: "min-h-screen gradient-bg", children: _jsxs("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83D\uDD0D" }), _jsx("h1", { className: "text-4xl font-bold text-foreground mb-2", children: "Validador de Ingressos" }), _jsxs("p", { className: "text-xl text-muted-foreground", children: ["Ol\u00E1,", " ", _jsx("span", { className: "font-semibold text-green-600 dark:text-green-400", children: user?.email }), "!"] }), _jsx("p", { className: "text-muted-foreground mt-2", children: "Valide ingressos de forma r\u00E1pida e segura" }), backendStatus && (_jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: backendStatus }))] }), _jsx(ScannerSection, { userProfile: userProfile, scannerActive: scannerActive, onScan: (code) => {
                        setTicketCode(code);
                        setScannerActive(false);
                        handleValidate(code);
                    }, onError: () => {
                        setScannerActive(false);
                    } }), _jsxs("div", { className: "grid lg:grid-cols-2 gap-8", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { className: "text-center", children: [_jsxs(CardTitle, { className: "text-2xl", children: [_jsx("span", { className: "mr-2 text-4xl align-middle", children: "\uD83D\uDCF1" }), "Validar Ingresso"] }), _jsx("p", { className: "text-muted-foreground", children: "Digite o c\u00F3digo do ingresso para validar" })] }), _jsx(CardContent, { children: _jsx(ValidatorForm, { ticketCode: ticketCode, setTicketCode: setTicketCode, onSubmit: handleFormSubmit, isValidating: isValidating, onReset: handleReset, userProfile: userProfile, validationStatus: validationResult.status, generateTestCode: generateTestCode, createTestData: createTestData, isCreatingTestData: isCreatingTestData }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "text-center", children: _jsxs(CardTitle, { className: "text-2xl", children: [_jsx("span", { className: "mr-2 text-4xl align-middle", children: "\uD83D\uDCCB" }), "Resultado da Valida\u00E7\u00E3o"] }) }), _jsx(CardContent, { children: _jsx("div", { id: "validation-result", role: "status", "aria-live": "polite", children: _jsx(ValidationResult, { status: validationResult.status, message: validationResult.message, ticketData: validationResult.ticketData, onConfirm: () => {
                                                // Lógica adicional de confirmação se necessário
                                                // Por enquanto apenas reseta
                                                handleReset();
                                            } }) }) })] })] }), recentScans.length > 0 && (_jsxs(Card, { className: "mt-8", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-xl", children: "Hist\u00F3rico Recente" }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-2", children: recentScans.map((scan, index) => (_jsxs("div", { className: `p-3 rounded border flex justify-between items-center ${scan.status === "success"
                                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                        : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"}`, children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: scan.ticketData?.holderName || "Desconhecido" }), _jsxs("div", { className: "text-sm text-muted-foreground", children: [scan.ticketData?.ticketType || "Ingresso", " -", " ", scan.ticketData?.eventTitle] })] }), _jsx("div", { className: `font-bold ${scan.status === "success"
                                                ? "text-green-600"
                                                : "text-red-600"}`, children: scan.status === "success"
                                                ? "VÁLIDO"
                                                : scan.status === "error"
                                                    ? "USADO"
                                                    : "INVÁLIDO" })] }, index))) }) })] })), _jsxs(Card, { className: "mt-12", children: [_jsx(CardHeader, { className: "text-center", children: _jsx(CardTitle, { className: "text-xl", children: "Como Validar Ingressos" }) }), _jsxs(CardContent, { children: [_jsxs("div", { className: "grid md:grid-cols-3 gap-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-3xl mb-2", children: "1\uFE0F\u20E3" }), _jsx("div", { className: "font-semibold mb-1", children: "Digite o C\u00F3digo" }), _jsx("div", { className: "text-sm text-muted-foreground", children: "Insira o c\u00F3digo alfanum\u00E9rico do ingresso" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-3xl mb-2", children: "2\uFE0F\u20E3" }), _jsx("div", { className: "font-semibold mb-1", children: "Valide" }), _jsx("div", { className: "text-sm text-muted-foreground", children: "Clique em validar para verificar autenticidade" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-3xl mb-2", children: "3\uFE0F\u20E3" }), _jsx("div", { className: "font-semibold mb-1", children: "Confirme" }), _jsx("div", { className: "text-sm text-muted-foreground", children: "Libere a entrada se o ingresso for v\u00E1lido" })] })] }), _jsx("div", { className: "mt-6 flex justify-center", children: _jsx("button", { className: "bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors", onClick: () => setScannerActive((s) => !s), disabled: String(userProfile?.role || "user").toLowerCase() !==
                                            "validator", children: scannerActive ? "Fechar Scanner" : "Scanear QR" }) })] })] })] }) }));
}
export default ValidatorPage;
