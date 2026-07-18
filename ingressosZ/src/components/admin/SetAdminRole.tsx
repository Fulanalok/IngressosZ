import { Button } from "@/components/ui/button";
import {
  ASSIGNABLE_ROLE_OPTIONS,
  normalizeUserRole,
  ROLE_LABELS,
  type UserRole,
} from "@/constants/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { userService } from "@/services/firestore";
import type { UserProfile } from "@/types";
import { getFunctions, httpsCallable } from "firebase/functions";
import React, { useState } from "react";

type AssignableRole = UserRole;

const SetAdminRole: React.FC = () => {
  const [email, setEmail] = useState("");
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [searching, setSearching] = useState(false);
  const [role, setRole] = useState<AssignableRole>("validator");
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSearching(true);
    setFoundUser(null);
    setMessage(null);
    try {
      const user = await userService.searchUserByEmail(email);
      if (user) {
        setFoundUser(user);
        const normalizedRole = normalizeUserRole(user.role);
        setRole(normalizedRole);
      } else {
        setMessage({
          type: "error",
          text: "Nenhum usuário encontrado com esse e-mail.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao buscar usuário." });
    } finally {
      setSearching(false);
    }
  };

  const handleApply = async () => {
    if (!foundUser) return;
    setApplying(true);
    setMessage(null);
    try {
      const functions = getFunctions();
      const fnName = role === "admin" ? "setAdminRole" : "setUserRole";
      const callable = httpsCallable(functions, fnName);
      const result = await callable(
        role === "admin" ? { uid: foundUser.uid } : { uid: foundUser.uid, role }
      );
      const data = result.data as { success?: boolean; message?: string };
      if (data.success) {
        setMessage({
          type: "success",
          text: data.message || "Papel aplicado com sucesso!",
        });
        setFoundUser({ ...foundUser, role });
      } else {
        setMessage({
          type: "error",
          text: data.message || "Erro desconhecido.",
        });
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Falha ao aplicar papel.";
      setMessage({ type: "error", text: msg });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Gerenciar papéis de usuário</CardTitle>
        <CardDescription>
          Busque pelo e-mail e defina o papel. Apenas administradores podem
          executar esta ação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Busca por e-mail */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFoundUser(null);
              setMessage(null);
            }}
            placeholder="E-mail do usuário"
            disabled={searching || applying}
            className="flex-1"
          />
          <Button type="submit" disabled={searching || !email.trim()}>
            {searching ? "Buscando…" : "Buscar"}
          </Button>
        </form>

        {/* Usuário encontrado */}
        {foundUser && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/40">
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">E-mail:</span> {foundUser.email}
              </p>
              <p>
                <span className="font-medium">Papel atual:</span>{" "}
                <span className="capitalize px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
                  {ROLE_LABELS[normalizeUserRole(foundUser.role)]}
                </span>
              </p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                UID: {foundUser.uid}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Novo papel</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AssignableRole)}
                className="w-full border rounded p-2 text-sm bg-background"
                disabled={applying}
              >
                {ASSIGNABLE_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleApply}
              disabled={applying || role === foundUser.role}
              className="w-full"
            >
              {applying ? "Aplicando..." : `Definir como ${ROLE_LABELS[role]}`}
            </Button>
          </div>
        )}

        {message && (
          <div
            className={`p-3 text-sm text-center rounded ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SetAdminRole;
