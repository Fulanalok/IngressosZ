import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
function QRScanner({ onScan, onError, isActive }) {
    const videoRef = useRef(null);
    const qrScannerRef = useRef(null);
    const [hasCamera, setHasCamera] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [retryInit, setRetryInit] = useState(0);
    const requestCameraPermission = async () => {
        try {
            // Solicitar permissão explicitamente
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment", // Preferir câmera traseira
                },
            });
            // Parar o stream imediatamente, só queríamos a permissão
            stream.getTracks().forEach((track) => track.stop());
            return true;
        }
        catch (error) {
            console.error("Erro ao solicitar permissão da câmera:", error);
            if (error.name === "NotAllowedError") {
                setPermissionDenied(true);
                setCameraError("Acesso à câmera negado. Por favor, permita o acesso à câmera.");
            }
            else if (error.name === "NotFoundError") {
                setCameraError("Nenhuma câmera encontrada no dispositivo.");
            }
            else {
                setCameraError("Erro ao acessar câmera: " + error.message);
            }
            return false;
        }
    };
    useEffect(() => {
        const initializeScanner = async () => {
            if (!videoRef.current)
                return;
            setIsLoading(true);
            setCameraError("");
            setPermissionDenied(false);
            try {
                // Primeiro solicitar permissão
                const hasPermission = await requestCameraPermission();
                if (!hasPermission) {
                    setIsLoading(false);
                    return;
                }
                // Verificar se há câmera disponível
                const cameraAvailable = await QrScanner.hasCamera();
                setHasCamera(cameraAvailable);
                if (!cameraAvailable) {
                    setCameraError("Nenhuma câmera encontrada");
                    setIsLoading(false);
                    return;
                }
                // Criar scanner
                const qrScanner = new QrScanner(videoRef.current, (result) => {
                    if (import.meta.env.DEV) {
                        console.log("QR Code detectado:", result.data);
                    }
                    onScan(result.data);
                }, {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    preferredCamera: "environment", // Câmera traseira
                    maxScansPerSecond: 5, // Aumentar frequência
                    returnDetailedScanResult: true,
                });
                qrScannerRef.current = qrScanner;
                setIsLoading(false);
                if (import.meta.env.DEV) {
                    console.log("Scanner QR inicializado com sucesso");
                }
            }
            catch (error) {
                console.error("Erro ao inicializar scanner:", error);
                setCameraError("Erro ao inicializar scanner: " + error.message);
                onError?.(cameraError);
                setIsLoading(false);
            }
        };
        if (isActive) {
            initializeScanner();
        }
        // Cleanup
        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.destroy();
                qrScannerRef.current = null;
            }
        };
    }, [isActive, onScan, onError, cameraError, retryInit]);
    useEffect(() => {
        if (!qrScannerRef.current || !isActive)
            return;
        if (hasCamera && !permissionDenied) {
            if (import.meta.env.DEV) {
                console.log("Iniciando scanner...");
            }
            qrScannerRef.current.start().catch((error) => {
                console.error("Erro ao iniciar scanner:", error);
                setCameraError("Erro ao iniciar scanner: " + error.message);
                onError?.("Erro ao iniciar scanner: " + error.message);
            });
        }
        else {
            qrScannerRef.current.stop();
        }
        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.stop();
            }
        };
    }, [isActive, hasCamera, permissionDenied, onError]);
    if (isLoading) {
        return (_jsxs("div", { className: "bg-gray-900 rounded-none p-8 text-center text-white", "aria-busy": "true", children: [_jsx("div", { className: "animate-spin rounded-none h-12 w-12 border-b-2 border-white mx-auto mb-4" }), _jsx("p", { children: "Solicitando acesso \u00E0 c\u00E2mera..." }), _jsx("p", { className: "text-sm opacity-75 mt-2", children: "Clique em \"Permitir\" quando solicitado" })] }));
    }
    if (permissionDenied || cameraError) {
        return (_jsxs("div", { className: "bg-red-50 border-2 border-red-200 rounded-none p-8 text-center", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83D\uDEAB" }), _jsx("h3", { className: "text-lg font-semibold text-red-900 mb-2", children: "Problema com a C\u00E2mera" }), _jsx("p", { className: "text-red-700 text-sm mb-4", children: cameraError || "Acesso à câmera negado" }), _jsxs("div", { className: "bg-red-100 p-4 rounded-none text-left", children: [_jsx("h4", { className: "font-semibold text-red-900 mb-2", children: "Como resolver:" }), _jsxs("ul", { className: "text-sm text-red-800 space-y-1", children: [_jsx("li", { children: "\u2022 Clique no \u00EDcone de c\u00E2mera na barra de endere\u00E7o" }), _jsx("li", { children: "\u2022 Selecione \"Sempre permitir\" para este site" }), _jsx("li", { children: "\u2022 Recarregue a p\u00E1gina" }), _jsx("li", { children: "\u2022 Se persistir, tente outro navegador" })] })] }), _jsxs("div", { className: "mt-4 flex gap-3 justify-center", children: [_jsx("button", { onClick: async () => {
                                const ok = await requestCameraPermission();
                                if (ok) {
                                    setPermissionDenied(false);
                                    setCameraError("");
                                    setRetryInit((n) => n + 1);
                                }
                            }, className: "bg-primary hover:opacity-90 text-white py-2 px-4 rounded-none font-medium transition-colors", "aria-label": "Permitir c\u00E2mera", children: "\uD83D\uDCF7 Permitir C\u00E2mera" }), _jsx("button", { onClick: () => window.location.reload(), className: "bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-none font-medium transition-colors", "aria-label": "Recarregar p\u00E1gina", children: "\uD83D\uDD04 Recarregar" })] })] }));
    }
    if (!hasCamera) {
        return (_jsxs("div", { className: "bg-gray-100 border-2 border-dashed border-gray-300 rounded-none p-8 text-center", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83D\uDCF7" }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "C\u00E2mera n\u00E3o encontrada" }), _jsx("p", { className: "text-gray-600 text-sm", children: "Nenhuma c\u00E2mera foi detectada neste dispositivo" })] }));
    }
    return (_jsxs("div", { className: "relative bg-black rounded-none overflow-hidden", "aria-busy": isLoading, children: [_jsx("video", { ref: videoRef, className: "w-full h-64 object-cover", style: { aspectRatio: "16/9" }, autoPlay: true, playsInline: true, muted: true, "aria-label": "Visualiza\u00E7\u00E3o da c\u00E2mera", "aria-describedby": "scan-instruction" }), _jsxs("div", { className: "absolute inset-0 pointer-events-none", children: [_jsx("div", { className: "absolute inset-4 border-2 border-white rounded-none opacity-50" }), _jsx("div", { className: "absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-none" }), _jsx("div", { className: "absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-none" }), _jsx("div", { className: "absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-none" }), _jsx("div", { className: "absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-none" }), _jsx("div", { className: "absolute bottom-2 left-0 right-0 text-center", children: _jsx("p", { id: "scan-instruction", className: "text-white text-sm bg-black bg-opacity-50 inline-block px-3 py-1 rounded-none", children: "\uD83D\uDCF1 Aponte a c\u00E2mera para o QR code" }) })] }), isActive && (_jsx("div", { className: "absolute top-2 right-2", role: "status", "aria-live": "polite", children: _jsxs("div", { className: "flex items-center bg-green-500 text-white px-2 py-1 rounded-none text-xs", children: [_jsx("div", { className: "w-2 h-2 bg-white rounded-none mr-1 animate-pulse" }), "Escaneando..."] }) }))] }));
}
export default QRScanner;
