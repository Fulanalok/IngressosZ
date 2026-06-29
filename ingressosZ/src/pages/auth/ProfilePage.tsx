import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeUserRole, ROLE_LABELS } from "@/constants/roles";
import { auth } from "@/firebaseConfig";
import { useAuth } from "@/hooks/auth/useAuth";
import { userService } from "@/services/firestore";
import type { UserProfile } from "@/types";
import { sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

function formatCreatedAt(userProfile: UserProfile | null) {
  if (!userProfile?.createdAt) return "-";

  return new Date(
    (userProfile.createdAt as { seconds: number }).seconds * 1000
  ).toLocaleDateString("pt-BR");
}

function ProfileAvatar({ displayName }: { displayName: string }) {
  return (
    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
      <span className="text-4xl">{displayName.slice(0, 1)}</span>
    </div>
  );
}

function EditNameForm({
  displayName,
  onCancel,
  onChange,
  onSubmit,
  savingName,
}: {
  displayName: string;
  onCancel: () => void;
  onChange: (name: string) => void;
  onSubmit: (event: FormEvent) => void;
  savingName: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2 justify-center mt-2">
      <Input
        value={displayName}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-xs text-center"
        placeholder="Seu nome"
        disabled={savingName}
        autoFocus
      />
      <Button type="submit" disabled={savingName || !displayName.trim()}>
        {savingName ? "Salvando..." : "Salvar"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={savingName}
      >
        Cancelar
      </Button>
    </form>
  );
}

function ProfileHeader({
  displayName,
  editingName,
  email,
  onCancelEdit,
  onDisplayNameChange,
  onSaveName,
  onStartEdit,
  savingName,
}: {
  displayName: string;
  editingName: boolean;
  email?: string;
  onCancelEdit: () => void;
  onDisplayNameChange: (name: string) => void;
  onSaveName: (event: FormEvent) => void;
  onStartEdit: () => void;
  savingName: boolean;
}) {
  return (
    <div className="text-center mb-8">
      <ProfileAvatar displayName={displayName} />
      {editingName ? (
        <EditNameForm
          displayName={displayName}
          onCancel={onCancelEdit}
          onChange={onDisplayNameChange}
          onSubmit={onSaveName}
          savingName={savingName}
        />
      ) : (
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
          <button
            onClick={onStartEdit}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
            title="Editar nome"
          >
            Editar
          </button>
        </div>
      )}
      <p className="text-muted-foreground mt-1">{email}</p>
    </div>
  );
}

function AccountDetails({ userProfile }: { userProfile: UserProfile | null }) {
  return (
    <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <span className="font-medium text-foreground">ID do Usuário</span>
        <span className="text-sm text-muted-foreground font-mono truncate max-w-[180px]">
          {userProfile?.uid}
        </span>
      </div>
      <div className="flex justify-between items-center border-b border-border pb-3">
        <span className="font-medium text-foreground">Função</span>
        <span className="capitalize px-2 py-1 bg-primary/10 text-primary rounded text-sm">
          {ROLE_LABELS[normalizeUserRole(userProfile?.role)]}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="font-medium text-foreground">Membro desde</span>
        <span className="text-sm text-muted-foreground">
          {formatCreatedAt(userProfile)}
        </span>
      </div>
    </div>
  );
}

function SecurityPanel({
  email,
  onChangePassword,
  sendingReset,
}: {
  email?: string | null;
  onChangePassword: () => void;
  sendingReset: boolean;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
      <p className="text-sm font-medium text-foreground">Segurança</p>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Senha</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={onChangePassword}
          disabled={sendingReset}
        >
          {sendingReset ? "Enviando..." : "Alterar senha"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Um link de redefinição será enviado para {email}.
      </p>
    </div>
  );
}

function ProfilePage() {
  const { user, userProfile, signOut } = useAuth();
  const initialName = userProfile?.displayName || "Usuário";
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      toast.error("Erro ao sair da conta");
    }
  };

  const handleSaveName = async (event: FormEvent) => {
    event.preventDefault();
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

  const cancelEdit = () => {
    setEditingName(false);
    setDisplayName(userProfile?.displayName || "");
  };

  const startEdit = () => {
    setEditingName(true);
    setDisplayName(userProfile?.displayName || "");
  };

  return (
    <div className="min-h-screen page-bg">
      <div className="page-container py-12">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-sm p-8">
          <ProfileHeader
            displayName={editingName ? displayName : initialName}
            editingName={editingName}
            email={userProfile?.email}
            onCancelEdit={cancelEdit}
            onDisplayNameChange={setDisplayName}
            onSaveName={handleSaveName}
            onStartEdit={startEdit}
            savingName={savingName}
          />

          <div className="space-y-6">
            <AccountDetails userProfile={userProfile} />
            <SecurityPanel
              email={user?.email}
              onChangePassword={handleChangePassword}
              sendingReset={sendingReset}
            />

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
