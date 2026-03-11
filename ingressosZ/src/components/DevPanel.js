import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { userService } from "../services/firestore";
import { seedSampleEvents } from "../utils/seedData";
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
        }
        catch (error) {
            setMessage("❌ Erro ao atualizar perfil: " +
                (error instanceof Error ? error.message : "Erro desconhecido"));
        }
        finally {
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
        }
        catch (error) {
            setMessage("❌ Erro ao atualizar perfil: " +
                (error instanceof Error ? error.message : "Erro desconhecido"));
        }
        finally {
            setLoading(false);
        }
    };
    const handleSeedEvents = async () => {
        setLoading(true);
        setMessage("");
        try {
            await seedSampleEvents();
            setMessage("✅ Eventos de exemplo adicionados com sucesso!");
        }
        catch (error) {
            setMessage("❌ Erro ao adicionar eventos: " +
                (error instanceof Error ? error.message : "Erro desconhecido"));
        }
        finally {
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
    return (_jsxs("div", { style: {
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
        }, children: [_jsx("h4", { style: { margin: "0 0 10px 0", color: "#007bff" }, children: "\uD83D\uDEE0\uFE0F Dev Panel" }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [_jsx("button", { onClick: handleBecomeOrganizer, disabled: loading, style: {
                            width: "100%",
                            backgroundColor: loading ? "#6c757d" : "#17a2b8",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer",
                        }, children: "\uD83D\uDC51 Virar Organizador" }), _jsx("button", { onClick: handleBecomeValidator, disabled: loading, style: {
                            width: "100%",
                            backgroundColor: loading ? "#6c757d" : "#e83e8c",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer",
                        }, children: "\uD83D\uDD0D Virar Validador" }), _jsx("button", { onClick: handleSeedEvents, disabled: loading, style: {
                            width: "100%",
                            backgroundColor: loading ? "#6c757d" : "#28a745",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontSize: "12px",
                        }, children: loading ? "⏳ Adicionando..." : "📊 Adicionar Eventos" }), _jsx("button", { onClick: handleDevAuto, disabled: loading, style: {
                            width: "100%",
                            backgroundColor: loading ? "#6c757d" : "#6f42c1",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontSize: "12px",
                        }, children: loading ? "⏳ Executando..." : "⚙️ Dev Auto" })] }), message && (_jsx("p", { style: {
                    margin: "10px 0 0 0",
                    fontSize: "12px",
                    color: message.includes("✅") ? "#28a745" : "#dc3545",
                    wordWrap: "break-word",
                }, children: message }))] }));
}
export default DevPanel;
