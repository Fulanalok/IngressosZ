import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { userService } from "@/services/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useState } from "react";
const ROLE_LABELS = {
    admin: "Admin",
    organizer: "Organizador",
    validator: "Validador",
    user: "Usuário",
};
const SetAdminRole = () => {
    const [email, setEmail] = useState("");
    const [foundUser, setFoundUser] = useState(null);
    const [searching, setSearching] = useState(false);
    const [role, setRole] = useState("validator");
    const [applying, setApplying] = useState(false);
    const [message, setMessage] = useState(null);
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!email.trim())
            return;
        setSearching(true);
        setFoundUser(null);
        setMessage(null);
        try {
            const user = await userService.searchUserByEmail(email);
            if (user) {
                setFoundUser(user);
                setRole(user.role === "admin" ||
                    user.role === "organizer" ||
                    user.role === "validator"
                    ? user.role
                    : "validator");
            }
            else {
                setMessage({
                    type: "error",
                    text: "Nenhum usuário encontrado com esse e-mail.",
                });
            }
        }
        catch {
            setMessage({ type: "error", text: "Erro ao buscar usuário." });
        }
        finally {
            setSearching(false);
        }
    };
    const handleApply = async () => {
        if (!foundUser)
            return;
        setApplying(true);
        setMessage(null);
        try {
            const functions = getFunctions();
            const fnName = role === "admin" ? "setAdminRole" : "setUserRole";
            const callable = httpsCallable(functions, fnName);
            const result = await callable(role === "admin" ? { uid: foundUser.uid } : { uid: foundUser.uid, role });
            const data = result.data;
            if (data.success) {
                setMessage({
                    type: "success",
                    text: data.message || "Papel aplicado com sucesso!",
                });
                setFoundUser({ ...foundUser, role });
            }
            else {
                setMessage({
                    type: "error",
                    text: data.message || "Erro desconhecido.",
                });
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Falha ao aplicar papel.";
            setMessage({ type: "error", text: msg });
        }
        finally {
            setApplying(false);
        }
    };
    return (_jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Gerenciar pap\u00E9is de usu\u00E1rio" }), _jsx(CardDescription, { children: "Busque pelo e-mail e defina o papel. Apenas administradores podem executar esta a\u00E7\u00E3o." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("form", { onSubmit: handleSearch, className: "flex gap-2", children: [_jsx(Input, { type: "email", value: email, onChange: (e) => {
                                    setEmail(e.target.value);
                                    setFoundUser(null);
                                    setMessage(null);
                                }, placeholder: "E-mail do usu\u00E1rio", disabled: searching || applying, className: "flex-1" }), _jsx(Button, { type: "submit", disabled: searching || !email.trim(), children: searching ? "Buscando…" : "Buscar" })] }), foundUser && (_jsxs("div", { className: "rounded-lg border p-4 space-y-3 bg-muted/40", children: [_jsxs("div", { className: "text-sm space-y-1", children: [_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "E-mail:" }), " ", foundUser.email] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Papel atual:" }), " ", _jsx("span", { className: "capitalize px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold", children: ROLE_LABELS[foundUser.role] ?? foundUser.role })] }), _jsxs("p", { className: "text-xs text-muted-foreground font-mono break-all", children: ["UID: ", foundUser.uid] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium", children: "Novo papel" }), _jsxs("select", { value: role, onChange: (e) => setRole(e.target.value), className: "w-full border rounded p-2 text-sm bg-background", disabled: applying, children: [_jsx("option", { value: "validator", children: "Validador" }), _jsx("option", { value: "organizer", children: "Organizador" }), _jsx("option", { value: "admin", children: "Admin" })] })] }), _jsx(Button, { onClick: handleApply, disabled: applying || role === foundUser.role, className: "w-full", children: applying ? "Aplicando…" : `Definir como ${ROLE_LABELS[role]}` })] })), message && (_jsx("div", { className: `p-3 text-sm text-center rounded ${message.type === "success"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"}`, children: message.text }))] })] }));
};
export default SetAdminRole;
