import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventService } from "../../services/firestore";
import { useEvent, useEvents } from "./useEvents";

// Mock eventService
vi.mock("../../services/firestore", () => ({
  eventService: {
    getEvents: vi.fn(),
    getEventById: vi.fn(),
  },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
}));

vi.mock("../../firebaseConfig", () => ({
  db: {},
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

describe("useEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches events successfully", async () => {
    const mockEvents = {
      events: [{ id: "1", title: "Event 1" }],
      lastVisible: "some-token",
    };
    (eventService.getEvents as any).mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe("success"));

    expect(result.current.data).toEqual(mockEvents.events);
    expect(result.current.error).toBeNull();
  });

  it("handles pagination", async () => {
    const page1 = {
      events: Array(8).fill({ id: "p1", title: "Page 1" }),
      lastVisible: "token-1",
    };
    const page2 = {
      events: [{ id: "p2", title: "Page 2" }],
      lastVisible: null,
    };

    (eventService.getEvents as any)
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toHaveLength(8);
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data).toHaveLength(9));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("handles error", async () => {
    (eventService.getEvents as any).mockRejectedValue(
      new Error("Fetch failed")
    );

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.message).toBe("Fetch failed");
  });
});

describe("useEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single event successfully", async () => {
    const mockEvent = { id: "1", title: "Event 1" };
    (eventService.getEventById as any).mockResolvedValue(mockEvent);

    const { result } = renderHook(() => useEvent("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toEqual(mockEvent);
  });

  it("handles null event (not found)", async () => {
    (eventService.getEventById as any).mockResolvedValue(null);

    const { result } = renderHook(() => useEvent("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toBeNull();
  });

  it("handles error", async () => {
    (eventService.getEventById as any).mockRejectedValue(
      new Error("Fetch failed")
    );

    const { result } = renderHook(() => useEvent("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.message).toBe("Fetch failed");
  });

  it("does not fetch if no id provided", async () => {
    renderHook(() => useEvent(""), {
      wrapper: createWrapper(),
    });

    expect(eventService.getEventById).not.toHaveBeenCalled();
    // In TanStack Query v5, enabled: false means isPending is true, but isLoading is false (if I recall correctly).
    // Or isLoading is true but fetchStatus is idle.
    // Let's just check that it didn't call the service.
  });
});
