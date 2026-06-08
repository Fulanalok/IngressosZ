import { TicketCheck } from "lucide-react";
import { Link } from "react-router";
import { legalInfo } from "@/config/legal";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="showcase-container py-8">
        <div className="grid gap-6 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-card text-primary">
              <TicketCheck className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                © {currentYear} {legalInfo.brandName}. Todos os direitos
                reservados.
              </p>
              <p>Venda, emissão e validação digital de ingressos.</p>
            </div>
          </div>

          <nav aria-label="Links legais" className="flex flex-wrap gap-3">
            <Link
              to="/termos"
              className="border border-border px-3 py-2 text-foreground hover:border-primary"
            >
              Termos de Uso
            </Link>
            <Link
              to="/privacidade"
              className="border border-border px-3 py-2 text-foreground hover:border-primary"
            >
              Política de Privacidade
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
