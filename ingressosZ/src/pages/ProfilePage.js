import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
function ProfilePage() {
    const { userProfile, signOut } = useAuth();
    const handleLogout = async () => {
        try {
            await signOut();
        }
        catch (e) {
            console.error("Erro ao deslogar", e);
            toast.error("Erro ao sair da conta");
        }
    };
    return (_jsx("div", { className: "min-h-screen gradient-bg", children: _jsx("div", { className: "page-container py-12", children: _jsxs("div", { className: "max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-sm p-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx("span", { className: "text-4xl", children: "\uD83D\uDC64" }) }), _jsx("h1", { className: "text-3xl font-bold text-foreground", children: userProfile?.displayName || "Usuário" }), _jsx("p", { className: "text-muted-foreground", children: userProfile?.email })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 p-4 bg-muted/50 rounded-lg", children: [_jsxs("div", { className: "flex justify-between items-center border-b border-border pb-3", children: [_jsx("span", { className: "font-medium text-foreground", children: "ID do Usu\u00E1rio" }), _jsx("span", { className: "text-sm text-muted-foreground font-mono", children: userProfile?.uid })] }), _jsxs("div", { className: "flex justify-between items-center border-b border-border pb-3", children: [_jsx("span", { className: "font-medium text-foreground", children: "Fun\u00E7\u00E3o" }), _jsx("span", { className: "capitalize px-2 py-1 bg-primary/10 text-primary rounded text-sm", children: userProfile?.role || "User" })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "font-medium text-foreground", children: "Membro desde" }), _jsx("span", { className: "text-sm text-muted-foreground", children: userProfile?.createdAt
                                                    ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString("pt-BR")
                                                    : "-" })] })] }), _jsx("div", { className: "pt-6 border-t border-border flex justify-center", children: _jsx(Button, { variant: "destructive", onClick: handleLogout, className: "w-full sm:w-auto", children: "Sair da Conta" }) })] })] }) }) }));
}
export default ProfilePage;
