import { addDoc, getDocs } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestDataService } from "./testDataService";

// Mock firebase/firestore
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
}));

// Mock firebaseConfig
vi.mock("../firebaseConfig", () => ({
  db: {},
  auth: {
    currentUser: {
      uid: "user123",
      email: "test@example.com",
    },
  },
}));

describe("TestDataService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasTestData", () => {
    it("returns true if test events exist", async () => {
      const mockDocs = [
        { data: () => ({ title: "Festival de Música 2024" }) },
        { data: () => ({ title: "Stand-up Comedy Night" }) },
      ];
      (getDocs as any).mockResolvedValue({
        forEach: (cb: any) => mockDocs.forEach(cb),
      });

      const result = await TestDataService.hasTestData();
      expect(result).toBe(true);
    });

    it("returns false if test events do not exist", async () => {
      (getDocs as any).mockResolvedValue({
        forEach: (cb: any) => [].forEach(cb),
      });

      const result = await TestDataService.hasTestData();
      expect(result).toBe(false);
    });

    it("returns false on error", async () => {
      (getDocs as any).mockRejectedValue(new Error("Error"));
      const result = await TestDataService.hasTestData();
      expect(result).toBe(false);
    });
  });

  describe("createTestEvents", () => {
    it("creates events", async () => {
      (addDoc as any).mockResolvedValue({ id: "event1" });
      const ids = await TestDataService.createTestEvents();
      expect(ids).toHaveLength(2); // 2 events in code
      expect(addDoc).toHaveBeenCalledTimes(2);
    });

    it("throws if not authenticated", async () => {
      // Temporarily mock auth to null
      const originalAuth = await import("../firebaseConfig").then(
        (m) => m.auth
      );
      (originalAuth as any).currentUser = null;

      await expect(TestDataService.createTestEvents()).rejects.toThrow(
        "Usuário não autenticado"
      );

      // Restore
      (originalAuth as any).currentUser = {
        uid: "user123",
        email: "test@example.com",
      };
    });
  });

  describe("initializeTestData", () => {
    it("skips if data exists and not forced", async () => {
      vi.spyOn(TestDataService, "hasTestData").mockResolvedValue(true);
      const createSpy = vi.spyOn(TestDataService, "createTestEvents");

      await TestDataService.initializeTestData(false);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("creates data if not exists", async () => {
      vi.spyOn(TestDataService, "hasTestData").mockResolvedValue(false);
      vi.spyOn(TestDataService, "createTestEvents").mockResolvedValue(["e1"]);

      await TestDataService.initializeTestData(false);
      expect(TestDataService.createTestEvents).toHaveBeenCalled();
    });

    it("creates data if forced even if exists", async () => {
      vi.spyOn(TestDataService, "hasTestData").mockResolvedValue(true);
      vi.spyOn(TestDataService, "createTestEvents").mockResolvedValue(["e1"]);

      await TestDataService.initializeTestData(true);
      expect(TestDataService.createTestEvents).toHaveBeenCalled();
    });
  });

  describe("offline methods", () => {
    it("returns offline tickets", () => {
      const tickets = TestDataService.getOfflineTestTickets();
      expect(tickets.length).toBeGreaterThan(0);
    });

    it("validates offline ticket", () => {
      const ticket = TestDataService.validateOfflineTicket(
        "TICKET-1756219017406-fh2k739l1"
      );
      expect(ticket).not.toBeNull();
      expect(ticket?.qrCode).toBe("TICKET-1756219017406-fh2k739l1");
    });

    it("returns null for invalid offline ticket", () => {
      const ticket = TestDataService.validateOfflineTicket("INVALID");
      expect(ticket).toBeNull();
    });
  });
});
