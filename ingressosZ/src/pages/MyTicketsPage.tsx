import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { GridChildComponentProps } from "react-window";
import { FixedSizeGrid as Grid, FixedSizeList as List } from "react-window";
import Ticket from "../components/Ticket";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { useUserTickets } from "../hooks/useTickets";

function MyTicketsPage() {
  const { user } = useAuth();
  const { tickets, loading, error, refetch } = useUserTickets();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [gridHeight, setGridHeight] = useState(800);
  const [columns, setColumns] = useState(1);
  const CARD_HEIGHT = 380;

  useEffect(() => {
    const measure = () => {
      const w = containerRef.current?.clientWidth || window.innerWidth;
      setGridWidth(w);
      const headerAndFilters = 280;
      const h = Math.max(360, window.innerHeight - headerAndFilters);
      setGridHeight(h);
      if (w >= 1280) setColumns(3);
      else if (w >= 1024) setColumns(2);
      else setColumns(1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground">
            Carregando seus ingressos...
          </h2>
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
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Seus Ingressos ({tickets.length})
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <div className="w-3 h-3 bg-green-500 rounded-none mr-2"></div>
                      Válido
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <div className="w-3 h-3 bg-red-500 rounded-none mr-2"></div>
                      Usado
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <div className="w-3 h-3 bg-yellow-500 rounded-none mr-2"></div>
                      Expirado
                    </div>
                  </div>
                </div>

                <div ref={containerRef}>
                  {gridWidth > 0 &&
                    (columns === 1 ? (
                      <List
                        height={gridHeight}
                        itemCount={tickets.length}
                        itemSize={CARD_HEIGHT}
                        width={gridWidth}
                      >
                        {({ index, style }) => {
                          const ticket = tickets[index];
                          return (
                            <div style={style} className="p-3">
                              <div className="transform hover:scale-105 transition-transform duration-200">
                                <Ticket ticket={ticket} />
                              </div>
                            </div>
                          );
                        }}
                      </List>
                    ) : (
                      <Grid
                        columnCount={columns}
                        columnWidth={Math.floor(gridWidth / columns)}
                        height={gridHeight}
                        rowCount={Math.ceil(tickets.length / columns)}
                        rowHeight={CARD_HEIGHT}
                        width={gridWidth}
                      >
                        {(props: GridChildComponentProps) => {
                          const { columnIndex, rowIndex, style } = props;
                          const index = rowIndex * columns + columnIndex;
                          const ticket = tickets[index];
                          if (!ticket) return null;
                          return (
                            <div style={style} className="p-3">
                              <div className="transform hover:scale-105 transition-transform duration-200">
                                <Ticket ticket={ticket} />
                              </div>
                            </div>
                          );
                        }}
                      </Grid>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="card bg-gradient-to-r from-primary to-accent text-primary-foreground text-center">
                  <h3 className="text-xl font-bold mb-4">Ações Rápidas</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Link
                      to="/eventos"
                      className="bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 rounded-none p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-2">🎉</div>
                      <div className="font-semibold">Mais Eventos</div>
                      <div className="text-sm opacity-90">
                        Descubra novos eventos
                      </div>
                    </Link>
                    <Link
                      to="/validador"
                      className="bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 rounded-none p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-2">📱</div>
                      <div className="font-semibold">Validar Ingresso</div>
                      <div className="text-sm opacity-90">
                        Valide ingressos do evento
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
