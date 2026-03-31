import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { QRCodeService } from "../services/qrCodeService";
function QRTestDisplay({ ticketId = "test-ticket-123", eventId = "test-event-456", }) {
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [qrData, setQrData] = useState("");
    useEffect(() => {
        const generateTestQR = async () => {
            try {
                // Gerar dados do QR code
                const qrData = `qr-${ticketId}`;
                setQrData(qrData);
                // Gerar imagem do QR code
                const qrUrl = await QRCodeService.generateQRCode(qrData);
                setQrCodeUrl(qrUrl);
            }
            catch (error) {
                console.error("Erro ao gerar QR code de teste:", error);
            }
        };
        generateTestQR();
    }, [ticketId, eventId]);
    return (_jsx("div", { className: "max-w-md mx-auto bg-white rounded-none shadow-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 mb-2", children: "QR Code de Teste" }), _jsx("p", { className: "text-gray-600 mb-4", children: "Use este QR code para testar o scanner e a valida\u00E7\u00E3o" }), qrCodeUrl ? (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "bg-white p-4 rounded-lg border-2 border-gray-200 inline-block", children: _jsx("img", { src: qrCodeUrl, alt: "QR Code de Teste", className: "w-64 h-64 mx-auto" }) }), _jsx("div", { className: "text-xs text-gray-500 space-y-2", children: _jsxs("div", { className: "font-mono bg-gray-100 p-2 rounded-none text-left break-all", children: [_jsx("strong", { children: "Token usado na valida\u00E7\u00E3o:" }), " ", qrData] }) }), _jsxs("div", { className: "bg-blue-50 p-3 rounded-none", children: [_jsx("p", { className: "text-sm text-blue-800", children: _jsx("strong", { children: "Como testar:" }) }), _jsxs("ol", { className: "text-xs text-blue-700 mt-1 space-y-1", children: [_jsx("li", { children: "1. Abra uma nova aba do navegador" }), _jsx("li", { children: "2. V\u00E1 para a p\u00E1gina do Validador" }), _jsx("li", { children: "3. Clique em \"Scan QR\"" }), _jsx("li", { children: "4. Aponte a c\u00E2mera para este QR code na tela" })] })] })] })) : (_jsxs("div", { className: "py-8", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" }), _jsx("p", { className: "text-gray-500 mt-2", children: "Gerando QR code..." })] }))] }) }));
}
export default QRTestDisplay;
