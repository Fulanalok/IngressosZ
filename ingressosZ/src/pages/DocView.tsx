import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { postClientError } from "@/services/logger";

function DocView() {
  const [health, setHealth] = useState<null | {
    emulator?: boolean;
    firestoreEmulator?: boolean;
    authEmulator?: boolean;
    time?: string;
  }>(null);
  const [logSent, setLogSent] = useState<boolean>(false);

  useEffect(() => {
    // Em produção ou ambiente real, essa rota pode não existir ou ser diferente.
    // Tenta bater no endpoint de healthcheck (se existir) ou apenas simula.
    // Como não temos um endpoint "/functions/health" explícito no código atual,
    // vamos adaptar para não quebrar a tela se falhar.
    const load = async () => {
      try {
        // Ajuste: O endpoint correto seria algo como /api/health ou uma Cloud Function específica.
        // Se não houver, vamos apenas mostrar o estado local.
        // Para este exemplo, vou supor que o usuário queira ver o estado dos emuladores.
        const isEmulator = import.meta.env.VITE_USE_EMULATORS === "true";
        setHealth({
            emulator: isEmulator,
            firestoreEmulator: isEmulator,
            authEmulator: isEmulator,
            time: new Date().toISOString()
        });
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📘</div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Documentação do Sistema (DocView)</h1>
          <p className="text-muted-foreground">
            Visão geral técnica, status do ambiente e ferramentas de desenvolvimento.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Arquitetura do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Frontend:</strong> React 19 + TypeScript + Vite + Tailwind CSS v4</p>
              <p><strong>Backend:</strong> Firebase Cloud Functions v2 + Node.js 20</p>
              <p><strong>Banco de Dados:</strong> Firestore (NoSQL)</p>
              <p><strong>Autenticação:</strong> Firebase Auth</p>
              <p><strong>Pagamentos:</strong> Mercado Pago (SDK v2.12)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ambiente de Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
             <p><strong>Status:</strong> {import.meta.env.VITE_USE_EMULATORS === "true" ? "🟢 Emuladores Ativos" : "☁️ Produção / Remoto"}</p>
             <div className="bg-muted p-2 rounded mt-2">
                <p className="font-mono text-xs">Auth: porta 9099</p>
                <p className="font-mono text-xs">Firestore: porta 8080</p>
                <p className="font-mono text-xs">Functions: porta 5001</p>
             </div>
             {health && (
                <p className="text-xs text-muted-foreground mt-2">Última verificação: {health.time}</p>
             )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações Importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Vite Config:</strong> Proxy para emuladores e aliases (@)</p>
              <p><strong>CI/CD:</strong> GitHub Actions configurado (.github/workflows/ci.yml)</p>
              <p><strong>Linting:</strong> ESLint + Prettier</p>
              <p><strong>Testes:</strong> Vitest (Unitários/Integração)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links Úteis e Ferramentas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/debug/firebase">Debug Firebase</Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/dev-auto">Auto Setup (Dev)</Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/validador">Validador de Ingressos</Link>
                </Button>
                 <Button asChild variant="outline" size="sm">
                  <a href="http://localhost:4000" target="_blank" rel="noreferrer">Emulator UI</a>
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                  <p className="font-semibold mb-2">Webhooks & Endpoints:</p>
                  <ul className="list-disc pl-5 space-y-1">
                      <li><code>/mercadopagoWebhook</code>: Recebe notificações de pagamento</li>
                      <li><code>/logClientError</code>: Centraliza logs do frontend</li>
                      <li><code>setAdminRole</code>: Função Callable para gestão de permissões</li>
                  </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teste de Telemetria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground mb-2">Envia um erro simulado para o backend testar o logger.</p>
              <div className="flex gap-2 items-center">
                <Button
                  onClick={async () => {
                    try {
                        await postClientError({
                        type: "docview-test",
                        message: "Teste manual de log via DocView",
                        ts: Date.now(),
                        });
                        setLogSent(true);
                        setTimeout(() => setLogSent(false), 3000);
                    } catch (err) {
                        console.error("Falha ao enviar log", err);
                    }
                  }}
                >
                  Enviar Log de Teste
                </Button>
                {logSent && (
                  <span className="text-green-600 font-medium animate-pulse">Log enviado com sucesso! ✅</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DocView;
