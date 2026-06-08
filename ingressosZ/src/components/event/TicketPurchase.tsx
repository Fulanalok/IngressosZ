import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import { Button } from "@/components/ui/button";
import { TICKET_TYPES } from "@/constants/ticketTypes";
import { useMercadoPagoCheckout } from "@/hooks/payment/useMercadoPagoCheckout";
import type { Event } from "@/types";
import { StatusScreen, Wallet } from "@mercadopago/sdk-react";
import type { User } from "firebase/auth";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface TicketPurchaseProps {
  event: Event;
  user?: User | null;
  onClose: () => void;
}

export function TicketPurchase({ event, user, onClose }: TicketPurchaseProps) {
  const [selectedTicketType, setSelectedTicketType] = useState<
    "standard" | "vip" | "premium"
  >("standard");
  const [quantity, setQuantity] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");
  const [paymentMethod, setPaymentMethod] = useState<"checkout" | "pix">(
    "checkout"
  );
  const hasPublicKey = Boolean(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);
  const buyerEmail = user?.email || "";

  const {
    createPreference,
    createPixPayment,
    preferenceId,
    pixData,
    isLoading: checkoutLoading,
    error: checkoutError,
  } = useMercadoPagoCheckout(
    event,
    selectedTicketType,
    quantity,
    user?.uid,
    buyerEmail
  );

  const unitPrice = useMemo(() => {
    return event.pricing?.[selectedTicketType] ?? event.price;
  }, [event, selectedTicketType]);

  const totalPrice = useMemo(() => unitPrice * quantity, [unitPrice, quantity]);

  const DEFAULT_MAX_PURCHASE_QUANTITY = 5;
  const maxPerPurchase =
    typeof event.maxPerPurchase === "number" &&
    Number.isInteger(event.maxPerPurchase) &&
    event.maxPerPurchase >= 1 &&
    event.maxPerPurchase <= 50
      ? event.maxPerPurchase
      : DEFAULT_MAX_PURCHASE_QUANTITY;

  const validateQuantity = () => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error("Quantidade inválida.");
      return false;
    }
    if (quantity > maxPerPurchase) {
      toast.error(`Máximo de ${maxPerPurchase} ingressos por compra.`);
      return false;
    }
    if (quantity > maxQuantity) {
      toast.error("Quantidade solicitada superior ao estoque disponível.");
      return false;
    }
    return true;
  };

  const handlePurchase = async () => {
    if (paymentStatus === "processing" || checkoutLoading) return;
    if (!validateQuantity()) return;
    setPaymentStatus("processing");
    await createPreference();
  };

  const handlePixPurchase = async () => {
    if (paymentStatus === "processing" || checkoutLoading) return;
    if (!validateQuantity()) return;
    setPaymentStatus("processing");
    await createPixPayment();
  };

  const maxQuantity =
    event.inventory?.[selectedTicketType] ?? event.availableTickets ?? 0;

  if (paymentStatus === "succeeded") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
        <div className="w-full max-w-md border border-border bg-background p-8 text-center shadow-xl">
          <StatusScreen
            initialization={{ paymentId: "" }}
            onReady={() => {}}
            onError={(err) => console.error("Status screen error", err)}
          />
          <Button onClick={onClose} className="mt-4">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Checkout
            </p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">
              Comprar Ingressos
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6 overflow-y-auto p-6">
          {/* Seletor de Tipo de Ingresso */}
          <div>
            <label className="mb-3 block text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Tipo de Ingresso
            </label>
            <div className="space-y-3">
              {Object.entries(TICKET_TYPES).map(([type, info]) => {
                const availableForType =
                  event.inventory?.[type as keyof typeof event.inventory] ??
                  event.availableTickets;
                const isSoldOut = availableForType === 0;

                return (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center border-2 p-4 transition-colors ${
                      isSoldOut
                        ? "opacity-50 cursor-not-allowed border-border bg-muted/50"
                        : selectedTicketType === type
                        ? "border-primary bg-muted"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ticketType"
                      value={type}
                      checked={selectedTicketType === type}
                      onChange={() =>
                        !isSoldOut &&
                        setSelectedTicketType(
                          type as "standard" | "vip" | "premium"
                        )
                      }
                      disabled={isSoldOut}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{info.icon}</span>
                          <div>
                            <p className="font-medium text-foreground">
                              {info.name}
                              {isSoldOut && (
                                <span className="ml-2 text-xs font-bold text-red-500 uppercase">
                                  (Esgotado)
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {info.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-primary">
                            R${" "}
                            {(
                              event.pricing?.[
                                type as keyof typeof event.pricing
                              ] ?? event.price * info.multiplier
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Seletor de Quantidade */}
          <div>
            <label
              htmlFor="quantity-select"
              className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground"
            >
              Quantidade
            </label>
            <select
              id="quantity-select"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              disabled={maxQuantity === 0}
              className="w-full border border-input bg-background px-4 py-3"
            >
              {maxQuantity > 0 ? (
                Array.from(
                  { length: Math.min(maxQuantity, maxPerPurchase) },
                  (_, i) => i + 1
                ).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? "ingresso" : "ingressos"}
                  </option>
                ))
              ) : (
                <option value={0}>0 ingressos</option>
              )}
            </select>
          </div>

          {/* Erro */}
          {checkoutError && (
            <p className="text-red-500 text-sm">{checkoutError}</p>
          )}
          {!user && (
            <p className="text-sm text-muted-foreground">
              Faça login para continuar com a compra.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-border bg-card p-6">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button
              variant={paymentMethod === "checkout" ? "default" : "outline"}
              onClick={() => setPaymentMethod("checkout")}
            >
              Cartão
            </Button>
            <Button
              variant={paymentMethod === "pix" ? "default" : "outline"}
              onClick={() => setPaymentMethod("pix")}
            >
              Pix
            </Button>
          </div>
          {paymentMethod === "checkout" && preferenceId && hasPublicKey ? (
            <Wallet initialization={{ preferenceId }} />
          ) : paymentMethod === "pix" && pixData?.qrCode ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                {pixData.qrCodeBase64 &&
                /^[A-Za-z0-9+/]+=*$/.test(pixData.qrCodeBase64) ? (
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-44 h-44"
                  />
                ) : (
                  <QRCodeDisplay qrCode={pixData.qrCode} size={170} />
                )}
              </div>
              <div className="break-all border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
                {pixData.qrCode}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(pixData.qrCode)}
                >
                  Copiar Pix
                </Button>
                {pixData.ticketUrl ? (
                  <Button variant="outline" asChild>
                    <a
                      href={pixData.ticketUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir link
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    Link indisponível
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {!hasPublicKey && paymentMethod === "checkout" && (
                <p className="text-sm text-muted-foreground">
                  Configure a chave pública do Mercado Pago para continuar.
                </p>
              )}
              <div className="mb-4 flex items-end justify-between">
                <span className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Total:
                </span>
                <span className="text-3xl font-bold text-primary">
                  R$ {totalPrice.toFixed(2)}
                </span>
              </div>
              <Button
                onClick={
                  paymentMethod === "pix" ? handlePixPurchase : handlePurchase
                }
                disabled={
                  checkoutLoading ||
                  paymentStatus === "processing" ||
                  maxQuantity < quantity ||
                  (paymentMethod === "checkout" && !hasPublicKey) ||
                  !user
                }
                className="h-12 w-full text-base"
              >
                {checkoutLoading || paymentStatus === "processing"
                  ? "Processando..."
                  : paymentMethod === "pix"
                  ? "Gerar Pix"
                  : "Ir para Pagamento"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
