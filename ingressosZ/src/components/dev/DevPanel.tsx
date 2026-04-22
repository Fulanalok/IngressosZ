import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { functions } from '@/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import { seedSampleEvents } from '@/utils/seedData';

function DevPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isEmulator =
    import.meta.env.DEV &&
    String(import.meta.env.VITE_USE_EMULATORS ?? "false").toLowerCase() ===
      "true";

  const handleBecomeOrganizer = async () => {
    if (!isEmulator) {
      setMessage("Este recurso exige emuladores habilitados.");
      return;
    }
    if (!user) {
      setMessage("Erro: você precisa estar logado para virar organizador");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const setUserRole = httpsCallable(functions, "setUserRole");
      await setUserRole({ uid: user.uid, role: "organizer" });
      setMessage("Sucesso: role atualizada para organizador.");
    } catch (error) {
      setMessage(
        "Erro ao atualizar perfil: " +
          (error instanceof Error ? error.message : "Erro desconhecido")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeValidator = async () => {
    if (!isEmulator) {
      setMessage("Este recurso exige emuladores habilitados.");
      return;
    }
    if (!user) {
      setMessage("Erro: você precisa estar logado para virar validador");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const setUserRole = httpsCallable(functions, "setUserRole");
      await setUserRole({ uid: user.uid, role: "validator" });
      setMessage("Sucesso: role atualizada para validador.");
    } catch (error) {
      setMessage(
        "Erro ao atualizar perfil: " +
          (error instanceof Error ? error.message : "Erro desconhecido")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSeedEvents = async () => {
    setLoading(true);
    setMessage("");

    try {
      await seedSampleEvents();
      setMessage("Sucesso: eventos de exemplo adicionados.");
    } catch (error) {
      setMessage(
        "Erro ao adicionar eventos: " +
          (error instanceof Error ? error.message : "Erro desconhecido")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDevAuto = () => {
    // Navegar para rota de auto-setup (dev-only)
    navigate("/dev-auto");
  };

  // Só exibe em ambiente de desenvolvimento
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#fff",
        border: "2px solid #007bff",
        borderRadius: "8px",
        padding: "15px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        zIndex: 1000,
        minWidth: "250px",
      }}
    >
      <h4 style={{ margin: "0 0 6px 0", color: "#007bff" }}>Dev Panel</h4>
      <p
        style={{
          margin: "0 0 10px 0",
          fontSize: "11px",
          color: isEmulator ? "#28a745" : "#dc3545",
        }}
      >
        {isEmulator ? "Emuladores ativos" : "Emuladores desativados"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={handleBecomeOrganizer}
          disabled={loading || !isEmulator}
          style={{
            width: "100%",
            backgroundColor: loading ? "#6c757d" : "#17a2b8",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Virar Organizador
        </button>

        <button
          onClick={handleBecomeValidator}
          disabled={loading || !isEmulator}
          style={{
            width: "100%",
            backgroundColor: loading ? "#6c757d" : "#e83e8c",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Virar Validador
        </button>

        <button
          onClick={handleSeedEvents}
          disabled={loading}
          style={{
            width: "100%",
            backgroundColor: loading ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "12px",
          }}
        >
          {loading ? "Adicionando..." : "Adicionar Eventos"}
        </button>

        <button
          onClick={handleDevAuto}
          disabled={loading}
          style={{
            width: "100%",
            backgroundColor: loading ? "#6c757d" : "#6f42c1",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "12px",
          }}
        >
          {loading ? "Executando..." : "Dev Auto"}
        </button>
      </div>

      {message && (
        <p
          style={{
            margin: "10px 0 0 0",
            fontSize: "12px",
            color: message.startsWith("Sucesso") ? "#28a745" : "#dc3545",
            wordWrap: "break-word",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default DevPanel;
