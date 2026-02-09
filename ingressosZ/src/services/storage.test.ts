import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageService } from "./storage";

// Mock firebase/storage
vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

// Mock firebaseConfig
vi.mock("../firebaseConfig", () => ({
  storage: {},
}));

describe("storageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("uploadEventImage", () => {
    it("should upload a file and return the optimized URL", async () => {
      // Arrange
      vi.spyOn(Date, "now").mockReturnValue(123456);
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const mockFile = new File(["test content"], "test.png", {
        type: "image/png",
      });
      const mockSnapshot = { ref: {} };

      // 0.5.toString(36) is "0.i" -> substring(2,9) is "i"
      const expectedOriginalName = "123456_i.png";
      const mockUrl = `https://firebasestorage.googleapis.com/v0/b/app.appspot.com/o/events%2F${expectedOriginalName}?alt=media&token=123`;

      (ref as any).mockReturnValue({});
      (uploadBytes as any).mockResolvedValue(mockSnapshot);
      (getDownloadURL as any).mockResolvedValue(mockUrl);

      // Act
      const result = await storageService.uploadEventImage(mockFile);

      // Assert
      expect(ref).toHaveBeenCalled();
      expect(uploadBytes).toHaveBeenCalledWith(expect.anything(), mockFile);
      expect(getDownloadURL).toHaveBeenCalledWith(mockSnapshot.ref);

      // Check if it replaced .png with _1080.webp in the path
      expect(result).toContain("_1080.webp");
    });

    it("should throw an error if no file is provided", async () => {
      // Act & Assert
      await expect(
        storageService.uploadEventImage(null as any)
      ).rejects.toThrow("Nenhum arquivo fornecido");
    });

    it("should handle upload errors", async () => {
      // Arrange
      const mockFile = new File(["test"], "test.png", { type: "image/png" });
      (uploadBytes as any).mockRejectedValue(new Error("Upload failed"));

      // Act & Assert
      await expect(storageService.uploadEventImage(mockFile)).rejects.toThrow(
        "Upload failed"
      );
    });
  });

  describe("uploadUserAvatar", () => {
    it("should upload avatar successfully", async () => {
      const mockFile = new File(["test"], "avatar.png", { type: "image/png" });
      const mockUrl = "https://example.com/avatar.png";

      (uploadBytes as any).mockResolvedValue({ ref: {} });
      (getDownloadURL as any).mockResolvedValue(mockUrl);

      const result = await storageService.uploadUserAvatar("user123", mockFile);
      expect(result).toBe(mockUrl);
    });

    it("should throw if no file provided", async () => {
      await expect(
        storageService.uploadUserAvatar("user123", null as any)
      ).rejects.toThrow("Nenhum arquivo fornecido");
    });

    it("should throw if file is too large", async () => {
      // 3MB file
      const largeFile = {
        name: "large.png",
        size: 3 * 1024 * 1024,
      } as File;

      await expect(
        storageService.uploadUserAvatar("user123", largeFile)
      ).rejects.toThrow("A imagem deve ter no máximo 2MB");
    });

    it("should handle upload errors", async () => {
      const mockFile = new File(["test"], "avatar.png", { type: "image/png" });
      (uploadBytes as any).mockRejectedValue(new Error("Upload failed"));
      await expect(
        storageService.uploadUserAvatar("user123", mockFile)
      ).rejects.toThrow("Upload failed");
    });
  });
});
