import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/firebaseConfig";

type DebugResult = {
  details: string[];
  status: string;
};

function getConfigValue(value: string | undefined, fallback: string) {
  return value || fallback;
}

function getApiKeyPrefix(apiKey: string | undefined) {
  return apiKey ? `${apiKey.substring(0, 10)}...` : "(sem apiKey)";
}

function getCurrentUserStatus() {
  return auth.currentUser ? "Logado" : "Nao logado";
}

function getFirebaseConfigDetails() {
  const options = auth.app?.options;
  const projectId = getConfigValue(options?.projectId, "(sem projectId)");
  const apiKeyPrefix = getApiKeyPrefix(options?.apiKey);
  const authDomain = getConfigValue(options?.authDomain, "(sem authDomain)");

  return [
    "Firebase Config carregado",
    `Project ID: ${projectId}`,
    `API Key: ${apiKeyPrefix}`,
    `Auth Domain: ${authDomain}`,
    `Usuario atual: ${getCurrentUserStatus()}`,
  ];
}

async function waitForAuthState() {
  const maybeAuth = auth as unknown as { authStateReady?: () => Promise<void> };

  if (typeof maybeAuth.authStateReady === "function") {
    await maybeAuth.authStateReady();
    return;
  }

  await new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });
}

async function checkFirebaseConnection(): Promise<DebugResult> {
  const details = getFirebaseConfigDetails();

  try {
    await waitForAuthState();
    details.push("Auth service inicializado");
    return { details, status: "Firebase conectado com sucesso!" };
  } catch (error) {
    console.error("Erro na verificacao:", error);
    details.push(
      `Erro: ${error instanceof Error ? error.message : String(error)}`
    );
    return { details, status: "Erro na configuracao do Firebase" };
  }
}

function FirebaseDebug() {
  const [status, setStatus] = useState("Verificando...");
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    checkFirebaseConnection().then((result) => {
      setStatus(result.status);
      setDetails(result.details);
    });
  }, []);

  return (
    <div className="card max-w-md mx-auto">
      <h3 className="text-lg font-bold mb-4">Debug Firebase</h3>
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
          <strong>Dica:</strong> Se voce estiver vendo erro de configuracao,
          verifique se o Firebase Authentication esta habilitado no console e se
          o dominio localhost esta autorizado.
        </p>
      </div>
    </div>
  );
}

export default FirebaseDebug;
