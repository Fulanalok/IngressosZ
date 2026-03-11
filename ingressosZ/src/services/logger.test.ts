import { beforeEach, describe, expect, it, vi } from "vitest";
import { postClientError } from "./logger";
vi.mock("../firebaseConfig", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("token-abc"),
    },
  },
}));

describe("postClientError", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends Authorization when id token is available", async () => {
    const spy = vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as unknown as Response);
    await postClientError({ type: "t", message: "m" });
    const call = spy.mock.calls[0]!;
    expect(String(call[0])).toMatch(/\/logClientError$/);
    const mod = await import("../firebaseConfig");
    expect(typeof mod.auth.currentUser!.getIdToken).toBe("function");
    expect(mod.auth.currentUser!.getIdToken).toHaveBeenCalled();
    const headers = call[1]!.headers as Record<string, string>;
    const idem =
      headers["X-Idempotency-Key"] ||
      (headers as unknown as Map<string, string>).get?.("X-Idempotency-Key");
    expect(idem).toBeDefined();
  });

  it("does not throw when user is unauthenticated", async () => {
    const mod = await import("../firebaseConfig");
    // @ts-expect-error Mocking read-only property
    mod.auth.currentUser = null;
    const spy = vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as unknown as Response);
    await postClientError({ type: "t2", message: "m2" });
    const headers = spy.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("retries once on 500 then succeeds", async () => {
    const fetchMock = vi
      .spyOn(window, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as unknown as Response);
    await postClientError({ type: "retry", message: "m" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
