import { Link, useLocation } from "react-router-dom";
import { useAuth } from '@/hooks/auth/useAuth';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';

function Navbar() {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Erro ao deslogar", e);
    }
  };

  return (
    <nav className="nav-bg">
      <div className="page-container h-20">
        <div className="flex justify-between items-center h-full">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center text-foreground hover:opacity-80 transition-all font-black text-2xl tracking-tighter"
          >
            <span className="blue-gradient-text">IngressosZ</span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`nav-link ${
                isActive("/") && location.pathname === "/"
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Início
            </Link>
            <Link
              to="/eventos"
              className={`nav-link ${
                isActive("/eventos") ? "text-primary font-bold" : ""
              }`}
            >
              Eventos
            </Link>
            <Link
              to="/meus-ingressos"
              className={`nav-link ${
                isActive("/meus-ingressos") ? "text-primary font-bold" : ""
              }`}
            >
              Meus ingressos
            </Link>
            {userProfile?.role === "organizer" && (
              <Link
                to="/admin"
                className={`nav-link ${
                  isActive("/admin") ? "text-primary font-bold" : ""
                }`}
              >
                Painel Admin
              </Link>
            )}
            {(userProfile?.role === "validator" || userProfile?.role === "organizer") && (
              <Link
                to="/validador"
                className={`nav-link ${
                  isActive("/validador") ? "text-primary font-bold" : ""
                }`}
              >
                Validador
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {userProfile ? (
              <div className="flex items-center space-x-3">
                <span className="hidden lg:block text-sm font-medium border-l border-border pl-4 ml-2">
                  <span className="text-muted-foreground mr-1">Olá,</span>
                  <span className="text-foreground">{userProfile.displayName || userProfile.email?.split('@')[0]}</span>
                </span>
                <Button variant="secondary" size="sm" onClick={handleLogout} className="border-border/60 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all">
                  Sair
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" className="btn-primary rounded-xl px-6">
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
