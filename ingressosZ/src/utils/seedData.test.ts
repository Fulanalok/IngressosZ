import { getDocs } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkIfEventsExist, seedSampleEvents } from "./seedData";

// Mock firebase
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(),
}));

const { createEvent } = vi.hoisted(() => ({
  createEvent: vi.fn().mockResolvedValue("new-doc-id"),
}));
vi.mock("../services/firestore", () => ({
  eventService: { createEvent },
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
      const ids = await seedSampleEvents();

      expect(ids).toHaveLength(6); // 6 sample events in file
      expect(createEvent).toHaveBeenCalledTimes(6);
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
      createEvent.mockRejectedValueOnce(new Error("Firestore error"));

      await expect(seedSampleEvents()).rejects.toThrow("Firestore error");
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("checkIfEventsExist", () => {
    it("returns true when there are events", async () => {
      (getDocs as any).mockResolvedValue({ empty: false });
      const result = await checkIfEventsExist();
      expect(result).toBe(true);
    });

    it("returns false when there are no events", async () => {
      (getDocs as any).mockResolvedValue({ empty: true });
      const result = await checkIfEventsExist();
      expect(result).toBe(false);
    });

    it("returns false on error", async () => {
      (getDocs as any).mockRejectedValue(new Error("Firestore error"));
      const result = await checkIfEventsExist();
      expect(result).toBe(false);
    });
  });
});
