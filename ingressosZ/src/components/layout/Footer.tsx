import { Link } from "react-router";
import { legalInfo } from "@/config/legal";

function Footer() {
  const currentYear = new Date().getFullYear();
  const supportEmailConfigured = legalInfo.supportEmail.includes("@");
  const privacyEmailConfigured = legalInfo.privacyEmail.includes("@");

  return (
    <footer className="border-t border-border bg-background">
      <div className="page-container py-8">
        <div className="grid gap-6 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-3">
            <p className="font-semibold text-foreground">
              © {currentYear} {legalInfo.brandName}. Todos os direitos
              reservados.
            </p>
            <p>
              Pagamentos processados pelo Mercado Pago. A plataforma usa
              Firebase Auth, App Check/reCAPTCHA e QR Code assinado para
              proteger acesso, compra e validação de ingressos.
            </p>
            <p>
              Suporte:{" "}
              {supportEmailConfigured ? (
                <a
                  href={`mailto:${legalInfo.supportEmail}`}
                  className="text-primary hover:underline"
                >
                  {legalInfo.supportEmail}
                </a>
              ) : (
                legalInfo.supportEmail
              )}{" "}
              · Privacidade:{" "}
              {privacyEmailConfigured ? (
                <a
                  href={`mailto:${legalInfo.privacyEmail}`}
                  className="text-primary hover:underline"
                >
                  {legalInfo.privacyEmail}
                </a>
              ) : (
                legalInfo.privacyEmail
              )}
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
