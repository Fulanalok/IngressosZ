import { TICKET_TYPES } from "../../constants/ticketTypes";
import type { Event } from "../../types";
import { Button } from "../ui/button";

interface TicketPurchaseProps {
  event: Event;
  selectedTicketType: "standard" | "vip" | "premium";
  setSelectedTicketType: (type: "standard" | "vip" | "premium") => void;
  quantity: number;
  setQuantity: (qty: number) => void;
  handlePurchase: () => void;
  checkoutLoading: boolean;
  paymentStatus: "idle" | "processing" | "succeeded" | "failed";
  checkoutError: string | null;
  totalPrice: number;
}

export function TicketPurchase({
  event,
  selectedTicketType,
  setSelectedTicketType,
  quantity,
  setQuantity,
  handlePurchase,
  checkoutLoading,
  paymentStatus,
  checkoutError,
  totalPrice,
}: TicketPurchaseProps) {
  const selectedTypeAvailability =
    event.inventory && typeof event.inventory === "object"
      ? event.inventory[selectedTicketType] ?? 0
      : event.availableTickets;

  return (
    <div className="bg-background border border-border rounded-xl p-6 transition-colors">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        🎫 Comprar Ingressos
      </h2>

      <div className="space-y-6">
        {/* Ticket Type Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Tipo de Ingresso
          </label>
          <div className="space-y-3">
            {Object.entries(TICKET_TYPES).map(([type, info]) => {
              // Calculate availability for this specific ticket type
              // If event has inventory map, use it; otherwise fallback to global availableTickets
              const availableForType =
                event.inventory && typeof event.inventory === "object"
                  ? event.inventory[type] ?? 0
                  : event.availableTickets;

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
                    onChange={(e) =>
                      !isSoldOut &&
                      setSelectedTicketType(
                        e.target.value as "standard" | "vip" | "premium"
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
                              type as "standard" | "vip" | "premium"
                            ] ?? event.price * info.multiplier
                          ).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {availableForType > 0
                            ? `${availableForType} disponíveis`
                            : "Indisponível"}
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Quantity Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Quantidade
          </label>
          <select
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-input rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none bg-background text-foreground transition-colors"
          >
            {[1, 2, 3, 4, 5].map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? "ingresso" : "ingressos"}
              </option>
            ))}
          </select>
        </div>

        {/* Error Display */}
        {checkoutError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-600 rounded-md">
            <div className="flex items-start">
              <span className="text-red-500 mr-2">❌</span>
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-300 text-sm font-medium mb-1">
                  Erro no pagamento
                </p>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {checkoutError}
                </p>
                {import.meta.env.DEV && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-2">
                    💡 Em desenvolvimento: Configure o MERCADOPAGO_ACCESS_TOKEN
                    nas variáveis de ambiente do backend
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status do Pagamento */}
        {paymentStatus === "processing" && (
          <div className="p-4 bg-muted border border-border rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-3"></div>
              <p className="text-primary text-sm font-medium">
                Processando pagamento...
              </p>
            </div>
          </div>
        )}

        {/* Total and Purchase Button */}
        <div className="border-t border-border pt-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-medium text-foreground">Total:</span>
            <span className="text-3xl font-bold text-primary">
              R$ {totalPrice.toFixed(2)}
            </span>
          </div>

          <Button
            onClick={handlePurchase}
            disabled={
              checkoutLoading ||
              selectedTypeAvailability < quantity ||
              paymentStatus === "processing"
            }
            className="w-full h-12 text-lg"
          >
            {checkoutLoading || paymentStatus === "processing" ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-none h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                {paymentStatus === "processing"
                  ? "Redirecionando..."
                  : "Processando compra..."}
              </div>
            ) : selectedTypeAvailability < quantity ? (
              "❌ Ingressos insuficientes"
            ) : (
              <div className="flex items-center justify-center">
                <span className="mr-2">🛒</span>
                Comprar {quantity === 1 ? "Ingresso" : "Ingressos"}
              </div>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            🔒 Pagamento seguro processado via Mercado Pago
            {import.meta.env.DEV && (
              <span className="block text-orange-500 dark:text-orange-400 mt-1">
                💡 Modo desenvolvimento: simulação ativa
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
