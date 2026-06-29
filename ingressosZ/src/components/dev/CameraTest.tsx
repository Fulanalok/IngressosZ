import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

function getCameraErrorMessage(error: Error) {
  const messages: Record<string, string> = {
    NotAllowedError:
      "Acesso a camera negado. Clique no icone de camera na barra de endereco e permita o acesso.",
    NotFoundError: "Nenhuma camera encontrada no dispositivo.",
    NotReadableError: "Camera esta sendo usada por outro aplicativo.",
  };

  return messages[error.name] ?? `Erro: ${error.message}`;
}

function getBrowserLabel(userAgent: string) {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  return "Outro";
}

function CameraActions({
  isActive,
  startCamera,
  stopCamera,
}: {
  isActive: boolean;
  startCamera: () => void;
  stopCamera: () => void;
}) {
  return (
    <div className="flex space-x-3">
      <button
        onClick={startCamera}
        disabled={isActive}
        className={`flex-1 py-2 px-4 rounded-none font-medium transition-colors ${
          isActive
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      >
        {isActive ? "Camera Ativa" : "Ligar Camera"}
      </button>

      <button
        onClick={stopCamera}
        disabled={!isActive}
        className={`flex-1 py-2 px-4 rounded-none font-medium transition-colors ${
          isActive
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        Parar Camera
      </button>
    </div>
  );
}

function CameraError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-red-800 text-sm">{message}</p>

      <div className="mt-3 bg-red-100 p-3 rounded text-xs text-red-700">
        <strong>Passos para resolver:</strong>
        <ol className="mt-1 space-y-1">
          <li>1. Clique no icone de camera na barra de endereco</li>
          <li>2. Selecione "Permitir" para camera</li>
          <li>3. Recarregue a pagina se necessario</li>
          <li>4. Tente novamente</li>
        </ol>
      </div>
    </div>
  );
}

function CameraPreview({
  isActive,
  videoRef,
}: {
  isActive: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  return (
    <div
      className="relative bg-black rounded-lg overflow-hidden"
      style={{ aspectRatio: "16/9" }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white">
            <p>Clique em "Ligar Camera" para testar</p>
          </div>
        </div>
      )}

      {isActive && (
        <div className="absolute top-2 right-2">
          <div className="bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
            AO VIVO
          </div>
        </div>
      )}
    </div>
  );
}

function CameraStatus({ isActive }: { isActive: boolean }) {
  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h4 className="font-semibold text-blue-900 mb-2">Informacoes</h4>
      <div className="text-sm text-blue-800 space-y-1">
        <p>
          <strong>Status:</strong> {isActive ? "Ativa" : "Inativa"}
        </p>
        <p>
          <strong>Navegador:</strong> {getBrowserLabel(navigator.userAgent)}
        </p>
        <p>
          <strong>HTTPS:</strong>{" "}
          {location.protocol === "https:"
            ? "Sim"
            : "Nao (pode afetar algumas funcionalidades)"}
        </p>
      </div>
    </div>
  );
}

function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isActive, setIsActive] = useState(false);

  const startCamera = async () => {
    try {
      setError("");
      console.log("Solicitando acesso a camera...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!videoRef.current) return;

      videoRef.current.srcObject = mediaStream;
      await videoRef.current.play();
      setStream(mediaStream);
      setIsActive(true);
      console.log("Camera iniciada com sucesso!");
    } catch (err) {
      console.error("Erro ao acessar camera:", err);
      setError(getCameraErrorMessage(err as Error));
    }
  };

  const stopCamera = () => {
    if (!stream) return;

    stream.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsActive(false);
    console.log("Camera parada");
  };

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Teste de Camera
      </h3>

      <div className="space-y-4">
        <CameraActions
          isActive={isActive}
          startCamera={startCamera}
          stopCamera={stopCamera}
        />
        <CameraError message={error} />
        <CameraPreview isActive={isActive} videoRef={videoRef} />
        <CameraStatus isActive={isActive} />
      </div>
    </div>
  );
}

export default CameraTest;
