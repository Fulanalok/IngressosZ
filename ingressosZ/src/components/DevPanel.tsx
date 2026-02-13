import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ticketService, userService } from "../services/firestore";
import { seedSampleEvents } from "../utils/seedData";
import { Timestamp } from "firebase/firestore";

function DevPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleBecomeOrganizer = async () => {
    if (!user) {
      setMessage("❌ Você precisa estar logado para virar organizador");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await userService.updateUserProfile(user.uid, { role: "organizer" });
      setMessage("✅ Agora você é um organizador! Recarregue a página.");
    } catch (error) {
      setMessage(
        "❌ Erro ao atualizar perfil: " +
          (error instanceof Error ? error.message : "Erro desconhecido")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeValidator = async () => {
    if (!user) {
      setMessage("❌ Você precisa estar logado para virar validador");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await userService.updateUserProfile(user.uid, { role: "validator" });
      setMessage("✅ Agora você é um validador! Recarregue a página.");
    } catch (error) {
      setMessage(
        "❌ Erro ao atualizar perfil: " +
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
      setMessage("✅ Eventos de exemplo adicionados com sucesso!");
    } catch (error) {
      setMessage(
        "❌ Erro ao adicionar eventos: " +
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

  const handleCreateSampleTicket = async () => {
    if (!user) {
      setMessage("❌ Você precisa estar logado para criar ingressos");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Criar um ingresso de exemplo
      const sampleTicket = {
        eventId: "sample-event-1",
        userId: user.uid,
        userEmail: user.email || "usuario@exemplo.com",
        status: "active" as const,
        price: 85.0,
        ticketType: "standard" as const,
        validatedAt: undefined,
        validatedBy: undefined,
        purchaseDate: Timestamp.now(), 
        qrCode: "sample-qr-code",
      };

      await ticketService.createTicket(sampleTicket);
      setMessage("✅ Ingresso de exemplo criado com sucesso!");
    } catch (error) {
      setMessage(
        "❌ Erro ao criar ingresso: " +
          (error instanceof Error ? error.message : "Erro desconhecido")
      );
    } finally {
      setLoading(false);
    }
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
      <h4 style={{ margin: "0 0 10px 0", color: "#007bff" }}>🛠️ Dev Panel</h4>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={handleBecomeOrganizer}
          disabled={loading}
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
          👑 Virar Organizador
        </button>

        <button
          onClick={handleBecomeValidator}
          disabled={loading}
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
          🔍 Virar Validador
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
          {loading ? "⏳ Adicionando..." : "📊 Adicionar Eventos"}
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
          {loading ? "⏳ Executando..." : "⚙️ Dev Auto"}
        </button>

        <button
          onClick={handleCreateSampleTicket}
          disabled={loading || !user}
          style={{
            width: "100%",
            backgroundColor: loading || !user ? "#6c757d" : "#17a2b8",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: loading || !user ? "not-allowed" : "pointer",
            fontSize: "12px",
          }}
        >
          {loading ? "⏳ Criando..." : "🎫 Criar Ingresso Teste"}
        </button>
      </div>

      {message && (
        <p
          style={{
            margin: "10px 0 0 0",
            fontSize: "12px",
            color: message.includes("✅") ? "#28a745" : "#dc3545",
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
