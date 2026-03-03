import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { paymentService } from "../services/firestore";
import { useAnalytics } from "./useAnalytics";

vi.mock("../services/firestore", () => ({
  paymentService: {
    getAllPayments: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processa pagamentos aprovados e calcula totais", async () => {
    const mockPayments = [
      {
        status: "approved",
        totalAmount: 100,
        quantity: 2,
        createdAt: { seconds: 1704067200 },
      },
      {
        status: "approved",
        totalAmount: 50,
        quantity: 1,
        createdAt: { seconds: 1704153600 },
      },
    ];

    (paymentService.getAllPayments as any).mockResolvedValue(mockPayments);

    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.totalRevenue).toBe(150);
    expect(result.current.totalTicketsSold).toBe(3);
    expect(result.current.dailyChartData).toHaveLength(2);
    expect(result.current.hasData).toBe(true);
  });

  it("retorna zero quando não há pagamentos", async () => {
    (paymentService.getAllPayments as any).mockResolvedValue([]);

    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalRevenue).toBe(0);
    expect(result.current.totalTicketsSold).toBe(0);
    expect(result.current.dailyChartData).toHaveLength(0);
    expect(result.current.hasData).toBe(false);
  });

  it("expõe erro quando a consulta falha", async () => {
    (paymentService.getAllPayments as any).mockRejectedValue(
      new Error("Fetch failed")
    );

    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe("Fetch failed");
  });
});
