import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/firestore";
import { sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { useState } from "react";
import { toast } from "sonner";
import { auth } from "../firebaseConfig";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  organizer: "Organizador",
  validator: "Validador",
  user: "Usuário",
};

function ProfilePage() {
  const { user, userProfile, signOut } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || ""
  );
  const [savingName, setSavingName] = useState(false);

  const [sendingReset, setSendingReset] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      toast.error("Erro ao sair da conta");
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await userService.updateUserProfile(user.uid, {
        displayName: displayName.trim(),
      });
      toast.success("Nome atualizado com sucesso!");
      setEditingName(false);
    } catch {
      toast.error("Erro ao atualizar o nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(`Link de redefinição enviado para ${user.email}`);
    } catch {
      toast.error("Não foi possível enviar o e-mail. Tente novamente.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="page-container py-12">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-sm p-8">
          {/* Avatar e nome */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👤</span>
            </div>
            {editingName ? (
              <form
                onSubmit={handleSaveName}
                className="flex gap-2 justify-center mt-2"
              >
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="max-w-xs text-center"
                  placeholder="Seu nome"
                  disabled={savingName}
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={savingName || !displayName.trim()}
                >
                  {savingName ? "Salvando…" : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingName(false);
                    setDisplayName(userProfile?.displayName || "");
                  }}
                  disabled={savingName}
                >
                  Cancelar
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold text-foreground">
                  {userProfile?.displayName || "Usuário"}
                </h1>
                <button
                  onClick={() => {
                    setEditingName(true);
                    setDisplayName(userProfile?.displayName || "");
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Editar nome"
                >
                  ✏️
                </button>
              </div>
            )}
            <p className="text-muted-foreground mt-1">{userProfile?.email}</p>
          </div>

          <div className="space-y-6">
            {/* Dados da conta */}
            <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-foreground">
                  ID do Usuário
                </span>
                <span className="text-sm text-muted-foreground font-mono truncate max-w-[180px]">
                  {userProfile?.uid}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-foreground">Função</span>
                <span className="capitalize px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                  {ROLE_LABELS[userProfile?.role ?? "user"] ??
                    userProfile?.role}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">
                  Membro desde
                </span>
                <span className="text-sm text-muted-foreground">
                  {userProfile?.createdAt
                    ? new Date(
                        (userProfile.createdAt as { seconds: number }).seconds *
                          1000
                      ).toLocaleDateString("pt-BR")
                    : "-"}
                </span>
              </div>
            </div>

            {/* Segurança */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-foreground">Segurança</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Senha</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={sendingReset}
                >
                  {sendingReset ? "Enviando…" : "Alterar senha"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Um link de redefinição será enviado para {user?.email}.
              </p>
            </div>

            {/* Sair */}
            <div className="pt-6 border-t border-border flex justify-center">
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full sm:w-auto"
              >
                Sair da Conta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
