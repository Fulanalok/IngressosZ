import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  startAfter,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminService,
  eventService,
  paymentService,
  purchaseService,
  ticketService,
  userService,
} from "./firestore";

// Mock firebase/firestore
vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  increment: vi.fn(),
  serverTimestamp: vi.fn(),
}));

// Mock firebase/functions
vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

// Mock firebaseConfig
vi.mock("../firebaseConfig", () => ({
  db: {},
  functions: {},
}));

describe("Firestore Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("adminService", () => {
    it("getDashboardStats calculates stats correctly and sorts by date", async () => {
      const mockTickets = [
        {
          data: () => ({
            price: 100,
            status: "active",
            purchaseDate: "2023-01-02T10:00:00Z",
          }),
        },
        {
          data: () => ({
            price: 50,
            status: "used",
            purchaseDate: "2023-01-01T11:00:00Z",
          }),
        },
        {
          data: () => ({
            price: 200,
            status: "cancelled",
            purchaseDate: "2023-01-03T10:00:00Z",
          }),
        },
        {
          data: () => ({
            status: "active",
            purchaseDate: "2023-01-02T10:00:00Z",
          }),
        }, // No price
      ];
      (getDocs as any).mockResolvedValue({ docs: mockTickets });

      const stats = await adminService.getDashboardStats();

      expect(stats.totalRevenue).toBe(150);
      expect(stats.salesByDate).toHaveLength(2);
      expect(stats.salesByDate[0].date).toBe("2023-01-01");
      expect(stats.salesByDate[1].date).toBe("2023-01-02");
    });
  });

  describe("eventService", () => {
    it("getEvents returns paginated events", async () => {
      const mockEvents = [
        { id: "1", data: () => ({ title: "Event 1" }) },
        { id: "2", data: () => ({ title: "Event 2" }) },
      ];
      (getDocs as any).mockResolvedValue({ docs: mockEvents });

      const result = await eventService.getEvents(10);
      expect(result.events).toHaveLength(2);
      expect(result.lastVisible).toBeDefined();
    });

    it("getEvents handles pagination with lastDoc", async () => {
      const mockEvents = [{ id: "3", data: () => ({ title: "Event 3" }) }];
      (getDocs as any).mockResolvedValue({ docs: mockEvents });
      const lastDoc = { id: "2" } as any;

      const result = await eventService.getEvents(10, lastDoc);
      expect(startAfter).toHaveBeenCalledWith(lastDoc);
      expect(result.events).toHaveLength(1);
    });

    it("getAdminEvents returns all events", async () => {
      const mockEvents = [{ id: "1", data: () => ({ title: "Event 1" }) }];
      (getDocs as any).mockResolvedValue({ docs: mockEvents });

      const events = await eventService.getAdminEvents();
      expect(events).toHaveLength(1);
    });

    it("getEventById returns event if exists", async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: "1",
        data: () => ({ title: "Event 1" }),
      });
      const event = await eventService.getEventById("1");
      expect(event).toEqual({ id: "1", title: "Event 1" });
    });

    it("getEventById returns null if not exists", async () => {
      (getDoc as any).mockResolvedValue({ exists: () => false });
      const event = await eventService.getEventById("1");
      expect(event).toBeNull();
    });

    it("createEvent adds doc", async () => {
      (addDoc as any).mockResolvedValue({ id: "new-id" });
      const id = await eventService.createEvent({ title: "New Event" } as any);
      expect(id).toBe("new-id");
      expect(addDoc).toHaveBeenCalled();
    });

    it("updateEvent updates doc", async () => {
      await eventService.updateEvent("1", { title: "Updated" });
      expect(updateDoc).toHaveBeenCalled();
    });

    it("deleteEvent deletes doc", async () => {
      await eventService.deleteEvent("1");
      expect(deleteDoc).toHaveBeenCalled();
    });

    it("decrementAvailableTickets updates doc", async () => {
      await eventService.decrementAvailableTickets("1", 2);
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe("ticketService", () => {
    it("getUserTickets returns tickets", async () => {
      const mockTickets = [{ id: "t1", data: () => ({ status: "active" }) }];
      (getDocs as any).mockResolvedValue({ docs: mockTickets });
      const tickets = await ticketService.getUserTickets("u1");
      expect(tickets).toHaveLength(1);
    });

    it("getTicketById returns ticket if exists", async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: "t1",
        data: () => ({ status: "active" }),
      });
      const ticket = await ticketService.getTicketById("t1");
      expect(ticket).toBeDefined();
    });

    it("getTicketById returns null if not exists", async () => {
      (getDoc as any).mockResolvedValue({ exists: () => false });
      const ticket = await ticketService.getTicketById("t1");
      expect(ticket).toBeNull();
    });

    it("subscribeToUserTickets calls onSnapshot and handles data", () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      (onSnapshot as any).mockImplementation(
        (_q: any, successCb: any, _errorCb: any) => {
          successCb({
            docs: [{ id: "t1", data: () => ({ status: "active" }) }],
          });
          return vi.fn();
        }
      );

      ticketService.subscribeToUserTickets("u1", onSuccess, onError);

      expect(onSnapshot).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith([
        expect.objectContaining({ id: "t1" }),
      ]);
    });

    it("subscribeToUserTickets handles errors", () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const error = new Error("Subscription failed");

      (onSnapshot as any).mockImplementation(
        (_q: any, _successCb: any, errorCb: any) => {
          errorCb(error);
          return vi.fn();
        }
      );

      ticketService.subscribeToUserTickets("u1", onSuccess, onError);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it("createTicket adds doc", async () => {
      (addDoc as any).mockResolvedValue({ id: "t1" });
      const id = await ticketService.createTicket({ eventId: "e1" } as any);
      expect(id).toBe("t1");
    });

    it("getTicketForValidation returns valid ticket", async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: "t1",
        data: () => ({ qrCode: "valid-qr" }),
      });
      const ticket = await ticketService.getTicketForValidation(
        "t1",
        "valid-qr"
      );
      expect(ticket).toBeDefined();
    });

    it("getTicketForValidation returns null if doc does not exist", async () => {
      (getDoc as any).mockResolvedValue({ exists: () => false });
      const ticket = await ticketService.getTicketForValidation("t1", "qr");
      expect(ticket).toBeNull();
    });

    it("getTicketForValidation returns null for invalid qr", async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: "t1",
        data: () => ({ qrCode: "valid-qr" }),
      });
      const ticket = await ticketService.getTicketForValidation(
        "t1",
        "invalid-qr"
      );
      expect(ticket).toBeNull();
    });

    it("markTicketAsUsed updates doc", async () => {
      await ticketService.markTicketAsUsed("t1", "validator1");
      expect(updateDoc).toHaveBeenCalled();
    });

    it("getAllTickets returns all tickets", async () => {
      const mockTickets = [{ id: "t1", data: () => ({ status: "active" }) }];
      (getDocs as any).mockResolvedValue({ docs: mockTickets });
      const tickets = await ticketService.getAllTickets();
      expect(tickets).toHaveLength(1);
    });
  });

  describe("userService", () => {
    it("getUserProfile returns profile", async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({ name: "User" }),
      });
      const profile = await userService.getUserProfile("u1");
      expect(profile).toEqual({ name: "User" });
    });

    it("getUserProfile returns null if not exists", async () => {
      (getDoc as any).mockResolvedValue({ exists: () => false });
      const profile = await userService.getUserProfile("u1");
      expect(profile).toBeNull();
    });

    it("createUserProfile sets doc", async () => {
      await userService.createUserProfile("u1", { name: "User" } as any);
      expect(setDoc).toHaveBeenCalled();
    });

    it("onUserProfileSnapshot calls onSnapshot and returns profile if exists", () => {
      const callback = vi.fn();
      (onSnapshot as any).mockImplementation((_ref: any, cb: any) => {
        cb({ exists: () => true, data: () => ({ name: "User" }) });
        return vi.fn();
      });

      userService.onUserProfileSnapshot("u1", callback);
      expect(callback).toHaveBeenCalledWith({ name: "User" });
    });

    it("onUserProfileSnapshot calls onSnapshot and returns null if not exists", () => {
      const callback = vi.fn();
      (onSnapshot as any).mockImplementation((_ref: any, cb: any) => {
        cb({ exists: () => false });
        return vi.fn();
      });

      userService.onUserProfileSnapshot("u1", callback);
      expect(callback).toHaveBeenCalledWith(null);
    });

    it("updateUserProfile updates doc", async () => {
      await userService.updateUserProfile("u1", { name: "New Name" } as any);
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe("purchaseService", () => {
    it("getAllPurchases returns purchases", async () => {
      const mockPurchases = [{ id: "p1", data: () => ({ total: 100 }) }];
      (getDocs as any).mockResolvedValue({ docs: mockPurchases });
      const purchases = await purchaseService.getAllPurchases();
      expect(purchases).toHaveLength(1);
    });

    it("refundPurchase calls callable function", async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: { success: true } });
      (httpsCallable as any).mockReturnValue(mockFn);

      const result = await purchaseService.refundPurchase("pay1");
      expect(mockFn).toHaveBeenCalledWith({ paymentId: "pay1" });
      expect(result).toEqual({ success: true });
    });
  });

  describe("paymentService", () => {
    it("getAllPayments returns payments", async () => {
      const mockPayments = [
        { id: "pay1", data: () => ({ status: "approved" }) },
      ];
      (getDocs as any).mockResolvedValue({ docs: mockPayments });
      const payments = await paymentService.getAllPayments();
      expect(payments).toHaveLength(1);
    });
  });
});
