import { beforeEach, describe, expect, it, vi } from "vitest";
import { postClientError } from "./logger";

const callableMock = vi.fn().mockResolvedValue({ data: { success: true } });

vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(() => callableMock),
}));

vi.mock("../firebaseConfig", () => ({
  auth: {
    currentUser: {
      uid: "u1",
    },
  },
  functions: {},
}));

describe("postClientError", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    callableMock.mockClear();
  });

  it("envia payload com uid quando autenticado", async () => {
    await postClientError({ type: "t", message: "m" });
    expect(callableMock).toHaveBeenCalled();
    const payload = callableMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.uid).toBe("u1");
  });

  it("usa uid anonymous quando não há usuário", async () => {
    const mod = await import("../firebaseConfig");
    // @ts-expect-error Mocking read-only property
    mod.auth.currentUser = null;
    await postClientError({ type: "t2", message: "m2" });
    const payload = callableMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.uid).toBe("anonymous");
  });

  it("não lança erro quando callable falha", async () => {
    callableMock.mockRejectedValueOnce(new Error("falha"));
    await postClientError({ type: "retry", message: "m" });
    expect(callableMock).toHaveBeenCalled();
  });
});
