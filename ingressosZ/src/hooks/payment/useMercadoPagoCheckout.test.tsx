import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMercadoPagoCheckout } from "./useMercadoPagoCheckout";

const mockNavigate = vi.fn();
const {
  createSessionCallable,
  createPreferenceCallable,
  createPixCallable,
} = vi.hoisted(() => ({
  createSessionCallable: vi.fn(),
  createPreferenceCallable: vi.fn(),
  createPixCallable: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>(
    "react-router"
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/firebaseConfig", () => ({ functions: {} }));

vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn((_functions: unknown, name: string) => {
    if (name === "createPaymentSession") return createSessionCallable;
    if (name === "createPaymentPreference") return createPreferenceCallable;
    if (name === "createPixPayment") return createPixCallable;
    throw new Error(`Callable inesperada: ${name}`);
  }),
}));

const event = {
  id: "e1",
  title: "Evento",
  price: 100,
  pricing: { vip: 150 },
} as any;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("useMercadoPagoCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSessionCallable.mockResolvedValue({
      data: { paymentSessionId: "ps1", expiresAt: {} },
    });
    createPreferenceCallable.mockResolvedValue({ data: { id: "pref-123" } });
    createPixCallable.mockResolvedValue({
      data: {
        id: "pix-123",
        status: "pending",
        qrCode: "qr-code",
        qrCodeBase64: "base64",
        ticketUrl: "ticket-url",
      },
    });
  });

  it("nao inicia pagamento quando falta usuario autenticado", async () => {
    const { result } = renderHook(
      () => useMercadoPagoCheckout(event, "standard", 1, "", ""),
      { wrapper }
    );
    await act(async () => result.current.createPreference());
    expect(result.current.error).toBe("Faca login para continuar.");
    expect(createSessionCallable).not.toHaveBeenCalled();
  });

  it("cria sessao antes da preferencia e envia somente paymentSessionId", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(
      () => useMercadoPagoCheckout(event, "vip", 2, "u1", "e@example.com"),
      { wrapper }
    );

    await act(async () => result.current.createPreference());

    expect(createSessionCallable).toHaveBeenCalledWith({
      eventId: "e1",
      ticketType: "vip",
      quantity: 2,
      paymentMethod: "checkout",
    });
    expect(createPreferenceCallable).toHaveBeenCalledWith({
      paymentSessionId: "ps1",
    });
    expect(createSessionCallable.mock.invocationCallOrder[0]).toBeLessThan(
      createPreferenceCallable.mock.invocationCallOrder[0]
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.preferenceId).toBe("pref-123");
  });

  it("envia somente paymentSessionId para Pix e preserva QR Code", async () => {
    const { result } = renderHook(
      () => useMercadoPagoCheckout(event, "standard", 1, "u1", "e@example.com"),
      { wrapper }
    );

    await act(async () => result.current.createPixPayment());

    expect(createSessionCallable).toHaveBeenCalledWith({
      eventId: "e1",
      ticketType: "standard",
      quantity: 1,
      paymentMethod: "pix",
    });
    expect(createPixCallable).toHaveBeenCalledWith({ paymentSessionId: "ps1" });
    expect(result.current.pixData).toEqual(
      expect.objectContaining({ paymentId: "pix-123", qrCode: "qr-code" })
    );
  });

  it("preserva mensagem de erro e encerra loading", async () => {
    createSessionCallable.mockRejectedValueOnce(
      new Error("Ingressos indisponiveis.")
    );
    const { result } = renderHook(
      () => useMercadoPagoCheckout(event, "standard", 1, "u1", "e@example.com"),
      { wrapper }
    );

    await act(async () => result.current.createPreference());

    expect(result.current.error).toBe("Ingressos indisponiveis.");
    expect(result.current.isLoading).toBe(false);
    expect(createPreferenceCallable).not.toHaveBeenCalled();
  });

  it("clique repetido nao inicia duas operacoes", async () => {
    let release!: () => void;
    createSessionCallable.mockImplementationOnce(
      () => new Promise((resolve) => {
        release = () => resolve({
          data: { paymentSessionId: "ps1", expiresAt: {} },
        });
      })
    );
    const { result } = renderHook(
      () => useMercadoPagoCheckout(event, "standard", 1, "u1", "e@example.com"),
      { wrapper }
    );

    let first!: Promise<void>;
    await act(async () => {
      first = result.current.createPreference();
      void result.current.createPreference();
      await Promise.resolve();
    });
    expect(createSessionCallable).toHaveBeenCalledTimes(1);
    release();
    await act(async () => first);
  });

  it("processa sucesso de pagamento e navega", async () => {
    const { result } = renderHook(
      () => useMercadoPagoCheckout(event, "standard", 2, "u1", "e@example.com"),
      { wrapper }
    );
    await act(async () => result.current.handlePaymentSuccess("pay-1"));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/pagamento/sucesso?payment_id=pay-1"
      );
    });
  });
});
