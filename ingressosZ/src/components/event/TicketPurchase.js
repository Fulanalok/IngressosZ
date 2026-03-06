import { useState, useMemo } from "react";
import { Wallet, StatusScreen } from "@mercadopago/sdk-react";
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";
import { TICKET_TYPES } from "@/constants/ticketTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export function TicketPurchase({ event, user, onClose }) {
  const [selectedTicketType, setSelectedTicketType] = useState("standard");
  const [quantity, setQuantity] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [guestEmail, setGuestEmail] = useState("");
  const hasPublicKey = Boolean(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);
  const buyerEmail = user?.email || guestEmail.trim();

  const {
    createPreference,
    preferenceId,
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
    setPaymentStatus("processing");
    await createPreference();
  };

  const maxQuantity =
    event.inventory?.[selectedTicketType] ?? event.availableTickets ?? 0;

  if (paymentStatus === "succeeded") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <StatusScreen
            initialization={{ paymentId: "" }}
            onReady={() => console.log("Status screen ready")}
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
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Comprar Ingressos</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Tipo de Ingresso
            </label>
            <div className="space-y-3">
              {Object.entries(TICKET_TYPES).map(([type, info]) => {
                const availableForType =
                  event.inventory?.[type] ?? event.availableTickets;
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
                        !isSoldOut && setSelectedTicketType(type)
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
                              event.pricing?.[type] ??
                              event.price * info.multiplier
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

          {checkoutError && (
            <p className="text-red-500 text-sm">{checkoutError}</p>
          )}
          {!user && (
            <div>
              <label
                htmlFor="guest-email"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Email para receber o ingresso
              </label>
              <Input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="p-6 mt-auto border-t border-border bg-muted/50 rounded-b-2xl">
          {preferenceId && hasPublicKey ? (
            <Wallet
              initialization={{ preferenceId: preferenceId }}
              onSubmit={async () => {}}
            />
          ) : (
            <>
              {!hasPublicKey && (
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
                onClick={handlePurchase}
                disabled={
                  checkoutLoading ||
                  maxQuantity < quantity ||
                  !hasPublicKey ||
                  (!user && !guestEmail.trim())
                }
                className="w-full h-12 text-lg"
              >
                {checkoutLoading ? "Processando..." : "Ir para Pagamento"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
