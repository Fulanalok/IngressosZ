import { Link } from "react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { legalInfo } from "@/config/legal";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
        <span className="w-1 h-5 bg-primary rounded-full inline-block shrink-0" />
        {title}
      </h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-3">
        {children}
      </div>
    </section>
  );
}
export default function TermsPage() {
  return (
    <div className="min-h-screen page-bg pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        <div className="surface-card p-8 md:p-10 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-primary">
                Termos de Uso
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Última atualização: {legalInfo.lastUpdated}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Estes termos regulam o uso do {legalInfo.brandName} para divulgação,
            compra, emissão, validação e eventual reembolso de ingressos
            digitais.
          </p>
        </div>

        <div className="surface-card p-8 md:p-10 space-y-2">
          <Section title="1. Identificação">
            <p>
              <strong className="text-foreground">Responsável:</strong>{" "}
              {legalInfo.controllerName}
            </p>
            <p>
              <strong className="text-foreground">CNPJ/CPF:</strong>{" "}
              {legalInfo.controllerDocument}
            </p>
            <p>
              <strong className="text-foreground">Endereço:</strong>{" "}
              {legalInfo.controllerAddress}
            </p>
            <p>
              <strong className="text-foreground">Atendimento:</strong>{" "}
              {legalInfo.supportEmail}
            </p>
          </Section>

          <Section title="2. Aceitação e Conta">
            <p>
              Ao criar conta, navegar, comprar ou validar ingressos, você
              concorda com estes termos e com a Política de Privacidade. Se não
              concordar, não use a plataforma.
            </p>
            <p>
              Você deve fornecer informações verdadeiras, manter suas credenciais
              protegidas e avisar o suporte se identificar acesso indevido.
            </p>
          </Section>

          <Section title="3. Ofertas, Preços e Eventos">
            <p>
              Cada evento deve informar, antes da compra, nome, data, horário,
              local, lote/tipo de ingresso, preço, quantidade e regras
              relevantes de acesso. Os valores são exibidos em reais.
            </p>
            <p>
              Taxas, restrições de idade, regras de entrada, documentação
              exigida, meia-entrada e acessibilidade devem ser informadas pelo
              organizador quando aplicáveis.
            </p>
            <p>
              A disponibilidade do ingresso só é confirmada após aprovação do
              pagamento e emissão do ticket pela plataforma.
            </p>
          </Section>

          <Section title="4. Pagamento e Emissão">
            <p>
              Pagamentos são processados pelo Mercado Pago. O {legalInfo.brandName}
              não armazena dados completos de cartão, CVV ou senha bancária.
            </p>
            <p>
              Pagamentos recusados, expirados, contestados ou cancelados não
              geram direito automático ao ingresso. A emissão ocorre após
              confirmação do provedor de pagamento.
            </p>
          </Section>

          <Section title="5. Uso do Ingresso">
            <p>
              O ingresso é pessoal, digital e validado por QR Code assinado.
              Tentativas de falsificação, revenda irregular, duplicidade,
              alteração de QR Code ou abuso da plataforma podem causar bloqueio
              de conta, cancelamento do ingresso e comunicação às autoridades
              competentes quando necessário.
            </p>
            <p>
              O QR Code usado uma vez pode ser marcado como utilizado e não deve
              permitir novo acesso ao evento.
            </p>
          </Section>

          <Section title="6. Cancelamento, Reembolso e Arrependimento">
            <p>
              Pedidos de cancelamento e reembolso serão avaliados conforme a
              política do evento, o Código de Defesa do Consumidor, as normas de
              comércio eletrônico e demais regras aplicáveis.
            </p>
            <p>
              Se o evento for cancelado pelo organizador, o reembolso integral
              deve ser processado pelo método de pagamento original, observados
              os prazos do provedor financeiro.
            </p>
            <p>
              Em caso de adiamento, mudança relevante de local, data ou horário,
              o organizador deve comunicar os compradores e disponibilizar
              alternativa adequada, inclusive reembolso quando exigido pela lei.
            </p>
          </Section>

          <Section title="7. Organizadores e Validadores">
            <p>
              Organizadores são responsáveis pelas informações do evento, pela
              realização, pela disponibilidade de ingressos, pelas regras de
              acesso e pelo cumprimento das normas aplicáveis ao evento.
            </p>
            <p>
              Validadores e administradores devem usar os dados de participantes
              apenas para controle de acesso, suporte, auditoria e segurança do
              evento.
            </p>
          </Section>

          <Section title="8. Suporte e Atendimento">
            <p>
              Dúvidas, reclamações, solicitações de reembolso e problemas de
              acesso devem ser enviados para {legalInfo.supportEmail}. O
              atendimento deve permitir acompanhamento do pedido e retorno em
              prazo razoável.
            </p>
          </Section>

          <Section title="9. Privacidade e Segurança">
            <p>
              O tratamento de dados pessoais segue a Política de Privacidade. O
              uso da plataforma depende de medidas antifraude, autenticação,
              reCAPTCHA, App Check, logs técnicos e validação segura de QR Code.
            </p>
          </Section>

          <Section title="10. Responsabilidade">
            <p>
              O {legalInfo.brandName} pode atuar como plataforma tecnológica e
              intermediadora de venda, enquanto o organizador responde pela
              realização do evento e pela veracidade das informações publicadas.
            </p>
            <p>
              Nenhuma cláusula destes termos limita direitos legais do
              consumidor ou exclui responsabilidades que não possam ser afastadas
              pela legislação brasileira.
            </p>
          </Section>

          <Section title="11. Lei Aplicável">
            <p>
              Estes termos são regidos pelas leis brasileiras. Conflitos serão
              tratados pelos canais de atendimento e, quando necessário, pelo
              foro competente conforme a legislação aplicável, sem prejuízo dos
              direitos do consumidor.
            </p>
          </Section>

          <Section title="12. Alterações">
            <p>
              Estes termos podem ser atualizados. Mudanças relevantes serão
              comunicadas por aviso na plataforma, e-mail ou outro canal
              adequado antes de produzirem efeitos relevantes.
            </p>
          </Section>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Veja também nossa{" "}
          <Link
            to="/privacidade"
            className="text-primary hover:underline font-medium"
          >
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
