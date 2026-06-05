import { Link } from "react-router";
import { legalInfo } from "@/config/legal";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="page-container py-8">
        <div className="grid gap-6 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-3">
            <p className="font-semibold text-foreground">
              © {currentYear} {legalInfo.brandName}. Todos os direitos
              reservados.
            </p>
          </div>

          <nav aria-label="Links legais" className="flex flex-wrap gap-4">
            <Link to="/termos" className="text-primary hover:underline">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
