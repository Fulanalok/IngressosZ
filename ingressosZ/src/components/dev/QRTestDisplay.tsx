import { useEffect, useState } from "react";
import { QRCodeService } from '@/services/qrCodeService';

interface QRTestDisplayProps {
  ticketId?: string;
  eventId?: string;
}

function QRTestDisplay({
  ticketId = "test-ticket-123",
  eventId = "test-event-456",
}: QRTestDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrData, setQrData] = useState<string>("");

  useEffect(() => {
    const generateTestQR = async () => {
      try {
        // Gerar dados do QR code
        const qrData = `qr-${ticketId}`;

        setQrData(qrData);

        // Gerar imagem do QR code
        const qrUrl = await QRCodeService.generateQRCode(qrData);
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error("Erro ao gerar QR code de teste:", error);
      }
    };

    generateTestQR();
  }, [ticketId, eventId]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-none shadow-lg p-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          QR Code de Teste
        </h3>
        <p className="text-gray-600 mb-4">
          Use este QR code para testar o scanner e a validação
        </p>

        {qrCodeUrl ? (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              <img
                src={qrCodeUrl}
                alt="QR Code de Teste"
                className="w-64 h-64 mx-auto"
              />
            </div>

            <div className="text-xs text-gray-500 space-y-2">
              <div className="font-mono bg-gray-100 p-2 rounded-none text-left break-all">
                <strong>Token usado na validação:</strong> {qrData}
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-none">
              <p className="text-sm text-blue-800">
                <strong>Como testar:</strong>
              </p>
              <ol className="text-xs text-blue-700 mt-1 space-y-1">
                <li>1. Abra uma nova aba do navegador</li>
                <li>2. Vá para a página do Validador</li>
                <li>3. Clique em "Scan QR"</li>
                <li>4. Aponte a câmera para este QR code na tela</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Gerando QR code...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QRTestDisplay;
