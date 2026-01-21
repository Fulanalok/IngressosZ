import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { postClientError } from "../services/logger";

function DocView() {
  const [health, setHealth] = useState<null | {
    emulator?: boolean;
    firestoreEmulator?: boolean;
    authEmulator?: boolean;
    time?: string;
  }>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [logSent, setLogSent] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch("/functions/health", { method: "GET" });
        if (!resp.ok) {
          setHealthError(`${resp.status}`);
          return;
        }
        const h = await resp.json();
        setHealth(h);
      } catch (e) {
        setHealthError(String(e));
      }
    };
    load();
  }, []);
  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📘</div>
          <h1 className="text-4xl font-bold text-foreground mb-2">DocView</h1>
          <p className="text-muted-foreground">
            Visão rápida de arquitetura, configs e QA
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Arquitetura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Frontend: React + TypeScript + Vite + Tailwind</p>
              <p>Backend: Firebase Functions + Admin SDK + Mercado Pago</p>
              <p>Autenticação: Firebase Auth; Perfil: Firestore</p>
              <p>Emuladores: Auth 9099, Firestore 8080, Functions 5001</p>
              <p>Contexto de Auth: ingressosZ/src/context/AuthContext.tsx:15</p>
              <p>Logger de erros: ingressosZ/src/services/logger.ts:1</p>
              <p>Endpoint de logs: functions/src/index.ts:962</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status dos Emuladores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!health && !healthError && <p>Carregando status...</p>}
              {healthError && (
                <p className="text-red-600">
                  Erro ao consultar health: {healthError}
                </p>
              )}
              {health && (
                <>
                  <p>
                    {health.emulator ? "Emulador: ativo" : "Emulador: inativo"}
                  </p>
                  <p>
                    {health.firestoreEmulator
                      ? "Firestore: emulador"
                      : "Firestore: real"}
                  </p>
                  <p>{health.authEmulator ? "Auth: emulador" : "Auth: real"}</p>
                  <p>Hora: {health.time}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Hosting rewrites: firebase.json:32</p>
              <p>Vite HTTPS e proxy: ingressosZ/vite.config.ts:25</p>
              <p>Env backend: functions/.env.example</p>
              <p>Env frontend: ingressosZ/.env.example</p>
              <p>
                CORS permitido: https://localhost:5173, http://localhost:5173
              </p>
              <p>Flag produção: ENABLE_PROD_FUNCTIONS</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>QA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Features: qa/features/complete-flow.feature</p>
              <p>Steps: qa/features/steps/*.js</p>
              <p>Executar: npm run dev:all, depois npm run qa:test</p>
              <p>Relatório: npm run qa:report</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rotas úteis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Button asChild>
                  <Link to="/debug/firebase">Debug Firebase</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/dev-auto">Dev Auto</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/validador">Validador</Link>
                </Button>
              </div>
              <p>Validação backend: functions/src/index.ts:548</p>
              <p>Preferência MP: functions/src/index.ts:114</p>
              <p>Webhook MP: functions/src/index.ts:308</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Telemetria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-2 items-center">
                <Button
                  onClick={async () => {
                    await postClientError({
                      type: "docview-test",
                      message: "Teste de log da DocView",
                      ts: Date.now(),
                    });
                    setLogSent(true);
                  }}
                >
                  Enviar log de teste
                </Button>
                {logSent && (
                  <span className="text-green-600">Log enviado ✅</span>
                )}
              </div>
              <p>Endpoint: /functions/logClientError</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DocView;
