import { updateProfile } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "../components/ui/button";
import { auth } from "../firebaseConfig";
import { useAuth } from "../hooks/useAuth";
import { userService } from "../services/firestore";
import { storageService } from "../services/storage";

function ProfilePage() {
  const { userProfile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa o formulário com os dados do perfil
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || "");
      setPhone(userProfile.phone || "");
    }
  }, [userProfile]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Erro ao deslogar", e);
      toast.error("Erro ao sair da conta");
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser || !userProfile) return;
    setLoading(true);

    try {
      let photoURL = auth.currentUser.photoURL;

      // 1. Upload da nova foto (se houver)
      if (fileInputRef.current?.files?.[0]) {
        const file = fileInputRef.current.files[0];
        photoURL = await storageService.uploadUserAvatar(userProfile.uid, file);
      }

      // 2. Atualizar Auth Profile (Core Firebase Auth)
      await updateProfile(auth.currentUser, {
        displayName: displayName,
        photoURL: photoURL,
      });

      // 3. Atualizar Firestore Document
      await userService.updateUserProfile(userProfile.uid, {
        displayName: displayName,
        photoURL: photoURL || undefined,
        phone: phone || undefined,
      });

      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
      // Recarregar a página não é estritamente necessário se o AuthContext escutar mudanças,
      // mas garante que tudo esteja sincronizado.
      window.location.reload();
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="page-container py-12">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-sm p-8">
          <div className="text-center mb-8 relative">
            <div className="relative w-32 h-32 mx-auto mb-4 group">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-background shadow-md bg-primary/10 flex items-center justify-center">
                {auth.currentUser?.photoURL ? (
                  <img
                    src={auth.currentUser.photoURL}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl">👤</span>
                )}
              </div>

              {isEditing && (
                <button
                  onClick={triggerFileInput}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Alterar foto"
                >
                  <span className="text-white text-sm font-medium">
                    Alterar
                  </span>
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
              />
            </div>

            {isEditing ? (
              <div className="max-w-xs mx-auto">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-center text-2xl font-bold bg-background border border-input rounded-md px-3 py-1 mb-2 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Seu Nome"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold text-foreground mb-1">
                {userProfile?.displayName || "Usuário"}
              </h1>
            )}

            <p className="text-muted-foreground">{userProfile?.email}</p>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-foreground">
                  ID do Usuário
                </span>
                <span className="text-sm text-muted-foreground font-mono">
                  {userProfile?.uid}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-foreground">Função</span>
                <span className="capitalize px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                  {userProfile?.role || "User"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-foreground">Telefone</span>
                {isEditing ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-right bg-background border border-input rounded-md px-2 py-1 w-40 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="(00) 00000-0000"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {userProfile?.phone || "-"}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">
                  Membro desde
                </span>
                <span className="text-sm text-muted-foreground">
                  {userProfile?.createdAt
                    ? new Date(userProfile.createdAt).toLocaleDateString(
                        "pt-BR"
                      )
                    : "-"}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex flex-col sm:flex-row gap-4 justify-center">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="w-full sm:w-auto"
                  >
                    Editar Perfil
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="w-full sm:w-auto"
                  >
                    Sair da Conta
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
