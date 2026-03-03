import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";

function FirebaseDebug() {
  const [status, setStatus] = useState("Verificando...");
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    const checkFirebaseConnection = async () => {
      const newDetails: string[] = [];

      try {
        // Verificar se a configuração está presente
        newDetails.push(`✅ Firebase Config carregado`);
        const projectId = auth.app?.options?.projectId || "(sem projectId)";
        const apiKeyPrefix = auth.app?.options?.apiKey
          ? auth.app.options.apiKey.substring(0, 10) + "..."
          : "(sem apiKey)";
        const authDomain = auth.app?.options?.authDomain || "(sem authDomain)";
        newDetails.push(`📋 Project ID: ${projectId}`);
        newDetails.push(`🔑 API Key: ${apiKeyPrefix}`);
        newDetails.push(`🌐 Auth Domain: ${authDomain}`);

        // Verificar currentUser
        newDetails.push(
          `👤 Usuário atual: ${auth.currentUser ? "Logado" : "Não logado"}`
        );

        // Tentar uma operação simples de inicialização do Auth
        const maybeAuth = auth as unknown as { authStateReady?: () => Promise<void> };
        const hasAuthStateReady = typeof maybeAuth.authStateReady === "function";
        if (hasAuthStateReady) {
          await maybeAuth.authStateReady!();
        } else {
          await new Promise<void>((resolve) => {
            const unsub = onAuthStateChanged(auth, () => {
              unsub();
              resolve();
            });
          });
        }
        newDetails.push(`✅ Auth service inicializado`);

        setStatus("✅ Firebase conectado com sucesso!");
      } catch (error) {
        console.error("Erro na verificação:", error);
        newDetails.push(
          `❌ Erro: ${error instanceof Error ? error.message : String(error)}`
        );
        setStatus("❌ Erro na configuração do Firebase");
      }

      setDetails(newDetails);
    };

    checkFirebaseConnection();
  }, []);

  return (
    <div className="card max-w-md mx-auto">
      <h3 className="text-lg font-bold mb-4">🔍 Debug Firebase</h3>
      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>
      <div className="space-y-1">
        {details.map((detail, index) => (
          <div key={index} className="text-sm text-gray-600">
            {detail}
          </div>
        ))}
      </div>
  <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Dica:</strong> Se você estiver vendo erro de configuração,
          verifique se o Firebase Authentication está habilitado no console e se
          o domínio localhost está autorizado.
        </p>
      </div>
    </div>
  );
}

export default FirebaseDebug;
