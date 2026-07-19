import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import { Button } from "@/components/ui/button";
import { TICKET_TYPES } from "@/constants/ticketTypes";
import { useMercadoPagoCheckout } from "@/hooks/payment/useMercadoPagoCheckout";
import type { Event } from "@/types";
import { StatusScreen, Wallet } from "@mercadopago/sdk-react";
import type { User } from "firebase/auth";
import { X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type TicketType = "standard" | "vip" | "premium";
type PaymentMethod = "checkout" | "pix";
type CheckoutState = ReturnType<typeof useMercadoPagoCheckout>;
type PixData = NonNullable<CheckoutState["pixData"]>;

interface TicketPurchaseProps {
  event: Event;
  user?: User | null;
  onClose: () => void;
}

const DEFAULT_MAX_PURCHASE_QUANTITY = 5;
const TICKET_TYPE_KEYS = Object.keys(TICKET_TYPES) as TicketType[];

function getValidMaxPerPurchase(event: Event) {
  const maxPerPurchase = event.maxPerPurchase;
  const isValid =
    typeof maxPerPurchase === "number" &&
    Number.isInteger(maxPerPurchase) &&
    maxPerPurchase >= 1 &&
    maxPerPurchase <= 50;

  return isValid ? maxPerPurchase : DEFAULT_MAX_PURCHASE_QUANTITY;
}

function getQuantityError(
  quantity: number,
  maxPerPurchase: number,
  maxQuantity: number
) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return "Quantidade inválida.";
  }
  if (quantity > maxPerPurchase) {
    return `Máximo de ${maxPerPurchase} ingressos por compra.`;
  }
  if (quantity > maxQuantity) {
    return "Quantidade solicitada superior ao estoque disponível.";
  }
  return null;
}

function getTicketPrice(event: Event, type: TicketType) {
  return event.pricing?.[type] ?? event.price;
}

function getTicketAvailability(event: Event, type: TicketType) {
  return event.inventory?.[type] ?? event.availableTickets;
}

function getTicketOptionClass(isSoldOut: boolean, isSelected: boolean) {
  const base = "flex cursor-pointer items-center border-2 p-4 transition-colors";

  if (isSoldOut) {
    return `${base} opacity-50 cursor-not-allowed border-border bg-muted/50`;
  }
  if (isSelected) {
    return `${base} border-primary bg-muted`;
  }
  return `${base} border-border hover:border-primary`;
}

function isValidBase64(value: string | null | undefined) {
  return Boolean(value && /^[A-Za-z0-9+/]+=*$/.test(value));
}

function TicketTypeOption({
  event,
  isSelected,
  onSelect,
  type,
}: {
  event: Event;
  isSelected: boolean;
  onSelect: (type: TicketType) => void;
  type: TicketType;
}) {
  const info = TICKET_TYPES[type];
  const isSoldOut = getTicketAvailability(event, type) === 0;

  return (
    <label className={getTicketOptionClass(isSoldOut, isSelected)}>
      <input
        type="radio"
        name="ticketType"
        value={type}
        checked={isSelected}
        onChange={() => {
          if (!isSoldOut) onSelect(type);
        }}
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
              R$ {getTicketPrice(event, type).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </label>
  );
}

function TicketTypeSelector({
  event,
  selectedTicketType,
  setSelectedTicketType,
}: {
  event: Event;
  selectedTicketType: TicketType;
  setSelectedTicketType: (type: TicketType) => void;
}) {
  return (
    <div>
      <label className="mb-3 block text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Tipo de Ingresso
      </label>
      <div className="space-y-3">
        {TICKET_TYPE_KEYS.map((type) => (
          <TicketTypeOption
            key={type}
            event={event}
            isSelected={selectedTicketType === type}
            onSelect={setSelectedTicketType}
            type={type}
          />
        ))}
      </div>
    </div>
  );
}

function QuantitySelector({
  maxPerPurchase,
  maxQuantity,
  quantity,
  setQuantity,
}: {
  maxPerPurchase: number;
  maxQuantity: number;
  quantity: number;
  setQuantity: (quantity: number) => void;
}) {
  const quantityOptions = Array.from(
    { length: Math.min(maxQuantity, maxPerPurchase) },
    (_, i) => i + 1
  );

  return (
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
          quantityOptions.map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? "ingresso" : "ingressos"}
            </option>
          ))
        ) : (
          <option value={0}>0 ingressos</option>
        )}
      </select>
    </div>
  );
}

function PixQrCode({ pixData }: { pixData: PixData }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {isValidBase64(pixData.qrCodeBase64) ? (
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
            <a href={pixData.ticketUrl} target="_blank" rel="noreferrer">
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
  );
}

function PaymentMethodSelector({
  paymentMethod,
  setPaymentMethod,
}: {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
}) {
  return (
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
  );
}

function isCheckoutActionDisabled({
  hasPublicKey,
  isProcessing,
  maxQuantity,
  paymentMethod,
  quantity,
  user,
}: {
  hasPublicKey: boolean;
  isProcessing: boolean;
  maxQuantity: number;
  paymentMethod: PaymentMethod;
  quantity: number;
  user?: User | null;
}) {
  if (isProcessing) return true;
  if (!user) return true;
  if (maxQuantity < quantity) return true;
  return paymentMethod === "checkout" && !hasPublicKey;
}

function getPaymentButtonLabel(
  isProcessing: boolean,
  paymentMethod: PaymentMethod
) {
  if (isProcessing) return "Processando...";
  return paymentMethod === "pix" ? "Gerar Pix" : "Ir para Pagamento";
}

function CheckoutAction({
  checkoutLoading,
  hasPublicKey,
  maxQuantity,
  paymentMethod,
  paymentStatus,
  quantity,
  totalPrice,
  user,
  onCheckout,
  onPix,
}: {
  checkoutLoading: boolean;
  hasPublicKey: boolean;
  maxQuantity: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "idle" | "processing" | "succeeded" | "failed";
  quantity: number;
  totalPrice: number;
  user?: User | null;
  onCheckout: () => void;
  onPix: () => void;
}) {
  const isProcessing = checkoutLoading || paymentStatus === "processing";
  const disabled = isCheckoutActionDisabled({
    hasPublicKey,
    isProcessing,
    maxQuantity,
    paymentMethod,
    quantity,
    user,
  });

  return (
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
        onClick={paymentMethod === "pix" ? onPix : onCheckout}
        disabled={disabled}
        className="h-12 w-full text-base"
      >
        {getPaymentButtonLabel(isProcessing, paymentMethod)}
      </Button>
    </>
  );
}

function CheckoutFooter({
  checkoutLoading,
  hasPublicKey,
  maxQuantity,
  paymentMethod,
  paymentStatus,
  pixData,
  preferenceId,
  quantity,
  setPaymentMethod,
  totalPrice,
  user,
  onCheckout,
  onPix,
}: {
  checkoutLoading: boolean;
  hasPublicKey: boolean;
  maxQuantity: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "idle" | "processing" | "succeeded" | "failed";
  pixData: CheckoutState["pixData"];
  preferenceId: string | null;
  quantity: number;
  setPaymentMethod: (method: PaymentMethod) => void;
  totalPrice: number;
  user?: User | null;
  onCheckout: () => void;
  onPix: () => void;
}) {
  const content =
    paymentMethod === "checkout" && preferenceId && hasPublicKey ? (
      <Wallet initialization={{ preferenceId }} />
    ) : paymentMethod === "pix" && pixData?.qrCode ? (
      <PixQrCode pixData={pixData} />
    ) : (
      <CheckoutAction
        checkoutLoading={checkoutLoading}
        hasPublicKey={hasPublicKey}
        maxQuantity={maxQuantity}
        paymentMethod={paymentMethod}
        paymentStatus={paymentStatus}
        quantity={quantity}
        totalPrice={totalPrice}
        user={user}
        onCheckout={onCheckout}
        onPix={onPix}
      />
    );

  return (
    <div className="mt-auto border-t border-border bg-card p-6">
      <PaymentMethodSelector
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
      />
      {content}
    </div>
  );
}

function PurchaseSuccess({ onClose }: { onClose: () => void }) {
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

export function TicketPurchase({ event, user, onClose }: TicketPurchaseProps) {
  const [selectedTicketType, setSelectedTicketType] =
    useState<TicketType>("standard");
  const [quantity, setQuantity] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("checkout");
  const paymentRequestInFlight = useRef(false);
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

  const unitPrice = useMemo(
    () => event.pricing?.[selectedTicketType] ?? event.price,
    [event, selectedTicketType]
  );
  const totalPrice = useMemo(() => unitPrice * quantity, [unitPrice, quantity]);
  const maxPerPurchase = getValidMaxPerPurchase(event);
  const maxQuantity = getTicketAvailability(event, selectedTicketType);

  const requestPayment = async (request: () => Promise<unknown>) => {
    if (paymentRequestInFlight.current || checkoutLoading) return;

    const quantityError = getQuantityError(
      quantity,
      maxPerPurchase,
      maxQuantity
    );
    if (quantityError) {
      toast.error(quantityError);
      return;
    }

    paymentRequestInFlight.current = true;
    setPaymentStatus("processing");
    try {
      await request();
    } catch {
      // O hook de checkout preserva a mensagem e o toast da falha.
    } finally {
      paymentRequestInFlight.current = false;
      setPaymentStatus("idle");
    }
  };

  if (paymentStatus === "succeeded") {
    return <PurchaseSuccess onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col border border-border bg-background shadow-xl">
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

        <div className="space-y-6 overflow-y-auto p-6">
          <TicketTypeSelector
            event={event}
            selectedTicketType={selectedTicketType}
            setSelectedTicketType={setSelectedTicketType}
          />

          <QuantitySelector
            maxPerPurchase={maxPerPurchase}
            maxQuantity={maxQuantity}
            quantity={quantity}
            setQuantity={setQuantity}
          />

          {checkoutError && (
            <p className="text-red-500 text-sm">{checkoutError}</p>
          )}
          {!user && (
            <p className="text-sm text-muted-foreground">
              Faça login para continuar com a compra.
            </p>
          )}
        </div>

        <CheckoutFooter
          checkoutLoading={checkoutLoading}
          hasPublicKey={hasPublicKey}
          maxQuantity={maxQuantity}
          paymentMethod={paymentMethod}
          paymentStatus={paymentStatus}
          pixData={pixData}
          preferenceId={preferenceId}
          quantity={quantity}
          setPaymentMethod={setPaymentMethod}
          totalPrice={totalPrice}
          user={user}
          onCheckout={() => requestPayment(createPreference)}
          onPix={() => requestPayment(createPixPayment)}
        />
      </div>
    </div>
  );
}
