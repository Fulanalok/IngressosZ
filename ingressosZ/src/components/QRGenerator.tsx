import { useState } from "react";
import { QRCodeService } from "../services/qrCodeService";

interface QRGeneratorProps {
  onGenerate?: (qrData: string) => void;
}

function QRGenerator({ onGenerate }: QRGeneratorProps) {
  const [ticketId, setTicketId] = useState("test-ticket-123");
  const [eventId, setEventId] = useState("test-event-456");
  const [qrCode, setQrCode] = useState("qr-test-123");
  const [generatedQR, setGeneratedQR] = useState<string>("");
  const [qrImage, setQrImage] = useState<string>("");

  const handleGenerate = async () => {
    try {
      const qrData = QRCodeService.generateTicketQRData(
        ticketId,
        qrCode,
        eventId
      );
      const qrImageUrl = await QRCodeService.generateQRCode(qrData);

      setGeneratedQR(qrData);
      setQrImage(qrImageUrl);

      if (onGenerate) {
        onGenerate(qrData);
      }
    } catch (error) {
      console.error("Erro ao gerar QR:", error);
    }
  };

  const generateRandomData = () => {
    const randomId = Math.random().toString(36).substring(2, 15);
    setTicketId(`ticket-${randomId}`);
    setEventId(`event-${randomId}`);
    setQrCode(`qr-${randomId}`);
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        🎛️ Gerador de QR Codes
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ticket ID
          </label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="input-field"
            placeholder="ID do ingresso"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event ID
          </label>
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="input-field"
            placeholder="ID do evento"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QR Code
          </label>
          <input
            type="text"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            className="input-field"
            placeholder="Código QR"
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleGenerate}
    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-none font-medium transition-colors">
            🔄 Gerar QR Code
          </button>
          <button
            onClick={generateRandomData}
    className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-none font-medium transition-colors">
            🎲
          </button>
        </div>

        {qrImage && (
  <div className="mt-6 p-4 bg-white border-2 border-gray-200 rounded-none">
            <div className="text-center">
              <img
                src={qrImage}
                alt="QR Code Gerado"
                className="mx-auto mb-3"
              />
              <div className="text-xs text-gray-500 font-mono break-all">
                {generatedQR}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QRGenerator;
