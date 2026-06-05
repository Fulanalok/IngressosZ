import { Link } from "react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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

export default function PrivacyPage() {
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
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-primary">
                Política de Privacidade
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Última atualização: {legalInfo.lastUpdated}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta política explica como o {legalInfo.brandName} trata dados
            pessoais para cadastro, compra, emissão e validação de ingressos
            digitais, conforme a LGPD.
          </p>
        </div>

        <div className="surface-card p-8 md:p-10 space-y-2">
          <Section title="1. Controlador e Contato">
            <p>
              <strong className="text-foreground">Controlador:</strong>{" "}
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
              <strong className="text-foreground">
                Canal de privacidade:
              </strong>{" "}
              {legalInfo.privacyEmail} ({legalInfo.dpoName})
            </p>
            <p>
              <strong className="text-foreground">Suporte:</strong>{" "}
              {legalInfo.supportEmail}
            </p>
          </Section>

          <Section title="2. Dados que Coletamos">
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>
                Dados de cadastro: nome, e-mail, telefone e credenciais
                gerenciadas pelo Firebase Auth.
              </li>
              <li>
                Dados de conta: identificador Firebase, foto, permissões e
                papéis de acesso.
              </li>
              <li>
                Dados de compra: evento, tipo de ingresso, quantidade, status,
                identificadores de pagamento e histórico de reembolso.
              </li>
              <li>
                Dados de validação: QR Code assinado, status do ingresso,
                data/hora de emissão e data/hora de validação.
              </li>
              <li>
                Dados técnicos: IP, navegador, logs de erro, App Check,
                reCAPTCHA, tentativas de acesso e eventos antifraude.
              </li>
            </ul>
            <p>
              Dados de cartão são tratados pelo Mercado Pago. O {legalInfo.brandName}
              não armazena número completo de cartão, CVV ou senha bancária.
            </p>
          </Section>

          <Section title="3. Finalidades e Bases Legais">
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>
                Criar conta, vender e emitir ingressos: execução de contrato.
              </li>
              <li>
                Processar pagamentos e reembolsos: execução de contrato e
                cumprimento de obrigações legais/regulatórias.
              </li>
              <li>
                Validar QR Code, prevenir fraude e proteger a plataforma:
                legítimo interesse e segurança.
              </li>
              <li>
                Enviar e-mails transacionais: execução de contrato.
              </li>
              <li>
                Guardar registros fiscais, contábeis e de auditoria:
                cumprimento de obrigação legal.
              </li>
              <li>
                Comunicações não essenciais ou marketing: consentimento, quando
                essa funcionalidade existir.
              </li>
            </ul>
          </Section>

          <Section title="4. Compartilhamento">
            <p>
              Compartilhamos dados somente quando necessário para operar a
              plataforma:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Google Firebase/Google Cloud: autenticação, banco e storage.</li>
              <li>Mercado Pago: pagamento, Pix, antifraude e reembolso.</li>
              <li>Serviço de e-mail: envio de mensagens transacionais.</li>
              <li>Sentry: diagnóstico de falhas e monitoramento técnico.</li>
              <li>
                Organizadores/validadores: dados mínimos para controle do
                evento, lista de participantes e validação de ingresso.
              </li>
            </ul>
            <p>
              Esses provedores podem tratar dados fora do Brasil. Quando isso
              ocorrer, adotamos fornecedores com medidas contratuais e técnicas
              compatíveis com proteção de dados.
            </p>
          </Section>

          <Section title="5. Retenção e Exclusão">
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Conta: enquanto ativa ou enquanto houver obrigação legal.</li>
              <li>
                Compras, pagamentos, ingressos e reembolsos: pelo prazo exigido
                para defesa de direitos, obrigações fiscais e auditoria.
              </li>
              <li>
                Logs técnicos e antifraude: pelo menor prazo operacional viável,
                salvo necessidade de segurança, investigação ou obrigação legal.
              </li>
            </ul>
            <p>
              Ao final da retenção, os dados são excluídos ou anonimizados de
              forma segura, quando tecnicamente possível.
            </p>
          </Section>

          <Section title="6. Direitos do Titular">
            <p>
              Você pode solicitar confirmação de tratamento, acesso, correção,
              anonimização, bloqueio, eliminação, portabilidade, informação
              sobre compartilhamento, revogação de consentimento, oposição a
              tratamento irregular e revisão de decisões automatizadas quando
              aplicável.
            </p>
            <p>
              Solicitações devem ser enviadas para {legalInfo.privacyEmail}.
              Podemos pedir informações adicionais para confirmar sua identidade
              antes de atender ao pedido.
            </p>
          </Section>

          <Section title="7. Segurança e Incidentes">
            <p>
              Usamos HTTPS/TLS, Firebase Security Rules, App Check, reCAPTCHA,
              segredos em ambiente protegido, QR Code assinado, rate limit e
              registros de auditoria para reduzir riscos.
            </p>
            <p>
              Se houver incidente confirmado envolvendo dados pessoais e risco
              ou dano relevante, avaliaremos as medidas de contenção e a
              necessidade de comunicação aos titulares e à ANPD dentro dos
              prazos regulatórios aplicáveis.
            </p>
          </Section>

          <Section title="8. Cookies, Cache e Monitoramento">
            <p>
              Usamos tecnologias necessárias para autenticação, segurança,
              prevenção de abuso e funcionamento do aplicativo. reCAPTCHA, App
              Check, Firebase e Sentry podem coletar dados técnicos para essas
              finalidades.
            </p>
            <p>
              O aplicativo pode armazenar arquivos estáticos no dispositivo para
              melhorar desempenho. Dados pessoais não devem ser guardados no
              cache offline público do navegador sem necessidade operacional.
            </p>
          </Section>

          <Section title="9. Menores de Idade">
            <p>
              A plataforma não é direcionada a crianças. Compras ou uso por
              menores devem ocorrer com ciência e responsabilidade dos pais ou
              responsáveis, respeitando as regras do evento.
            </p>
          </Section>

          <Section title="10. Alterações">
            <p>
              Esta política pode ser atualizada. Mudanças relevantes serão
              comunicadas por aviso na plataforma, e-mail ou outro canal
              adequado antes de produzirem efeitos relevantes.
            </p>
          </Section>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Veja também nossos{" "}
          <Link to="/termos" className="text-primary hover:underline font-medium">
            Termos de Uso
          </Link>
        </p>
      </div>
    </div>
  );
}
