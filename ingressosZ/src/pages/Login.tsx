import { useAuth } from "@/hooks/useAuth";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { auth } from "../firebaseConfig";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Usuário logado com sucesso!");
      navigate(from || "/", { replace: true });
    } catch (err: unknown) {
      console.error("Erro ao fazer login:", err);
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
          case "auth/invalid-email":
            setError("E-mail ou senha inválidos.");
            break;
          case "auth/too-many-requests":
            setError("Muitas tentativas de login. Tente novamente mais tarde.");
            break;
          case "auth/network-request-failed":
            setError(
              "Falha de rede ao tentar entrar. Verifique sua conexão e tente novamente."
            );
            break;
          case "auth/configuration-not-found":
            setError(
              "Erro de configuração do Firebase. Verifique as configurações do projeto."
            );
            break;
          case "auth/api-key-not-valid":
            setError("Chave de API do Firebase inválida.");
            break;
          default:
            setError(
              "Não foi possível fazer login. Tente novamente em alguns instantes."
            );
            toast.error("Erro ao fazer login. Tente novamente.");
        }
      } else {
        setError("Ocorreu um erro ao fazer login.");
        toast.error("Ocorreu um erro inesperado.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      navigate(from || "/", { replace: true });
    }
  }, [authLoading, from, navigate, user]);

  if (user && !authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-3xl font-bold text-foreground">
            Bem-vindo de volta!
          </h2>
          <p className="mt-2 text-muted-foreground">
            Entre na sua conta para acessar seus ingressos
          </p>
        </div>

        {/* Form */}
        <Card className="mt-8">
          <CardContent>
            <form
              onSubmit={handleLogin}
              className="space-y-6"
              aria-busy={loading}
            >
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="pl-10"
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">📧</span>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha"
                    className="pl-10"
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">🔒</span>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  id="login-error"
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-lg p-4"
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-500 dark:text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-none h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Entrando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    Entrar
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="mt-0 flex-col">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">
                  Não tem uma conta?
                </span>
              </div>
            </div>

            <div className="mt-6 w-full">
              <Button variant="secondary" asChild className="w-full">
                <Link to="/cadastro">
                  <span className="mr-2">✨</span>
                  Criar conta gratuita
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Ao entrar, você concorda com nossos{" "}
            <a href="#" className="text-primary hover:opacity-90">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="text-primary hover:opacity-90">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
