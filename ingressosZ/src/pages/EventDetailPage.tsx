import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "@dr.pogodin/react-helmet";
import { EventDetailSkeleton } from "@/components/EventDetailSkeleton";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { TicketPurchase, ShareButtons } from "@/components/event";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, MapPin, ChevronLeft, Info } from "lucide-react";

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
      <div className="text-center py-20 bg-background">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-500 mb-6">
          <Info className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-extrabold mb-4 text-foreground">Evento não encontrado</h2>
        <p className="mb-8 text-muted-foreground max-w-md mx-auto">O evento que você está procurando não existe ou foi movido. Verifique o link ou retorne à página inicial.</p>
        <button 
          onClick={() => navigate("/")} 
          className="btn-primary"
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

      <div className="page-container max-w-4xl">
        <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-primary hover:opacity-80 mb-6 font-bold transition-all group"
        >
            <ChevronLeft className="mr-1 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            Voltar
        </button>

        <div className="card !p-0 overflow-hidden border-none shadow-2xl">
          {event.image && (
            <div className="relative h-80 overflow-hidden">
               <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
               <div className="absolute bottom-6 left-8">
                 <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                   {event.category}
                 </span>
               </div>
            </div>
          )}
          <div className="p-8 md:p-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 leading-tight">
              {event.title}
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
               <div className="flex items-center p-4 rounded-2xl bg-secondary/30 border border-primary/5">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-4 text-primary">
                   <Calendar className="h-5 w-5" />
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Data</p>
                   <p className="font-bold text-foreground capitalize">{formattedDate}</p>
                 </div>
               </div>

               <div className="flex items-center p-4 rounded-2xl bg-secondary/30 border border-primary/5">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-4 text-primary">
                   <Clock className="h-5 w-5" />
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Horário</p>
                   <p className="font-bold text-foreground">{event.time}</p>
                 </div>
               </div>

               <div className="flex items-center p-4 rounded-2xl bg-secondary/30 border border-primary/5">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-4 text-primary">
                   <MapPin className="h-5 w-5" />
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Local</p>
                   <a 
                     href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                   >
                     {event.location}
                   </a>
                 </div>
               </div>

               <div className="flex items-center p-4 rounded-2xl bg-secondary/30 border border-primary/5">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${
                   event.availableTickets <= 10 ? "bg-red-100 text-red-600 animate-pulse" : "bg-primary/10 text-primary"
                 }`}>
                   <span className="font-black text-xs">#</span>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Disponibilidade</p>
                   <p className={`font-bold transition-all duration-500 ${
                     event.availableTickets <= 10 ? "text-red-600" : "text-foreground"
                   }`}>
                     {event.availableTickets} ingressos disponíveis
                   </p>
                 </div>
               </div>
            </div>

            <div className="prose prose-lg max-w-none text-muted-foreground mb-10 leading-relaxed border-l-4 border-primary/10 pl-6 py-2 italic font-medium">
               {event.description}
            </div>

            <ShareButtons url={pageUrl} title={event.title} />

            <div className="mt-4 pt-10 border-t border-border/50">
              {event.availableTickets > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="mb-4 text-center">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Acesso garantido</p>
                    <p className="text-3xl font-extrabold blue-gradient-text">R$ {(event.price || 0).toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => setShowPurchase(true)} 
                    className="btn-primary w-full py-5 text-lg shadow-blue-500/25 shadow-xl hover:scale-[1.02] transition-transform"
                  >
                    🚀 Comprar Agora
                  </button>
                </div>
              ) : (
                <div className="text-center bg-red-50 p-6 rounded-2xl border border-red-100">
                  <p className="font-extrabold text-red-600 text-xl mb-1">⚡ Ingressos Esgotados!</p>
                  <p className="text-red-500 text-sm">Fique atento para novas edições deste evento.</p>
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
