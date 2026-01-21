import { useState, useRef, useEffect } from "react";

function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
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
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      const error = err as Error;

      if (error.name === "NotAllowedError") {
        setError(
          "❌ Acesso à câmera negado. Clique no ícone de câmera na barra de endereço e permita o acesso."
        );
      } else if (error.name === "NotFoundError") {
        setError("❌ Nenhuma câmera encontrada no dispositivo.");
      } else if (error.name === "NotReadableError") {
        setError("❌ Câmera está sendo usada por outro aplicativo.");
      } else {
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

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        🔍 Teste de Câmera
      </h3>

      <div className="space-y-4">
        <div className="flex space-x-3">
          <button
            onClick={startCamera}
            disabled={isActive}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isActive
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}>
            {isActive ? "✅ Câmera Ativa" : "🎥 Ligar Câmera"}
          </button>

          <button
            onClick={stopCamera}
            disabled={!isActive}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              !isActive
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}>
            🛑 Parar Câmera
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>

            <div className="mt-3 bg-red-100 p-3 rounded text-xs text-red-700">
              <strong>Passos para resolver:</strong>
              <ol className="mt-1 space-y-1">
                <li>1. Clique no ícone 🔒 ou 📷 na barra de endereço</li>
                <li>2. Selecione "Permitir" para câmera</li>
                <li>3. Recarregue a página se necessário</li>
                <li>4. Tente novamente</li>
              </ol>
            </div>
          </div>
        )}

        <div
          className="relative bg-black rounded-lg overflow-hidden"
          style={{ aspectRatio: "16/9" }}>
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
                <div className="text-6xl mb-4">📷</div>
                <p>Clique em "Ligar Câmera" para testar</p>
              </div>
            </div>
          )}

          {isActive && (
            <div className="absolute top-2 right-2">
              <div className="bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                AO VIVO
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Informações</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <strong>Status:</strong> {isActive ? "🟢 Ativa" : "🔴 Inativa"}
            </p>
            <p>
              <strong>Navegador:</strong>{" "}
              {navigator.userAgent.includes("Chrome")
                ? "Chrome"
                : navigator.userAgent.includes("Firefox")
                ? "Firefox"
                : "Outro"}
            </p>
            <p>
              <strong>HTTPS:</strong>{" "}
              {location.protocol === "https:"
                ? "✅ Sim"
                : "❌ Não (pode afetar algumas funcionalidades)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraTest;
