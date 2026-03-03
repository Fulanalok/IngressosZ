import { addDoc, collection } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkIfEventsExist, seedSampleEvents } from "./seedData";

// Mock firebase
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
}));

vi.mock("../firebaseConfig", () => ({
  db: {},
  auth: {
    currentUser: {
      uid: "user123",
    },
  },
}));

describe("seedData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("seedSampleEvents", () => {
    it("adds events to firestore", async () => {
      (addDoc as any).mockResolvedValue({ id: "new-doc-id" });

      const ids = await seedSampleEvents();

      expect(ids).toHaveLength(6); // 6 sample events in file
      expect(collection).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalledTimes(6);
    });

    it("throws if user not authenticated", async () => {
      const originalAuth = await import("../firebaseConfig").then(
        (m) => m.auth
      );
      (originalAuth as any).currentUser = null;

      await expect(seedSampleEvents()).rejects.toThrow(
        "Usuário não autenticado"
      );

      // Restore
      (originalAuth as any).currentUser = { uid: "user123" };
    });

    it("handles errors during addition", async () => {
      (addDoc as any).mockRejectedValue(new Error("Firestore error"));

      await expect(seedSampleEvents()).rejects.toThrow("Firestore error");
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("checkIfEventsExist", () => {
    it("returns false (placeholder implementation)", async () => {
      const result = await checkIfEventsExist();
      expect(result).toBe(false);
    });

    // If the function logic changes to actually check, we would add more tests here
  });
});
