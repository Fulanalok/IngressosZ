import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebaseConfig";

function DevAutoPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Inicializando...");

  useEffect(() => {
    const run = async () => {
      if (import.meta.env.PROD) {
        setStatus("Rota disponível apenas em desenvolvimento.");
        return;
      }

      try {
        setStatus("Verificando autenticação...");
        if (!auth.currentUser) {
          setStatus("Autenticando anonimamente...");
          await signInAnonymously(auth);
        }

        setStatus("Seedando banco de dados via Functions...");
        const seedDatabase = httpsCallable(functions, "seedDatabase");
        await seedDatabase();

        setStatus("Concluído! Redirecionando...");
        navigate("/meus-ingressos", { replace: true });
      } catch (err) {
        console.error("DevAutoPage error:", err);
        const message = err instanceof Error ? err.message : String(err);
        setStatus(`Erro: ${message}`);
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="card p-6 text-center">
        <div className="text-5xl mb-3">🛠️</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Dev Auto Setup
        </h1>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}

export default DevAutoPage;