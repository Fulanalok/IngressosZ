import Ticket from "@/components/ticket/Ticket";
import { TicketSkeleton } from "@/components/ticket/TicketSkeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth/useAuth";
import { useUserTickets } from "@/hooks/event/useTickets";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Ticket as TicketIcon, Compass, User, RefreshCcw } from "lucide-react";

function MyTicketsPage() {
  const { user } = useAuth();
  const { tickets, isLoading, error } = useUserTickets(user?.uid);
  const queryClient = useQueryClient();

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["userTickets", user?.uid] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8 space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-10 w-64 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <TicketSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter text-foreground mb-3 leading-tight">
            Meus <span className="blue-gradient-text">Ingressos</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Gerencie seus acessos e prepare-se para a diversão.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="glass-card max-w-md mx-auto text-center p-10 mb-12 border-red-100/20">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCcw className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-foreground mb-3">
              Erro ao sincronizar
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">{error.message}</p>
            <Button onClick={refetch} className="btn-primary w-full shadow-red-500/10">Tentar Novamente</Button>
          </div>
        )}

        {/* Tickets Content */}
        {!error && tickets && (
          <>
            {tickets.length === 0 ? (
              /* Empty State */
              <div className="glass-card max-w-lg mx-auto text-center p-12">
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
                  <TicketIcon className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-extrabold text-foreground mb-4">
                  Sua carteira está vazia
                </h2>
                <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                  Você ainda não possui ingressos garantidos. Descubra os próximos eventos e garanta o seu lugar!
                </p>
                <Button asChild className="btn-primary px-10 py-6 text-lg shadow-blue-500/25 shadow-xl">
                  <Link to="/eventos">
                    <Compass className="mr-2 h-5 w-5" />
                    Explorar Eventos
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/60 backdrop-blur-sm p-6 rounded-3xl border border-border/50 shadow-sm">
                  <h2 className="text-2xl font-extrabold text-foreground">
                    Seus Ingressos <span className="text-primary/60 ml-2">({tickets.length})</span>
                  </h2>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-muted-foreground bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-100">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3 animate-pulse"></div>
                      Válido
                    </div>
                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full mr-3 opacity-40"></div>
                      Outros
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="h-full">
                      <Ticket ticket={ticket} />
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="p-8 rounded-3xl bg-gradient-to-br from-primary to-accent relative overflow-hidden shadow-2xl shadow-blue-500/20 mt-16 group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-extrabold text-white mb-6">Ações Rápidas</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Link
                        to="/eventos"
                        className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-2xl p-6 transition-all group/action"
                      >
                        <div className="text-left">
                          <div className="font-bold text-white text-lg">Explorar Eventos</div>
                          <div className="text-white/70 text-sm">Encontre sua próxima diversão</div>
                        </div>
                        <Compass className="h-6 w-6 text-white group-hover/action:rotate-12 transition-transform" />
                      </Link>
                      <Link
                        to="/perfil"
                        className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-2xl p-6 transition-all group/action"
                      >
                        <div className="text-left">
                          <div className="font-bold text-white text-lg">Meu Perfil</div>
                          <div className="text-white/70 text-sm">Gerenciar sua conta</div>
                        </div>
                        <User className="h-6 w-6 text-white group-hover/action:scale-110 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

export default MyTicketsPage;
