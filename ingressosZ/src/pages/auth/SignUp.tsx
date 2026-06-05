import { useAuth } from "@/hooks/auth/useAuth";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import React, { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth, functions } from "@/firebaseConfig";

function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState("");
  const testSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  const siteKey =
    import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY ||
    (import.meta.env.DEV ? testSiteKey : "");
  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname;

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setRecaptchaError("");

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
      if (!siteKey) {
        setRecaptchaError("reCAPTCHA não configurado.");
        return;
      }
      if (!recaptchaToken) {
        setRecaptchaError("Confirme o reCAPTCHA para continuar.");
        return;
      }
      const verifyRecaptcha = httpsCallable(functions, "verifyRecaptchaV2");
      await verifyRecaptcha({ token: recaptchaToken });
      await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      navigate(from || "/", { replace: true });
    } catch (err: unknown) {
      console.error("Erro ao criar usuário:", err);
      const errorCode =
        typeof err === "object" && err !== null && "code" in err
          ? (err as FirebaseError).code
          : null;
      if (errorCode) {
        switch (errorCode) {
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
            setError(
              "Falha de rede ao criar conta. Verifique sua conexão e tente novamente."
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
              "Não foi possível criar a conta. Tente novamente em alguns instantes."
            );
            toast.error("Erro ao criar conta. Tente novamente.");
        }
      } else {
        setError("Ocorreu um erro ao criar a conta.");
        toast.error("Ocorreu um erro inesperado.");
      }
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
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
    <div className="min-h-screen page-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-foreground mb-2 tracking-tight">
            Crie sua conta
          </h2>
          <p className="text-muted-foreground">
            Junte-se ao <span className="text-primary font-bold">IngressosZ</span> e descubra eventos incríveis
          </p>
        </div>

        {/* Form */}
        <Card className="mt-8 shadow-xl border-border/50">
          <CardContent>
            <form
              onSubmit={handleSignUp}
              className="space-y-6"
              aria-busy={loading}
            >
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wider"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="h-12 rounded-xl border-border/50 bg-card/50"
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-error" : undefined}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wider"
                >
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="h-12 rounded-xl border-border/50 bg-card/50"
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-error" : undefined}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wider"
                >
                  Confirmar Senha
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirme sua senha"
                  className="h-12 rounded-xl border-border/50 bg-card/50"
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-error" : undefined}
                />
              </div>

              {error && (
                <div
                  id="signup-error"
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-xl p-4"
                >
                  <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                    {error}
                  </p>
                </div>
              )}

              {siteKey ? (
                <div className="flex justify-center">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={siteKey}
                    onChange={(token: string | null) =>
                      setRecaptchaToken(token)
                    }
                    onExpired={() => setRecaptchaToken(null)}
                  />
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  reCAPTCHA não configurado neste ambiente
                </div>
              )}

              {recaptchaError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-xl p-4"
                >
                  <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                    {recaptchaError}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full btn-primary py-6 text-base">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Criando conta...
                  </>
                ) : (
                  <>Criar conta gratuita</>
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
              <Button variant="secondary" asChild className="w-full rounded-xl border-border/50">
                <Link to="/login">Fazer login</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Benefits */}
        <div className="surface-card p-8 border border-border/50">
          <h3 className="text-xl font-extrabold text-foreground mb-6">
            Por que escolher o <span className="text-primary">IngressosZ</span>?
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              "Compre de forma segura e rápida",
              "Acesse seus ingressos no celular",
              "Receba alertas de novos eventos",
              "Histórico completo de compras"
            ].map((benefit, i) => (
              <div key={i} className="flex items-center text-muted-foreground font-medium">
                <div className="w-2 h-2 bg-primary rounded-full mr-3 shadow-sm shadow-primary/20 flex-shrink-0"></div>
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Ao criar uma conta, você concorda com nossos{" "}
            <Link to="/termos" className="text-primary hover:underline">
              Termos de Uso
            </Link>{" "}
            e{" "}
            <Link to="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
