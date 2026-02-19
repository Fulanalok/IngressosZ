import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
function CameraTest() {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState("");
    const [isActive, setIsActive] = useState(false);
    const startCamera = async () => {
        try {
            setError("");
            console.log("Solicitando acesso à câmera...");
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" }, // Preferir câmera traseira
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play();
                setStream(mediaStream);
                setIsActive(true);
                console.log("Câmera iniciada com sucesso!");
            }
        }
        catch (err) {
            console.error("Erro ao acessar câmera:", err);
            const error = err;
            if (error.name === "NotAllowedError") {
                setError("❌ Acesso à câmera negado. Clique no ícone de câmera na barra de endereço e permita o acesso.");
            }
            else if (error.name === "NotFoundError") {
                setError("❌ Nenhuma câmera encontrada no dispositivo.");
            }
            else if (error.name === "NotReadableError") {
                setError("❌ Câmera está sendo usada por outro aplicativo.");
            }
            else {
                setError(`❌ Erro: ${error.message}`);
            }
        }
    };
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
            setIsActive(false);
            console.log("Câmera parada");
        }
    };
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);
    return (_jsxs("div", { className: "card", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 mb-4", children: "\uD83D\uDD0D Teste de C\u00E2mera" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex space-x-3", children: [_jsx("button", { onClick: startCamera, disabled: isActive, className: `flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${isActive
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 text-white"}`, children: isActive ? "✅ Câmera Ativa" : "🎥 Ligar Câmera" }), _jsx("button", { onClick: stopCamera, disabled: !isActive, className: `flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${!isActive
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-red-600 hover:bg-red-700 text-white"}`, children: "\uD83D\uDED1 Parar C\u00E2mera" })] }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: [_jsx("p", { className: "text-red-800 text-sm", children: error }), _jsxs("div", { className: "mt-3 bg-red-100 p-3 rounded text-xs text-red-700", children: [_jsx("strong", { children: "Passos para resolver:" }), _jsxs("ol", { className: "mt-1 space-y-1", children: [_jsx("li", { children: "1. Clique no \u00EDcone \uD83D\uDD12 ou \uD83D\uDCF7 na barra de endere\u00E7o" }), _jsx("li", { children: "2. Selecione \"Permitir\" para c\u00E2mera" }), _jsx("li", { children: "3. Recarregue a p\u00E1gina se necess\u00E1rio" }), _jsx("li", { children: "4. Tente novamente" })] })] })] })), _jsxs("div", { className: "relative bg-black rounded-lg overflow-hidden", style: { aspectRatio: "16/9" }, children: [_jsx("video", { ref: videoRef, className: "w-full h-full object-cover", autoPlay: true, playsInline: true, muted: true }), !isActive && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-800", children: _jsxs("div", { className: "text-center text-white", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83D\uDCF7" }), _jsx("p", { children: "Clique em \"Ligar C\u00E2mera\" para testar" })] }) })), isActive && (_jsx("div", { className: "absolute top-2 right-2", children: _jsxs("div", { className: "bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center", children: [_jsx("div", { className: "w-2 h-2 bg-white rounded-full mr-1 animate-pulse" }), "AO VIVO"] }) }))] }), _jsxs("div", { className: "bg-blue-50 p-4 rounded-lg", children: [_jsx("h4", { className: "font-semibold text-blue-900 mb-2", children: "\u2139\uFE0F Informa\u00E7\u00F5es" }), _jsxs("div", { className: "text-sm text-blue-800 space-y-1", children: [_jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", isActive ? "🟢 Ativa" : "🔴 Inativa"] }), _jsxs("p", { children: [_jsx("strong", { children: "Navegador:" }), " ", navigator.userAgent.includes("Chrome")
                                                ? "Chrome"
                                                : navigator.userAgent.includes("Firefox")
                                                    ? "Firefox"
                                                    : "Outro"] }), _jsxs("p", { children: [_jsx("strong", { children: "HTTPS:" }), " ", location.protocol === "https:"
                                                ? "✅ Sim"
                                                : "❌ Não (pode afetar algumas funcionalidades)"] })] })] })] })] }));
}
export default CameraTest;
