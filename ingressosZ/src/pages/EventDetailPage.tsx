import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "@dr.pogodin/react-helmet";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { TicketPurchase, ShareButtons } from "@/components/event";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FiCalendar, FiClock, FiMapPin, FiChevronLeft } from "react-icons/fi";

function EventDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse">
      <div className="bg-gray-300 h-8 w-1/4 mb-4 rounded"></div>
      <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
        <div className="bg-gray-300 h-64 w-full"></div>
        <div className="p-6 md:p-8">
          <div className="bg-gray-300 h-8 w-3/4 mb-4 rounded"></div>
          <div className="flex items-center text-gray-400 mb-6 space-x-4">
            <div className="bg-gray-300 h-6 w-1/2 rounded"></div>
            <div className="bg-gray-300 h-6 w-1/2 rounded"></div>
          </div>
          <div className="bg-gray-300 h-6 w-full mb-4 rounded"></div>
          <div className="bg-gray-300 h-6 w-full mb-4 rounded"></div>
          <div className="bg-gray-300 h-6 w-2/3 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: event, status, error } = useEvent(eventId!);
  const [showPurchase, setShowPurchase] = useState(false);

  if (status === "pending" || authLoading) {
    return <EventDetailSkeleton />;
  }

  if (status === "error") {
    return (
      <div className="text-center py-10 text-red-500">
        Erro ao carregar o evento: {error?.message}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
        <p className="mb-6">O evento que você está procurando não existe ou foi removido.</p>
        <button 
          onClick={() => navigate("/")} 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const formattedDate = format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const pageTitle = `${event.title} - IngressosZ`;
  const pageDescription = event.description.substring(0, 160);
  const pageUrl = window.location.href;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={event.image} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
        >
            <FiChevronLeft className="mr-1" />
            Voltar
        </button>

        <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
          {event.image && (
            <img src={event.image} alt={event.title} className="w-full h-64 object-cover" />
          )}
          <div className="p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">{event.title}</h1>
            
            <div className="flex flex-wrap items-center text-gray-600 mb-6 gap-x-6 gap-y-2">
                <div className="flex items-center">
                    <FiCalendar className="mr-2 text-blue-500" />
                    <span>{formattedDate}</span>
                </div>
                <div className="flex items-center">
                    <FiClock className="mr-2 text-blue-500" />
                    <span>{event.time}</span>
                </div>
            </div>

            <div className="flex items-center text-gray-700 mb-8">
                <FiMapPin className="mr-2 text-red-500" />
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {event.location} - {event.address}
                </a>
            </div>

            <div className="prose prose-lg max-w-none text-gray-800 mb-8">
              <p>{event.description}</p>
            </div>

            <ShareButtons url={pageUrl} title={event.title} />

            <div className="mt-8 pt-6 border-t border-gray-200">
              {event.availableTickets > 0 ? (
                <button 
                  onClick={() => setShowPurchase(true)} 
                  className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 shadow-lg"
                >
                  Comprar Ingressos
                </button>
              ) : (
                <div className="text-center bg-red-100 p-4 rounded-lg">
                  <p className="font-bold text-red-700">Ingressos Esgotados!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showPurchase && (
          <TicketPurchase 
            event={event} 
            user={user} 
            onClose={() => setShowPurchase(false)} 
          />
        )}
      </div>
    </>
  );
}

export default EventDetailPage;
