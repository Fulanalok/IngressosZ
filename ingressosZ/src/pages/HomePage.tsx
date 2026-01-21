import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { eventService } from "../services/firestore";

function HomePage() {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const prefetchEvents = () => {
    queryClient.prefetchQuery({
      queryKey: ["events"],
      queryFn: () => eventService.getEvents(),
    });
  };

  useEffect(() => {
    const title = "IngressosZ — Ingressos rápidos e seguros";
    const description =
      "Compre e gerencie ingressos com rapidez e segurança. Explore eventos e finalize o pagamento com facilidade.";
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(
        `meta[name='${name}']`
      ) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    const setProperty = (property: string, content: string) => {
      let tag = document.querySelector(
        `meta[property='${property}']`
      ) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    setMeta("description", description);
    setProperty("og:title", title);
    setProperty("og:description", description);
    const canonical = document.querySelector(
      "link[rel='canonical']"
    ) as HTMLLinkElement | null;
    if (canonical) canonical.href = "/";
  }, []);

  return (
    <div className="min-h-screen gradient-bg">
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

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Link to="/eventos" className="group">
            <Card className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="text-5xl mb-2">📅</div>
                <CardTitle>Eventos</CardTitle>
                <CardDescription>
                  Explore os melhores eventos da cidade
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-center">
                <Button>Ver Eventos</Button>
              </CardFooter>
            </Card>
          </Link>

          <Link to="/meus-ingressos" className="group">
            <Card className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="text-5xl mb-2">🎫</div>
                <CardTitle>Meus Ingressos</CardTitle>
                <CardDescription>
                  Gerencie seus ingressos e acessos
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-center">
                <Button>Ver Ingressos</Button>
              </CardFooter>
            </Card>
          </Link>

          {userProfile?.role === "validator" && (
            <Link to="/validador" className="group">
              <Card className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
                <CardHeader className="text-center">
                  <div className="text-5xl mb-2">✅</div>
                  <CardTitle>Validador</CardTitle>
                  <CardDescription>
                    Valide ingressos nos eventos
                  </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center">
                  <Button>Abrir Validador</Button>
                </CardFooter>
              </Card>
            </Link>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-none p-8 text-center text-primary-foreground">
          <h3 className="text-2xl font-bold mb-4">Pronto para se divertir?</h3>
          <p className="text-lg mb-6 opacity-90">
            Confira os eventos mais quentes da cidade e garante já seu ingresso!
          </p>
          <Button variant="secondary" asChild>
            <Link to="/eventos">Explorar Eventos 🚀</Link>
          </Button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              500+
            </div>
            <div className="text-gray-600 dark:text-gray-300">Eventos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">
              10k+
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              Ingressos Vendidos
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              50+
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              Organizadores
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              4.9★
            </div>
            <div className="text-gray-600 dark:text-gray-300">Avaliação</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
