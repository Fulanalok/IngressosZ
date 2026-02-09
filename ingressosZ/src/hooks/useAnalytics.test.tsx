import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAnalytics } from "./useAnalytics";
import { eventService, paymentService } from "../services/firestore";
import { toast } from "sonner";

vi.mock("../services/firestore", () => ({
  eventService: {
    getAdminEvents: vi.fn(),
  },
  paymentService: {
    getAllPayments: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("useAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and processes analytics data successfully", async () => {
    const mockEvents = [
      { id: "e1", title: "Event 1" },
      { id: "e2", title: "Event 2" },
    ];
    const mockPayments = [
      {
        eventId: "e1",
        totalAmount: 100,
        quantity: 2,
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        eventId: "e1",
        totalAmount: 50,
        quantity: 1,
        createdAt: { seconds: 1704192000 }, // 2024-01-02
      },
    ];

    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    (paymentService.getAllPayments as any).mockResolvedValue(mockPayments);

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    const data = result.current.data;
    expect(data).toBeTruthy();
    expect(data?.totalRevenue).toBe(150);
    expect(data?.totalTicketsSold).toBe(3);
    expect(data?.totalEvents).toBe(2);
    expect(data?.averageTicketPrice).toBe(150 / 3);

    expect(data?.salesByEvent["e1"]).toEqual({
      revenue: 150,
      tickets: 3,
      title: "Event 1",
    });
  });

  it("handles error during fetch", async () => {
    (eventService.getAdminEvents as any).mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load analytics data.");
    expect(toast.error).toHaveBeenCalledWith("Could not load analytics.");
  });

  it("handles unknown event in payments", async () => {
    const mockEvents: any[] = [];
    const mockPayments = [
      {
        eventId: "unknown",
        totalAmount: 100,
        quantity: 1,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    (paymentService.getAllPayments as any).mockResolvedValue(mockPayments);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.salesByEvent["unknown"].title).toBe(
      "Evento Desconhecido"
    );
  });

  it("handles different date formats", async () => {
    const mockEvents = [{ id: "e1", title: "Event 1" }];
    const mockPayments = [
      {
        eventId: "e1",
        totalAmount: 10,
        quantity: 1,
        createdAt: "2024-01-01T10:00:00Z",
      }, // String ISO
      {
        eventId: "e1",
        totalAmount: 20,
        quantity: 1,
        createdAt: { seconds: 1704153600 },
      }, // Timestamp (2024-01-02 approx)
      { eventId: "e1", totalAmount: 30, quantity: 1, createdAt: null }, // Null - should continue
      { eventId: "e1", totalAmount: 40, quantity: 1, createdAt: 12345 }, // Number - should continue
    ];

    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    (paymentService.getAllPayments as any).mockResolvedValue(mockPayments);

    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const dailySales = result.current.data?.dailySales || [];
    // Should have 2 entries (2024-01-01 and 2024-01-02)
    expect(dailySales).toHaveLength(2);
  });
});
