import { describe, it, expect, vi, beforeEach } from "vitest";
import { storageService } from "./storage";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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
  });

  it("should upload a file and return the download URL", async () => {
    // Arrange
    const mockFile = new File(["test content"], "test.png", { type: "image/png" });
    const mockSnapshot = { ref: {} };
    const mockUrl = "https://firebasestorage.googleapis.com/test.png";

    (ref as any).mockReturnValue({});
    (uploadBytes as any).mockResolvedValue(mockSnapshot);
    (getDownloadURL as any).mockResolvedValue(mockUrl);

    // Act
    const result = await storageService.uploadEventImage(mockFile);

    // Assert
    expect(ref).toHaveBeenCalled();
    expect(uploadBytes).toHaveBeenCalledWith(expect.anything(), mockFile);
    expect(getDownloadURL).toHaveBeenCalledWith(mockSnapshot.ref);
    expect(result).toBe(mockUrl);
  });

  it("should throw an error if no file is provided", async () => {
    // Act & Assert
    await expect(storageService.uploadEventImage(null as any)).rejects.toThrow(
      "No file provided"
    );
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
