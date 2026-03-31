import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/firestore";
import { sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { useState } from "react";
import { toast } from "sonner";
import { auth } from "../firebaseConfig";
const ROLE_LABELS = {
    admin: "Admin",
    organizer: "Organizador",
    validator: "Validador",
    user: "Usuário",
};
function ProfilePage() {
    const { user, userProfile, signOut } = useAuth();
    const [editingName, setEditingName] = useState(false);
    const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
    const [savingName, setSavingName] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);
    const handleLogout = async () => {
        try {
            await signOut();
        }
        catch {
            toast.error("Erro ao sair da conta");
        }
    };
    const handleSaveName = async (e) => {
        e.preventDefault();
        if (!user || !displayName.trim())
            return;
        setSavingName(true);
        try {
            await updateProfile(user, { displayName: displayName.trim() });
            await userService.updateUserProfile(user.uid, {
                displayName: displayName.trim(),
            });
            toast.success("Nome atualizado com sucesso!");
            setEditingName(false);
        }
        catch {
            toast.error("Erro ao atualizar o nome.");
        }
        finally {
            setSavingName(false);
        }
    };
    const handleChangePassword = async () => {
        if (!user?.email)
            return;
        setSendingReset(true);
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast.success(`Link de redefinição enviado para ${user.email}`);
        }
        catch {
            toast.error("Não foi possível enviar o e-mail. Tente novamente.");
        }
        finally {
            setSendingReset(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen gradient-bg", children: _jsx("div", { className: "page-container py-12", children: _jsxs("div", { className: "max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-sm p-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx("span", { className: "text-4xl", children: (userProfile?.displayName || "Usuário").slice(0, 1) }) }), editingName ? (_jsxs("form", { onSubmit: handleSaveName, className: "flex gap-2 justify-center mt-2", children: [_jsx(Input, { value: displayName, onChange: (e) => setDisplayName(e.target.value), className: "max-w-xs text-center", placeholder: "Seu nome", disabled: savingName, autoFocus: true }), _jsx(Button, { type: "submit", disabled: savingName || !displayName.trim(), children: savingName ? "Salvando…" : "Salvar" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => {
                                            setEditingName(false);
                                            setDisplayName(userProfile?.displayName || "");
                                        }, disabled: savingName, children: "Cancelar" })] })) : (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("h1", { className: "text-3xl font-bold text-foreground", children: userProfile?.displayName || "Usuário" }), _jsx("button", { onClick: () => {
                                            setEditingName(true);
                                            setDisplayName(userProfile?.displayName || "");
                                        }, className: "text-sm text-muted-foreground hover:text-primary transition-colors", title: "Editar nome", children: "Editar" })] })), _jsx("p", { className: "text-muted-foreground mt-1", children: userProfile?.email })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 p-4 bg-muted/50 rounded-lg", children: [_jsxs("div", { className: "flex justify-between items-center border-b border-border pb-3", children: [_jsx("span", { className: "font-medium text-foreground", children: "ID do Usu\u00E1rio" }), _jsx("span", { className: "text-sm text-muted-foreground font-mono truncate max-w-[180px]", children: userProfile?.uid })] }), _jsxs("div", { className: "flex justify-between items-center border-b border-border pb-3", children: [_jsx("span", { className: "font-medium text-foreground", children: "Fun\u00E7\u00E3o" }), _jsx("span", { className: "capitalize px-2 py-1 bg-primary/10 text-primary rounded text-sm", children: ROLE_LABELS[userProfile?.role ?? "user"] ??
                                                    userProfile?.role })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "font-medium text-foreground", children: "Membro desde" }), _jsx("span", { className: "text-sm text-muted-foreground", children: userProfile?.createdAt
                                                    ? new Date(userProfile.createdAt.seconds *
                                                        1000).toLocaleDateString("pt-BR")
                                                    : "-" })] })] }), _jsxs("div", { className: "p-4 bg-muted/50 rounded-lg space-y-2", children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: "Seguran\u00E7a" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Senha" }), _jsx(Button, { variant: "secondary", size: "sm", onClick: handleChangePassword, disabled: sendingReset, children: sendingReset ? "Enviando…" : "Alterar senha" })] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Um link de redefini\u00E7\u00E3o ser\u00E1 enviado para ", user?.email, "."] })] }), _jsx("div", { className: "pt-6 border-t border-border flex justify-center", children: _jsx(Button, { variant: "destructive", onClick: handleLogout, className: "w-full sm:w-auto", children: "Sair da Conta" }) })] })] }) }) }));
}
export default ProfilePage;
