import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";

function ProfilePage() {
  const { userProfile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Erro ao deslogar", e);
      toast.error("Erro ao sair da conta");
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="page-container py-12">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👤</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {userProfile?.displayName || "Usuário"}
            </h1>
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
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">
                  Membro desde
                </span>
                <span className="text-sm text-muted-foreground">
                  {userProfile?.createdAt
                    ? new Date(
                        (userProfile.createdAt as any).seconds * 1000
                      ).toLocaleDateString("pt-BR")
                    : "-"}
                </span>
              </div>
            </div>

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
