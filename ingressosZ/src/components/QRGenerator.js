import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { QRCodeService } from "../services/qrCodeService";
function QRGenerator({ onGenerate }) {
    const [qrCode, setQrCode] = useState("qr-test-123");
    const [generatedQR, setGeneratedQR] = useState("");
    const [qrImage, setQrImage] = useState("");
    const handleGenerate = async () => {
        try {
            const qrData = qrCode.trim();
            const qrImageUrl = await QRCodeService.generateQRCode(qrData);
            setGeneratedQR(qrData);
            setQrImage(qrImageUrl);
            if (onGenerate) {
                onGenerate(qrData);
            }
        }
        catch (error) {
            console.error("Erro ao gerar QR:", error);
        }
    };
    const generateRandomData = () => {
        const randomId = Math.random().toString(36).substring(2, 15);
        setQrCode(`qr-${randomId}`);
    };
    return (_jsxs("div", { className: "card", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 mb-4", children: "\uD83C\uDF9B\uFE0F Gerador de QR Codes" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Token do QR" }), _jsx("input", { type: "text", value: qrCode, onChange: (e) => setQrCode(e.target.value), className: "input-field", placeholder: "Cole o token do ingresso" })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: handleGenerate, className: "flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors", children: "\uD83D\uDD04 Gerar QR Code" }), _jsx("button", { onClick: generateRandomData, className: "bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors", children: "\uD83C\uDFB2" })] }), _jsx("div", { children: _jsx("button", { onClick: () => QRCodeService.downloadQRCode(qrImage), className: "bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors", children: "\uD83D\uDCBE Baixar QR Code" }) }), qrImage && (_jsx("div", { className: "mt-6 p-4 bg-white border-2 border-gray-200 rounded-lg", children: _jsxs("div", { className: "text-center", children: [_jsx("img", { src: qrImage, alt: "QR Code Gerado", className: "mx-auto mb-3" }), _jsxs("div", { className: "text-xs text-gray-500 font-mono break-all", children: ["Token usado na valida\u00E7\u00E3o: ", generatedQR] })] }) }))] })] }));
}
export default QRGenerator;
