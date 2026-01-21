import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { FirebaseError } from "firebase/app";

function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    // Validação de senha
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Usuário criado com sucesso!", userCredential.user);
      navigate("/");
    } catch (err: unknown) {
      console.error("Erro ao criar usuário:", err);
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/email-already-in-use":
            setError("Este e-mail já está em uso.");
            break;
          case "auth/weak-password":
            setError("A senha deve ter pelo menos 6 caracteres.");
            break;
          case "auth/invalid-email":
            setError("E-mail inválido.");
            break;
          case "auth/network-request-failed":
            setError("Falha de rede ao criar conta. Verifique sua conexão e tente novamente.");
            break;
          case "auth/configuration-not-found":
            setError("Erro de configuração do Firebase. Verifique as configurações do projeto.");
            break;
          case "auth/api-key-not-valid":
            setError("Chave de API do Firebase inválida.");
            break;
          default:
            setError("Não foi possível criar a conta. Tente novamente em alguns instantes.");
        }
      } else {
        setError("Ocorreu um erro ao criar a conta.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">🎟️</div>
          <h2 className="text-3xl font-bold text-foreground">Crie sua conta</h2>
          <p className="mt-2 text-muted-foreground">
            Junte-se ao IngressosZ e descubra eventos incríveis
          </p>
        </div>

        {/* Form */}
        <Card className="mt-8">
          <CardContent>
          <form onSubmit={handleSignUp} className="space-y-6" aria-busy={loading}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-2">
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
                  aria-describedby={error ? "signup-error" : undefined}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground">📧</span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-2">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10"
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-error" : undefined}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground">🔒</span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirme sua senha"
                  className="pl-10"
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-error" : undefined}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground">🔐</span>
                </div>
              </div>
            </div>

            {error && (
  <div id="signup-error" role="alert" aria-live="assertive" className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-none p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-500 dark:text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
            <div className="animate-spin rounded-none h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Criando conta...
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Criar conta gratuita
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
                  Já tem uma conta?
                </span>
              </div>
            </div>

            <div className="mt-6 w-full">
              <Button variant="secondary" asChild className="w-full">
                <Link to="/login">
                  <span className="mr-2">👋</span>
                  Fazer login
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Benefits */}
  <div className="bg-background rounded-none p-6 shadow-sm border border-border">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Por que se cadastrar?
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-green-500 mr-3">✅</span>
              <span className="text-muted-foreground">
                Compre ingressos de forma segura
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-3">✅</span>
              <span className="text-muted-foreground">
                Acesse seus ingressos no celular
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-3">✅</span>
              <span className="text-muted-foreground">
                Receba notificações sobre eventos
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-3">✅</span>
              <span className="text-muted-foreground">Histórico de compras</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Ao criar uma conta, você concorda com nossos{" "}
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

export default SignUp;
