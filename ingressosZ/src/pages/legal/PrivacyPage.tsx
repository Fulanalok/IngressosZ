import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";

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

export default function PrivacyPage() {
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
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold blue-gradient-text">Política de Privacidade</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Última atualização: {LAST_UPDATED}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O <strong className="text-foreground">IngressosZ</strong> leva a sua privacidade a sério. Este documento
            explica quais dados coletamos, como os utilizamos e quais são seus direitos como titular,
            em conformidade com a{" "}
            <strong className="text-foreground">Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.
          </p>
        </div>

        {/* Content */}
        <div className="glass-card p-8 md:p-10 space-y-2">
          <Section title="1. Dados que Coletamos">
            <p>Coletamos apenas os dados necessários para a prestação do serviço:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>
                <strong className="text-foreground">Dados de cadastro:</strong> nome, endereço de e-mail e senha
                (armazenada de forma criptografada)
              </li>
              <li>
                <strong className="text-foreground">Dados de pagamento:</strong> processados diretamente pelo
                Mercado Pago; não armazenamos dados de cartão de crédito
              </li>
              <li>
                <strong className="text-foreground">Dados de ingressos:</strong> histórico de compras e validações
                vinculado ao seu perfil
              </li>
              <li>
                <strong className="text-foreground">Dados técnicos:</strong> endereço IP, logs de acesso e erros,
                para segurança e diagnóstico
              </li>
            </ul>
          </Section>

          <Section title="2. Finalidade do Tratamento">
            <p>Seus dados são utilizados exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Criação e gestão da sua conta na plataforma</li>
              <li>Processamento e confirmação de pagamentos</li>
              <li>Emissão e validação de ingressos</li>
              <li>Envio de e-mails transacionais (confirmação de compra, redefinição de senha)</li>
              <li>Prevenção a fraudes e manutenção da segurança</li>
              <li>Cumprimento de obrigações legais</li>
            </ul>
            <p>
              <strong className="text-foreground">Não vendemos, alugamos ou compartilhamos</strong> seus dados
              pessoais com terceiros para fins de marketing.
            </p>
          </Section>

          <Section title="3. Base Legal">
            <p>O tratamento dos seus dados é fundamentado nas seguintes bases legais da LGPD:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>
                <strong className="text-foreground">Execução de contrato</strong> — para processar compras e emitir
                ingressos (Art. 7°, V)
              </li>
              <li>
                <strong className="text-foreground">Consentimento</strong> — para o envio de comunicações não
                essenciais, quando aplicável (Art. 7°, I)
              </li>
              <li>
                <strong className="text-foreground">Legítimo interesse</strong> — para prevenção a fraudes e
                segurança da plataforma (Art. 7°, IX)
              </li>
              <li>
                <strong className="text-foreground">Cumprimento de obrigação legal</strong> — quando exigido por
                autoridades competentes (Art. 7°, II)
              </li>
            </ul>
          </Section>

          <Section title="4. Compartilhamento de Dados">
            <p>Compartilhamos dados apenas com parceiros essenciais à prestação do serviço:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>
                <strong className="text-foreground">Google Firebase</strong> — autenticação, banco de dados e
                armazenamento de arquivos
              </li>
              <li>
                <strong className="text-foreground">Mercado Pago</strong> — processamento de pagamentos (sujeito à
                política de privacidade do Mercado Pago)
              </li>
              <li>
                <strong className="text-foreground">Sentry</strong> — monitoramento de erros (dados anonimizados)
              </li>
            </ul>
            <p>
              Todos os parceiros são contratualmente obrigados a tratar seus dados em conformidade
              com a LGPD e regulamentações equivalentes.
            </p>
          </Section>

          <Section title="5. Retenção de Dados">
            <p>
              Mantemos seus dados pelo tempo necessário para a prestação do serviço e cumprimento
              de obrigações legais:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Dados de conta: enquanto a conta estiver ativa</li>
              <li>Dados de transações: 5 anos (prazo fiscal mínimo exigido por lei)</li>
              <li>Logs técnicos: até 90 dias</li>
            </ul>
            <p>
              Após o período de retenção, os dados são anonimizados ou excluídos de forma segura.
            </p>
          </Section>

          <Section title="6. Seus Direitos (LGPD)">
            <p>Como titular de dados, você tem os seguintes direitos:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>
                <strong className="text-foreground">Acesso</strong> — solicitar uma cópia dos seus dados pessoais
              </li>
              <li>
                <strong className="text-foreground">Correção</strong> — atualizar dados incompletos ou incorretos
                diretamente no seu perfil
              </li>
              <li>
                <strong className="text-foreground">Exclusão</strong> — solicitar a remoção dos seus dados,
                respeitados os prazos legais de retenção
              </li>
              <li>
                <strong className="text-foreground">Portabilidade</strong> — receber seus dados em formato
                estruturado
              </li>
              <li>
                <strong className="text-foreground">Revogação do consentimento</strong> — a qualquer momento, sem
                prejuízo ao tratamento realizado anteriormente
              </li>
            </ul>
            <p>
              Para exercer qualquer um desses direitos, entre em contato pelo e-mail de suporte
              disponível na plataforma.
            </p>
          </Section>

          <Section title="7. Segurança">
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso
              não autorizado, perda ou alteração, incluindo:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Criptografia em trânsito (HTTPS/TLS) e em repouso</li>
              <li>Autenticação multifator disponível para contas administrativas</li>
              <li>Regras de acesso restritivas no banco de dados (Firestore Security Rules)</li>
              <li>Tokens de QR Code assinados digitalmente para prevenção de falsificação</li>
              <li>Monitoramento contínuo de erros e anomalias</li>
            </ul>
          </Section>

          <Section title="8. Cookies e Rastreamento">
            <p>
              Utilizamos apenas cookies essenciais para o funcionamento da plataforma (sessão de
              autenticação). Não utilizamos cookies de rastreamento publicitário ou pixels de
              terceiros.
            </p>
          </Section>

          <Section title="9. Alterações nesta Política">
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças
              significativas por e-mail ou via aviso na plataforma com pelo menos 15 dias de
              antecedência.
            </p>
          </Section>

          <Section title="10. Contato e Encarregado (DPO)">
            <p>
              Para questões sobre privacidade ou para exercer seus direitos, entre em contato
              através do e-mail de suporte disponível na plataforma. Retornaremos em até 15 dias
              úteis, conforme exigido pela LGPD.
            </p>
          </Section>
        </div>

        {/* Footer links */}
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
