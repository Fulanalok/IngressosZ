import { useState, useEffect } from "react";
import { QRCodeService } from "../services/qrCodeService";

interface QRCodeDisplayProps {
  qrCode: string;
  size?: number;
}

function QRCodeDisplay({
  qrCode,
  size = 200,
}: QRCodeDisplayProps) {
  const [qrCodeImage, setQrCodeImage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Gerar dados do QR code
        const qrImage = await QRCodeService.generateQRCode(qrCode);
        setQrCodeImage(qrImage);
      } catch (err) {
        console.error("Erro ao gerar QR code:", err);
        setError("Erro ao gerar QR code");
      } finally {
        setIsLoading(false);
      }
    };

    generateQRCode();
  }, [qrCode]);

  if (isLoading) {
    return (
      <div
    className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-none flex items-center justify-center"
        style={{ width: size, height: size }}>
        <div className="text-center text-gray-500">
        <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
          <div className="text-xs">Gerando QR</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
    className="bg-red-50 border-2 border-red-200 rounded-none flex items-center justify-center"
        style={{ width: size, height: size }}>
        <div className="text-center text-red-600">
          <div className="text-xs">Erro no QR</div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div
    className="bg-white border-2 border-gray-200 rounded-none p-2 inline-block shadow-sm"
        style={{ width: size + 16, height: size + 16 }}>
        <img
          src={qrCodeImage}
          alt="QR Code do Ingresso"
          className="w-full h-full object-contain"
          style={{ width: size, height: size }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">QR Code do Ingresso</p>
    </div>
  );
}

export default QRCodeDisplay;
