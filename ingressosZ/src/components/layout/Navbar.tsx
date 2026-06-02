import { Ticket } from "lucide-react";
import { Link, useLocation } from "react-router";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ADMIN_PANEL_ROLES, VALIDATOR_ROLES } from "@/constants/roles";
import { useAuth } from "@/hooks/auth/useAuth";

function Navbar() {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navClass = (path: string, exact = false) => {
    const active = exact ? location.pathname === path : isActive(path);
    return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao deslogar", error);
    }
  };

  return (
    <nav className="nav-bg">
      <div className="page-container h-20 py-0">
        <div className="flex h-full items-center justify-between gap-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3 text-foreground transition-opacity hover:opacity-90"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
              <Ticket className="h-5 w-5" />
            </span>
            <span className="min-w-0 leading-none">
              <span className="block text-xl font-bold tracking-tight">
                IngressosZ
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:block">
                venda de ingressos
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-lg border border-border bg-card p-1 md:flex">
            <Link to="/" className={navClass("/", true)}>
              Início
            </Link>
            <Link to="/eventos" className={navClass("/eventos")}>
              Eventos
            </Link>
            <Link to="/meus-ingressos" className={navClass("/meus-ingressos")}>
              Meus ingressos
            </Link>
            {userProfile && ADMIN_PANEL_ROLES.includes(userProfile.role) && (
              <Link to="/admin" className={navClass("/admin")}>
                Painel Admin
              </Link>
            )}
            {userProfile && VALIDATOR_ROLES.includes(userProfile.role) && (
              <Link to="/validador" className={navClass("/validador")}>
                Validador
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {userProfile ? (
              <div className="flex items-center gap-3">
                <span className="hidden border-l border-border pl-4 text-sm font-medium lg:block">
                  <span className="text-muted-foreground">Olá,</span>{" "}
                  <span className="text-foreground">
                    {userProfile.displayName || userProfile.email?.split("@")[0]}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                  className="hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                >
                  Sair
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" className="px-5">
                <Link to="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
