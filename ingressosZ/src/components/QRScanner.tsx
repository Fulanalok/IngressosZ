import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

function QRScanner({ onScan, onError, isActive }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
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
    } catch (error) {
      console.error("Erro ao solicitar permissão da câmera:", error);
      if ((error as Error).name === "NotAllowedError") {
        setPermissionDenied(true);
        setCameraError(
          "Acesso à câmera negado. Por favor, permita o acesso à câmera."
        );
      } else if ((error as Error).name === "NotFoundError") {
        setCameraError("Nenhuma câmera encontrada no dispositivo.");
      } else {
        setCameraError("Erro ao acessar câmera: " + (error as Error).message);
      }
      return false;
    }
  };

  useEffect(() => {
    const initializeScanner = async () => {
      if (!videoRef.current) return;

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
        const qrScanner = new QrScanner(
          videoRef.current,
          (result) => {
            if (import.meta.env.DEV) {
              console.log("QR Code detectado:", result.data);
            }
            onScan(result.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: "environment", // Câmera traseira
            maxScansPerSecond: 5, // Aumentar frequência
            returnDetailedScanResult: true,
          }
        );

        qrScannerRef.current = qrScanner;
        setIsLoading(false);
      if (import.meta.env.DEV) {
        console.log("Scanner QR inicializado com sucesso");
      }
      } catch (error) {
        console.error("Erro ao inicializar scanner:", error);
        setCameraError(
          "Erro ao inicializar scanner: " + (error as Error).message
        );
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
    if (!qrScannerRef.current || !isActive) return;

    if (hasCamera && !permissionDenied) {
      if (import.meta.env.DEV) {
        console.log("Iniciando scanner...");
      }
      qrScannerRef.current.start().catch((error) => {
        console.error("Erro ao iniciar scanner:", error);
        setCameraError("Erro ao iniciar scanner: " + error.message);
        onError?.("Erro ao iniciar scanner: " + error.message);
      });
    } else {
      qrScannerRef.current.stop();
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
      }
    };
  }, [isActive, hasCamera, permissionDenied, onError]);

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-none p-8 text-center text-white" aria-busy="true">
            <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Solicitando acesso à câmera...</p>
        <p className="text-sm opacity-75 mt-2">
          Clique em "Permitir" quando solicitado
        </p>
      </div>
    );
  }

  if (permissionDenied || cameraError) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-none p-8 text-center">
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Problema com a Câmera
        </h3>
        <p className="text-red-700 text-sm mb-4">
          {cameraError || "Acesso à câmera negado"}
        </p>

        <div className="bg-red-100 p-4 rounded-none text-left">
          <h4 className="font-semibold text-red-900 mb-2">Como resolver:</h4>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• Clique no ícone de câmera na barra de endereço</li>
            <li>• Selecione "Sempre permitir" para este site</li>
            <li>• Recarregue a página</li>
            <li>• Se persistir, tente outro navegador</li>
          </ul>
        </div>

        <div className="mt-4 flex gap-3 justify-center">
          <button
            onClick={async () => {
              const ok = await requestCameraPermission();
              if (ok) {
                setPermissionDenied(false);
                setCameraError("");
                setRetryInit((n) => n + 1);
              }
            }}
            className="bg-primary hover:opacity-90 text-white py-2 px-4 rounded-none font-medium transition-colors"
            aria-label="Permitir câmera"
          >
            Permitir Câmera
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-none font-medium transition-colors"
            aria-label="Recarregar página"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  if (!hasCamera) {
    return (
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-none p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Câmera não encontrada
        </h3>
        <p className="text-gray-600 text-sm">
          Nenhuma câmera foi detectada neste dispositivo
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-black rounded-none overflow-hidden" aria-busy={isLoading}>
      <video
        ref={videoRef}
        className="w-full h-64 object-cover"
        style={{ aspectRatio: "16/9" }}
        autoPlay
        playsInline
        muted
        aria-label="Visualização da câmera"
        aria-describedby="scan-instruction"
      />

      {/* Overlay com guias */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Frame de scan */}
        <div className="absolute inset-4 border-2 border-white rounded-none opacity-50"></div>

        {/* Cantos do frame */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-none"></div>
        <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-none"></div>
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-none"></div>
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-none"></div>

        {/* Instrução */}
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <p id="scan-instruction" className="text-white text-sm bg-black bg-opacity-50 inline-block px-3 py-1 rounded-none">
            Aponte a câmera para o QR code
          </p>
        </div>
      </div>

      {/* Status indicator */}
      {isActive && (
        <div className="absolute top-2 right-2" role="status" aria-live="polite">
          <div className="flex items-center bg-green-500 text-white px-2 py-1 rounded-none text-xs">
            <div className="w-2 h-2 bg-white rounded-none mr-1 animate-pulse"></div>
            Escaneando...
          </div>
        </div>
      )}
    </div>
  );
}

export default QRScanner;
