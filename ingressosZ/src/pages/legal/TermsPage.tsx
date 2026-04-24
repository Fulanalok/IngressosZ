import { Link } from "react-router";
import { FileText, ArrowLeft } from "lucide-react";

const LAST_UPDATED = "2 de abril de 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
    <div className="min-h-screen gradient-bg pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        {/* Header */}
        <div className="glass-card p-8 md:p-10 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold blue-gradient-text">Termos de Uso</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Última atualização: {LAST_UPDATED}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bem-vindo ao <strong className="text-foreground">IngressosZ</strong>. Ao acessar ou utilizar nossa
            plataforma, você concorda com os termos descritos abaixo. Leia com atenção antes de
            criar sua conta ou realizar qualquer compra.
          </p>
        </div>

        {/* Content */}
        <div className="glass-card p-8 md:p-10 space-y-2">
          <Section title="1. Aceitação dos Termos">
            <p>
              O uso da plataforma IngressosZ implica a aceitação integral e irrestrita destes
              Termos de Uso. Caso não concorde com qualquer disposição, não utilize nossos serviços.
            </p>
            <p>
              Reservamo-nos o direito de atualizar estes termos a qualquer momento. Alterações
              significativas serão comunicadas por e-mail ou via notificação na plataforma.
            </p>
          </Section>

          <Section title="2. Cadastro e Conta">
            <p>
              Para adquirir ingressos, é necessário criar uma conta com informações verdadeiras e
              atualizadas. Você é responsável pela confidencialidade de sua senha e por todas as
              atividades realizadas em sua conta.
            </p>
            <p>
              O IngressosZ poderá, a seu critério, suspender ou encerrar contas que violem estes
              termos ou que apresentem comportamento fraudulento.
            </p>
          </Section>

          <Section title="3. Compra de Ingressos">
            <p>
              Ao confirmar uma compra, você garante que as informações fornecidas são verídicas e
              que possui meios de pagamento válidos. A confirmação da compra está sujeita à
              aprovação do pagamento pelo provedor financeiro.
            </p>
            <p>
              Os ingressos adquiridos são pessoais e intransferíveis, salvo quando expressamente
              autorizado pelo organizador do evento.
            </p>
            <p>
              O IngressosZ atua como intermediador entre o comprador e o organizador do evento.
              A realização do evento é de responsabilidade exclusiva do organizador.
            </p>
          </Section>

          <Section title="4. Política de Reembolso">
            <p>
              Cancelamentos e reembolsos seguem a política definida pelo organizador de cada
              evento. O IngressosZ não garante reembolso automático em caso de cancelamento
              unilateral pelo comprador.
            </p>
            <p>
              Em caso de cancelamento do evento pelo organizador, o reembolso integral será
              processado no prazo de até 10 dias úteis pelo método de pagamento original.
            </p>
          </Section>

          <Section title="5. Propriedade Intelectual">
            <p>
              Todo o conteúdo da plataforma — incluindo marca, logotipos, textos, imagens e
              software — é propriedade do IngressosZ e protegido pelas leis de propriedade
              intelectual. É vedada qualquer reprodução sem autorização prévia e expressa.
            </p>
          </Section>

          <Section title="6. Limitação de Responsabilidade">
            <p>
              O IngressosZ não se responsabiliza por danos decorrentes de falhas em sistemas de
              terceiros (provedores de pagamento, infraestrutura de nuvem), por atos do
              organizador do evento, ou por força maior.
            </p>
            <p>
              Nossa responsabilidade é limitada ao valor pago pelo ingresso em questão.
            </p>
          </Section>

          <Section title="7. Conduta do Usuário">
            <p>É expressamente proibido:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Utilizar a plataforma para fins fraudulentos ou ilegais</li>
              <li>Revender ingressos com sobrepreço (cambismo)</li>
              <li>Tentar contornar sistemas de segurança ou validação</li>
              <li>Realizar engenharia reversa em qualquer componente da plataforma</li>
            </ul>
          </Section>

          <Section title="8. Lei Aplicável">
            <p>
              Estes Termos de Uso são regidos pelas leis brasileiras. Fica eleito o foro da
              comarca da sede do IngressosZ para resolução de quaisquer disputas, com renúncia
              a qualquer outro, por mais privilegiado que seja.
            </p>
          </Section>

          <Section title="9. Contato">
            <p>
              Para dúvidas sobre estes termos, entre em contato pelo e-mail de suporte disponível
              na plataforma. Faremos o possível para responder em até 3 dias úteis.
            </p>
          </Section>
        </div>

        {/* Footer links */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Veja também nossa{" "}
          <Link to="/privacidade" className="text-primary hover:underline font-medium">
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
