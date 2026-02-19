import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { QRCodeService } from "../services/qrCodeService";
function QRCodeDisplay({ ticketId, qrCode, eventId, size = 200, }) {
    const [qrCodeImage, setQrCodeImage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const generateQRCode = async () => {
            try {
                setIsLoading(true);
                setError("");
                // Gerar dados do QR code
                const qrData = QRCodeService.generateTicketQRData(ticketId, qrCode, eventId);
                // Gerar imagem do QR code
                const qrImage = await QRCodeService.generateQRCode(qrData);
                setQrCodeImage(qrImage);
            }
            catch (err) {
                console.error("Erro ao gerar QR code:", err);
                setError("Erro ao gerar QR code");
            }
            finally {
                setIsLoading(false);
            }
        };
        generateQRCode();
    }, [ticketId, qrCode, eventId]);
    if (isLoading) {
        return (_jsx("div", { className: "bg-gray-100 border-2 border-dashed border-gray-300 rounded-none flex items-center justify-center", style: { width: size, height: size }, children: _jsxs("div", { className: "text-center text-gray-500", children: [_jsx("div", { className: "animate-spin rounded-none h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2" }), _jsx("div", { className: "text-xs", children: "Gerando QR" })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "bg-red-50 border-2 border-red-200 rounded-none flex items-center justify-center", style: { width: size, height: size }, children: _jsxs("div", { className: "text-center text-red-600", children: [_jsx("div", { className: "text-2xl mb-1", children: "\u26A0\uFE0F" }), _jsx("div", { className: "text-xs", children: "Erro no QR" })] }) }));
    }
    return (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "bg-white border-2 border-gray-200 rounded-none p-2 inline-block shadow-sm", style: { width: size + 16, height: size + 16 }, children: _jsx("img", { src: qrCodeImage, alt: "QR Code do Ingresso", className: "w-full h-full object-contain", style: { width: size, height: size } }) }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "QR Code do Ingresso" })] }));
}
export default QRCodeDisplay;
