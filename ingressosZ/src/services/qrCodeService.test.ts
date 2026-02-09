import QRCode from "qrcode";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QRCodeService } from "./qrCodeService";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(),
    toString: vi.fn(),
  },
}));

describe("QRCodeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateQRCode", () => {
    it("should generate Data URL successfully", async () => {
      const mockDataUrl = "data:image/png;base64,mock";
      (QRCode.toDataURL as any).mockResolvedValue(mockDataUrl);

      const result = await QRCodeService.generateQRCode("test-data");

      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        "test-data",
        expect.objectContaining({
          width: 200,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        })
      );
      expect(result).toBe(mockDataUrl);
    });

    it("should throw error when generation fails", async () => {
      (QRCode.toDataURL as any).mockRejectedValue(
        new Error("Generation failed")
      );

      await expect(QRCodeService.generateQRCode("test-data")).rejects.toThrow(
        "Falha ao gerar QR code: Generation failed"
      );
    });

    it("should throw error when generation fails (non-Error object)", async () => {
      (QRCode.toDataURL as any).mockRejectedValue("Unknown error");

      await expect(QRCodeService.generateQRCode("test-data")).rejects.toThrow(
        "Falha ao gerar QR code: Unknown error"
      );
    });
  });

  describe("generateQRCodeSVG", () => {
    it("should generate SVG successfully", async () => {
      const mockSvg = "<svg>...</svg>";
      (QRCode.toString as any).mockResolvedValue(mockSvg);

      const result = await QRCodeService.generateQRCodeSVG("test-data");

      expect(QRCode.toString).toHaveBeenCalledWith(
        "test-data",
        expect.objectContaining({
          type: "svg",
          width: 200,
        })
      );
      expect(result).toBe(mockSvg);
    });

    it("should throw error when generation fails", async () => {
      (QRCode.toString as any).mockRejectedValue(new Error("SVG failed"));

      await expect(
        QRCodeService.generateQRCodeSVG("test-data")
      ).rejects.toThrow("Falha ao gerar QR code SVG: SVG failed");
    });

    it("should throw error when generation fails (non-Error object)", async () => {
      (QRCode.toString as any).mockRejectedValue("Unknown error");

      await expect(
        QRCodeService.generateQRCodeSVG("test-data")
      ).rejects.toThrow("Falha ao gerar QR code SVG: Unknown error");
    });
  });

  describe("generateTicketQRData", () => {
    it("should generate correct JSON string", () => {
      const ticketId = "t1";
      const qrCode = "code123";
      const eventId = "e1";

      const result = QRCodeService.generateTicketQRData(
        ticketId,
        qrCode,
        eventId
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(
        expect.objectContaining({
          ticketId,
          qrCode,
          eventId,
          type: "INGRESSOSZ_TICKET",
        })
      );
      expect(parsed.timestamp).toBeDefined();
    });
  });

  describe("parseTicketQRData", () => {
    it("should parse valid QR data", () => {
      const data = JSON.stringify({
        ticketId: "t1",
        qrCode: "code123",
        eventId: "e1",
        timestamp: 123456,
        type: "INGRESSOSZ_TICKET",
      });

      const result = QRCodeService.parseTicketQRData(data);

      expect(result).toEqual({
        ticketId: "t1",
        qrCode: "code123",
        eventId: "e1",
        timestamp: 123456,
        type: "INGRESSOSZ_TICKET",
      });
    });

    it("should return null for invalid JSON", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = QRCodeService.parseTicketQRData("{invalid-json");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should return null for incorrect type", () => {
      const data = JSON.stringify({
        ticketId: "t1",
        type: "OTHER_TYPE",
      });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = QRCodeService.parseTicketQRData(data);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled(); // Should catch the error thrown manually
    });
  });
});
