import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { SEO } from "../components/common/SEO";
import EventCard from "../components/EventCard";
import { Button } from "../components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { useEvents } from "../hooks/useEvents";
import { eventService } from "../services/firestore";

function HomePage() {
  const { userProfile } = useAuth();
  const { events, loading } = useEvents();
  const queryClient = useQueryClient();

  const featuredEvents = events.slice(0, 3);

  const prefetchEvents = () => {
    queryClient.prefetchQuery({
      queryKey: ["events"],
      queryFn: () => eventService.getEvents(8), // Fetch 8 events by default
    });
  };

  return (
    <div className="min-h-screen gradient-bg">
      <SEO
        title="IngressosZ — Ingressos rápidos e seguros"
        description="Compre e gerencie ingressos com rapidez e segurança. Explore eventos e finalize o pagamento com facilidade."
        url="/"
      />
      {/* Main Content */}
      <main className="page-container">
        {/* Hero Section */}
        <section className="relative py-16">
          <div className="absolute inset-0 -z-10 opacity-40 blur-3xl bg-gradient-to-r from-primary/40 via-purple-400/30 to-accent/40" />
          <div className="text-center">
            <h2 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
              Bem-vindo ao IngressosZ! 🎉
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Descubra eventos incríveis, compre ingressos com segurança e viva
              experiências inesquecíveis.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild>
                <Link
                  to="/eventos"
                  onMouseEnter={prefetchEvents}
                  onFocus={prefetchEvents}
                >
                  Explorar Eventos
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link to="/meus-ingressos">Meus Ingressos</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Events Section */}
        {featuredEvents.length > 0 && (
          <section className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Eventos em Destaque
              </h3>
              <Button variant="ghost" asChild>
                <Link to="/eventos">Ver todos &rarr;</Link>
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8">
                {featuredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Why Choose Us Section */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
            Por que usar o IngressosZ?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-all duration-300">
              <div className="text-5xl mb-4">🔒</div>
              <h4 className="text-xl font-bold mb-2">Segurança Total</h4>
              <p className="text-muted-foreground">
                Pagamentos processados com a segurança do Mercado Pago e
                ingressos validados via QR Code criptografado.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-all duration-300">
              <div className="text-5xl mb-4">⚡</div>
              <h4 className="text-xl font-bold mb-2">Compra Rápida</h4>
              <p className="text-muted-foreground">
                Garanta seu ingresso em menos de 1 minuto. Sem filas, sem
                complicações e com confirmação imediata.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-all duration-300">
              <div className="text-5xl mb-4">📱</div>
              <h4 className="text-xl font-bold mb-2">100% Digital</h4>
              <p className="text-muted-foreground">
                Acesse seus ingressos pelo celular a qualquer momento. Esqueça
                impressões e papéis.
              </p>
            </div>
          </div>
        </section>

        {/* Admin/Validator Quick Access (Only for authorized roles) */}
        {(userProfile?.role === "organizer" ||
          userProfile?.role === "validator") && (
          <section className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Acesso Rápido
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {userProfile?.role === "organizer" && (
                <Link to="/admin" className="group">
                  <Card className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="text-4xl">📊</div>
                      <div>
                        <CardTitle>Painel Administrativo</CardTitle>
                        <CardDescription>
                          Gerencie eventos, vendas e relatórios
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )}

              {(userProfile?.role === "organizer" ||
                userProfile?.role === "validator") && (
                <Link to="/validador" className="group">
                  <Card className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg bg-secondary/5 border-secondary/20">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="text-4xl">🔍</div>
                      <div>
                        <CardTitle>Validador de Ingressos</CardTitle>
                        <CardDescription>
                          Escaneie e valide ingressos na portaria
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default HomePage;
