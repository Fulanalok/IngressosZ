import { useQueryClient } from "@tanstack/react-query";
import { Compass, RefreshCcw, Ticket as TicketIcon, User } from "lucide-react";
import { Link } from "react-router";
import Ticket from "@/components/ticket/Ticket";
import { TicketSkeleton } from "@/components/ticket/TicketSkeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth/useAuth";
import { useUserTickets } from "@/hooks/event/useTickets";

function MyTicketsPage() {
  const { user } = useAuth();
  const { tickets, isLoading, error } = useUserTickets(user?.uid);
  const queryClient = useQueryClient();

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["userTickets", user?.uid] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen page-bg">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-4 text-center">
            <Skeleton className="mx-auto h-16 w-16" />
            <Skeleton className="mx-auto h-10 w-64" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <TicketSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 border-b border-border pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Carteira digital
          </p>
          <h1 className="mb-3 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Meus ingressos
          </h1>
          <p className="max-w-2xl text-lg font-medium text-muted-foreground">
            Acesse seus tickets, baixe o PDF e abra o QR Code para entrada no
            evento.
          </p>
        </div>

        {error && (
          <div className="surface-card mx-auto mb-12 max-w-md border-red-900/30 p-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-red-900/40 text-red-400">
              <RefreshCcw className="h-8 w-8" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-foreground">
              Erro ao sincronizar
            </h3>
            <p className="mb-8 leading-relaxed text-muted-foreground">
              {error.message}
            </p>
            <Button onClick={refetch} className="btn-primary w-full">
              Tentar novamente
            </Button>
          </div>
        )}

        {!error && tickets && (
          <>
            {tickets.length === 0 ? (
              <div className="surface-card mx-auto max-w-lg p-12 text-center">
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center border border-border text-primary">
                  <TicketIcon className="h-10 w-10" />
                </div>
                <h2 className="mb-4 text-3xl font-bold text-foreground">
                  Sua carteira está vazia
                </h2>
                <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
                  Você ainda não possui ingressos. Explore os próximos eventos e
                  garanta seu lugar.
                </p>
                <Button asChild className="btn-primary px-10 py-6 text-lg">
                  <Link to="/eventos">
                    <Compass className="mr-2 h-5 w-5" />
                    Explorar eventos
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col justify-between gap-6 border border-border bg-card p-6 md:flex-row md:items-center">
                  <h2 className="text-2xl font-bold text-foreground">
                    Seus ingressos{" "}
                    <span className="ml-2 text-primary/70">
                      ({tickets.length})
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center border border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <div className="mr-3 h-2 w-2 bg-primary" />
                      Válido
                    </div>
                    <div className="flex items-center border border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <div className="mr-3 h-2 w-2 bg-muted-foreground opacity-40" />
                      Outros
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="h-full">
                      <Ticket ticket={ticket} />
                    </div>
                  ))}
                </div>

                <div className="relative mt-16 overflow-hidden border border-border bg-card p-8">
                  <h3 className="mb-6 text-2xl font-bold text-foreground">
                    Ações rápidas
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Link
                      to="/eventos"
                      className="flex items-center justify-between border border-border bg-background p-6 hover:bg-muted"
                    >
                      <div className="text-left">
                        <div className="text-lg font-bold text-foreground">
                          Explorar eventos
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Encontre sua próxima compra
                        </div>
                      </div>
                      <Compass className="h-6 w-6 text-primary" />
                    </Link>
                    <Link
                      to="/perfil"
                      className="flex items-center justify-between border border-border bg-background p-6 hover:bg-muted"
                    >
                      <div className="text-left">
                        <div className="text-lg font-bold text-foreground">
                          Meu perfil
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Gerenciar sua conta
                        </div>
                      </div>
                      <User className="h-6 w-6 text-primary" />
                    </Link>
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
