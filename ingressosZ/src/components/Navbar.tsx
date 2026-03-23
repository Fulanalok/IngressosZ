import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";

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
      <div className="page-container">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center text-foreground hover:text-primary transition-colors"
          >
            <span className="text-xl font-bold">IngressosZ</span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`nav-link ${
                isActive("/") && location.pathname === "/"
                  ? "text-foreground"
                  : ""
              }`}
            >
              Início
            </Link>
            <Link
              to="/eventos"
              className={`nav-link ${
                isActive("/eventos") ? "text-foreground" : ""
              }`}
            >
              Eventos
            </Link>
            <Link
              to="/meus-ingressos"
              className={`nav-link ${
                isActive("/meus-ingressos") ? "text-foreground" : ""
              }`}
            >
              Meus ingressos
            </Link>
            <Link
              to="/perfil"
              className={`nav-link ${
                isActive("/perfil") ? "text-foreground" : ""
              }`}
            >
              Perfil
            </Link>
            {userProfile?.role === "organizer" && (
              <Link
                to="/admin"
                className={`nav-link ${
                  isActive("/admin") ? "text-foreground" : ""
                }`}
              >
                Painel Admin
              </Link>
            )}
            {userProfile?.role === "validator" && (
              <>
                <Link
                  to="/validador"
                  className={`nav-link ${
                    isActive("/validador") ? "text-foreground" : ""
                  }`}
                >
                  Validador
                </Link>
                <Link
                  to="/teste-qr"
                  className={`nav-link ${
                    isActive("/teste-qr") ? "text-foreground" : ""
                  }`}
                >
                  Teste QR
                </Link>
              </>
            )}
            <Link
              to="/doc"
              className={`nav-link ${
                isActive("/doc") ? "text-foreground" : ""
              }`}
            >
              Docs
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            {userProfile && (
              <>
                <span className="hidden sm:block text-sm text-muted-foreground">
                  Olá, {userProfile.displayName || userProfile.email}
                </span>
                <Button variant="destructive" size="sm" onClick={handleLogout}>
                  Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
