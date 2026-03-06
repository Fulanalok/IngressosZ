import QRCode from "qrcode";
export class QRCodeService {
    /**
     * Gerar QR code como Data URL (base64)
     */
    static async generateQRCode(data) {
        try {
            const qrCodeDataURL = await QRCode.toDataURL(data, {
                width: 200,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#FFFFFF",
                },
                errorCorrectionLevel: "M",
            });
            return qrCodeDataURL;
        }
        catch (error) {
            console.error("Erro ao gerar QR code:", error);
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Falha ao gerar QR code: ${msg}`);
        }
    }
    /**
     * Gerar QR code como SVG
     */
    static async generateQRCodeSVG(data) {
        try {
            const qrCodeSVG = await QRCode.toString(data, {
                type: "svg",
                width: 200,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#FFFFFF",
                },
                errorCorrectionLevel: "M",
            });
            return qrCodeSVG;
        }
        catch (error) {
            console.error("Erro ao gerar QR code SVG:", error);
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Falha ao gerar QR code SVG: ${msg}`);
        }
    }
    /**
     * Gerar dados do QR code para ingresso
     */
    static generateTicketQRData(ticketId, qrCode, eventId) {
        const qrData = {
            ticketId,
            qrCode,
            eventId,
            timestamp: Date.now(),
            type: "INGRESSOSZ_TICKET",
        };
        return JSON.stringify(qrData);
    }
    /**
     * Validar e extrair dados do QR code
     */
    static parseTicketQRData(qrData) {
        try {
            const parsed = JSON.parse(qrData);
            if (parsed.type !== "INGRESSOSZ_TICKET") {
                throw new Error("QR code inválido");
            }
            return {
                ticketId: parsed.ticketId,
                qrCode: parsed.qrCode,
                eventId: parsed.eventId,
                timestamp: parsed.timestamp,
                type: parsed.type,
            };
        }
        catch (error) {
            console.error("Erro ao parsear QR code:", error);
            return null;
        }
    }
    static downloadQRCode(dataUrl, fileName = "qr-code.png") {
        if (!dataUrl) {
            return;
        }
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}
