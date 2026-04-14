import QRCodeDisplay from "@/components/QRCodeDisplay";
import { Button } from "@/components/ui/button";
import { TICKET_TYPES } from "@/constants/ticketTypes";
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";
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

  const handlePurchase = async () => {
    if (paymentStatus === "processing" || checkoutLoading) return;
    if (maxQuantity < quantity) {
      toast.error("Quantidade solicitada superior ao estoque disponível.");
      return;
    }
    setPaymentStatus("processing");
    await createPreference();
  };

  const handlePixPurchase = async () => {
    if (paymentStatus === "processing" || checkoutLoading) return;
    if (maxQuantity < quantity) {
      toast.error("Quantidade solicitada superior ao estoque disponível.");
      return;
    }
    setPaymentStatus("processing");
    await createPixPayment();
  };

  const maxQuantity =
    event.inventory?.[selectedTicketType] ?? event.availableTickets ?? 0;

  if (paymentStatus === "succeeded") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-xl p-8 max-w-md w-full text-center">
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            Comprar Ingressos
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Seletor de Tipo de Ingresso */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
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
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
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
              className="block text-sm font-medium text-foreground mb-2"
            >
              Quantidade
            </label>
            <select
              id="quantity-select"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              disabled={maxQuantity === 0}
              className="w-full px-4 py-3 border border-input rounded-md bg-background"
            >
              {maxQuantity > 0 ? (
                Array.from(
                  { length: Math.min(maxQuantity, 5) },
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
        <div className="p-6 mt-auto border-t border-border bg-muted/50 rounded-b-2xl">
          <div className="grid grid-cols-2 gap-2 mb-4">
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
            <Wallet
              initialization={{ preferenceId: preferenceId } as any}
              onSubmit={async () => {}}
            />
          ) : paymentMethod === "pix" && pixData?.qrCode ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                {pixData.qrCodeBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-44 h-44"
                  />
                ) : (
                  <QRCodeDisplay qrCode={pixData.qrCode} size={170} />
                )}
              </div>
              <div className="text-xs text-muted-foreground font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
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
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium text-foreground">
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
                className="w-full h-12 text-lg"
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
