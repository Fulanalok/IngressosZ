import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router";
import { functions } from "@/firebaseConfig";
import { useAuth } from "@/hooks/auth/useAuth";
import { seedSampleEvents } from "@/utils/seedData";

type DevActionVariant = "organizer" | "validator" | "seed" | "auto";

const ACTION_COLORS: Record<DevActionVariant, string> = {
  organizer: "#17a2b8",
  validator: "#e83e8c",
  seed: "#28a745",
  auto: "#6f42c1",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido";
}

function isEmulatorEnabled() {
  return (
    import.meta.env.DEV &&
    String(import.meta.env.VITE_USE_EMULATORS ?? "false").toLowerCase() ===
      "true"
  );
}

function panelStyle(): CSSProperties {
  return {
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
  };
}

function actionButtonStyle(
  loading: boolean,
  variant: DevActionVariant
): CSSProperties {
  return {
    width: "100%",
    backgroundColor: loading ? "#6c757d" : ACTION_COLORS[variant],
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "4px",
    cursor: loading ? "not-allowed" : "pointer",
    fontSize: variant === "seed" || variant === "auto" ? "12px" : undefined,
  };
}

function DevActionButton({
  disabled,
  label,
  loading,
  loadingLabel,
  onClick,
  variant,
}: {
  disabled: boolean;
  label: string;
  loading: boolean;
  loadingLabel?: string;
  onClick: () => void;
  variant: DevActionVariant;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={actionButtonStyle(loading, variant)}
    >
      {loading && loadingLabel ? loadingLabel : label}
    </button>
  );
}

function DevPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isEmulator = isEmulatorEnabled();

  const runWithLoading = async (
    action: () => Promise<void>,
    errorPrefix: string
  ) => {
    setLoading(true);
    setMessage("");

    try {
      await action();
    } catch (error) {
      setMessage(`${errorPrefix}: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (role: "organizer" | "validator") => {
    if (!isEmulator) {
      setMessage("Este recurso exige emuladores habilitados.");
      return;
    }
    if (!user) {
      setMessage(`Erro: voce precisa estar logado para virar ${role}`);
      return;
    }

    await runWithLoading(async () => {
      const setUserRole = httpsCallable(functions, "setUserRole");
      await setUserRole({ uid: user.uid, role });
      setMessage(`Sucesso: role atualizada para ${role}.`);
    }, "Erro ao atualizar perfil");
  };

  const handleSeedEvents = () =>
    runWithLoading(async () => {
      await seedSampleEvents();
      setMessage("Sucesso: eventos de exemplo adicionados.");
    }, "Erro ao adicionar eventos");

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div style={panelStyle()}>
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
        <DevActionButton
          disabled={loading || !isEmulator}
          label="Virar Organizador"
          loading={loading}
          onClick={() => updateRole("organizer")}
          variant="organizer"
        />
        <DevActionButton
          disabled={loading || !isEmulator}
          label="Virar Validador"
          loading={loading}
          onClick={() => updateRole("validator")}
          variant="validator"
        />
        <DevActionButton
          disabled={loading}
          label="Adicionar Eventos"
          loading={loading}
          loadingLabel="Adicionando..."
          onClick={handleSeedEvents}
          variant="seed"
        />
        <DevActionButton
          disabled={loading}
          label="Dev Auto"
          loading={loading}
          loadingLabel="Executando..."
          onClick={() => navigate("/dev-auto")}
          variant="auto"
        />
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
