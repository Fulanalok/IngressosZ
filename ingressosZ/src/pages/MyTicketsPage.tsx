import { Link } from "react-router-dom";
import Ticket from "../components/Ticket";
import { TicketSkeleton } from "../components/TicketSkeleton";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { useUserTickets } from "../hooks/useTickets";

function MyTicketsPage() {
  const { user } = useAuth();
  const { tickets, loading, error, refetch } = useUserTickets();

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg transition-colors">
         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-8 space-y-4">
               <div className="h-16 w-16 bg-muted animate-pulse rounded-full mx-auto"></div>
               <div className="h-10 w-64 bg-muted animate-pulse rounded mx-auto"></div>
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
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎟️</div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Meus Ingressos
          </h1>
          <p className="text-xl text-muted-foreground">
            Bem-vindo,{" "}
            <span className="font-semibold text-primary">{user?.email}</span>!
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="card max-w-md mx-auto text-center mb-8 bg-background">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
              Erro ao carregar ingressos
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refetch}>Tentar Novamente</Button>
          </div>
        )}

        {/* Tickets Content */}
        {!error && (
          <>
            {tickets.length === 0 ? (
              /* Empty State */
              <div className="card max-w-lg mx-auto text-center bg-white dark:bg-gray-800">
                <div className="text-8xl mb-6">🎫</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Você ainda não possui ingressos
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Que tal explorar nossos eventos incríveis e garantir seu
                  lugar?
                </p>
                <Button asChild className="text-lg px-8 py-3">
                  <Link to="/eventos">
                    <span className="mr-2">🎉</span>
                    Descobrir Eventos
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-lg shadow-sm border">
                  <h2 className="text-2xl font-bold text-foreground">
                    Seus Ingressos ({tickets.length})
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-muted-foreground bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Válido
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Usado
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
                <div className="card bg-gradient-to-r from-primary to-accent text-primary-foreground text-center mt-12">
                  <h3 className="text-xl font-bold mb-4">Ações Rápidas</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Link
                      to="/eventos"
                      className="bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 rounded-lg p-4 text-center transition-colors backdrop-blur-sm"
                    >
                      <div className="text-2xl mb-2">🎉</div>
                      <div className="font-semibold">Mais Eventos</div>
                      <div className="text-sm opacity-90">
                        Descubra novos eventos
                      </div>
                    </Link>
                    <Link
                      to="/perfil"
                      className="bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 rounded-lg p-4 text-center transition-colors backdrop-blur-sm"
                    >
                      <div className="text-2xl mb-2">👤</div>
                      <div className="font-semibold">Meu Perfil</div>
                      <div className="text-sm opacity-90">
                        Gerenciar conta
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tips Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="card text-center bg-background">
            <div className="text-3xl mb-4">📱</div>
            <h3 className="font-semibold text-foreground mb-2">
              Acesso Mobile
            </h3>
            <p className="text-sm text-muted-foreground">
              Seus ingressos estão sempre disponíveis no seu celular
            </p>
          </div>
          <div className="card text-center bg-background">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="font-semibold text-foreground mb-2">Segurança</h3>
            <p className="text-sm text-muted-foreground">
              Ingressos com código QR único e verificação de segurança
            </p>
          </div>
          <div className="card text-center bg-background">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="font-semibold text-foreground mb-2">Suporte</h3>
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda? Nossa equipe está pronta para te atender
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyTicketsPage;
