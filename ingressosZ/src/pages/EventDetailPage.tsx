import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EventHeader } from "../components/event/EventHeader";
import { EventInfo } from "../components/event/EventInfo";
import { TicketPurchase } from "../components/event/TicketPurchase";
import { Button } from "../components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { TICKET_TYPES } from "../constants/ticketTypes";
import { useEventSEO } from "../hooks/seo/useEventSEO";
import { useEvent } from "../hooks/useEvents";
import { useMercadoPagoCheckout } from "../hooks/useMercadoPagoCheckout";

function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { event, loading, error } = useEvent(id || "");
  const navigate = useNavigate();
  const [selectedTicketType, setSelectedTicketType] = useState<
    "standard" | "vip" | "premium"
  >("standard");
  const [quantity, setQuantity] = useState(1);

  // Hook personalizado para SEO
  useEventSEO(event, id);

  const {
    createPreference,
    loading: checkoutLoading,
    error: checkoutError,
    paymentStatus,
    resetPaymentState,
  } = useMercadoPagoCheckout({
    eventId: id || "",
    ticketType: selectedTicketType,
    quantity,
  });

  const formattedDate = useMemo(() => {
    const d = event?.date;
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [event?.date]);

  const formattedTime = useMemo(() => {
    const t = event?.time;
    if (!t) return "";
    return t.slice(0, 5);
  }, [event?.time]);

  const totalPrice = useMemo(() => {
    const base = event?.price ?? 0;
    return base * TICKET_TYPES[selectedTicketType].multiplier * quantity;
  }, [event?.price, selectedTicketType, quantity]);

  const availabilityColor = useMemo(() => {
    const a = event?.availableTickets ?? 0;
    return a > 10
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  }, [event?.availableTickets]);

  const availabilityBg = useMemo(() => {
    const a = event?.availableTickets ?? 0;
    return a > 10
      ? "bg-green-50 dark:bg-green-900/20"
      : "bg-red-50 dark:bg-red-900/20";
  }, [event?.availableTickets]);

  // Monitorar erros de checkout e exibir via Toast
  useEffect(() => {
    if (checkoutError) {
      toast.error(checkoutError);
    }
  }, [checkoutError]);

  const handlePurchase = useCallback(async () => {
    if (!event || !id) return;

    try {
      resetPaymentState(); // Limpar estado anterior
      const preference = await createPreference();

      if (preference) {
        console.log(
          "🔄 Redirecionando para checkout do Mercado Pago:",
          preference.url
        );

        // Se estiver em modo de desenvolvimento, simular redirecionamento
        if (import.meta.env.DEV) {
          console.log("🔧 Modo desenvolvimento: simulando compra bem-sucedida");

          toast.success("Compra simulada com sucesso!", {
            description: `${quantity} ingresso(s) ${selectedTicketType} criado(s).`,
            duration: 4000,
          });

          setTimeout(() => {
            navigate("/meus-ingressos");
          }, 2000);
        } else {
          // Em produção, o Mercado Pago fará o redirecionamento automaticamente
          console.log("🔄 Redirecionamento automático para Mercado Pago...");
          window.location.href = preference.url; // Redirecionamento real se a URL for externa
        }
      }
    } catch (err) {
      console.error("❌ Erro ao criar preferência de pagamento:", err);
      toast.error("Não foi possível iniciar o pagamento", {
        description: "Por favor, tente novamente mais tarde.",
      });
    }
  }, [
    event,
    id,
    quantity,
    selectedTicketType,
    createPreference,
    navigate,
    resetPaymentState,
  ]);

  if (loading) {
    return <EventDetailSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4 transition-colors">
        <Card className="text-center max-w-md w-full">
          <CardHeader>
            <div className="text-6xl mb-2">❌</div>
            <CardTitle>Evento não encontrado</CardTitle>
            <CardDescription>
              {error || "O evento que você procura não existe ou foi removido."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link to="/eventos">← Voltar aos Eventos</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card transition-colors">
          {/* Event Image */}
          {event.image && (
            <div className="w-full h-80 overflow-hidden rounded-t-xl">
              <img
                src={event.image}
                alt={event.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}

          <div className="p-8">
            <EventHeader
              event={event}
              availabilityBg={availabilityBg}
              availabilityColor={availabilityColor}
            />

            {/* Event Details Grid */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <EventInfo
                event={event}
                formattedDate={formattedDate}
                formattedTime={formattedTime}
              />

              <TicketPurchase
                event={event}
                selectedTicketType={selectedTicketType}
                setSelectedTicketType={setSelectedTicketType}
                quantity={quantity}
                setQuantity={setQuantity}
                handlePurchase={handlePurchase}
                checkoutLoading={checkoutLoading}
                paymentStatus={paymentStatus}
                checkoutError={checkoutError}
                totalPrice={totalPrice}
              />
            </div>

            {/* Back Button */}
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link to="/eventos">
                  <span className="mr-2">←</span>
                  Voltar aos Eventos
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetailPage;
