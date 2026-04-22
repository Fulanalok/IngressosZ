import { useAuth } from "@/hooks/auth/useAuth";
import { FirebaseError } from "firebase/app";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import React, { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth, functions } from "@/firebaseConfig";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setRecaptchaError("");
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
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      navigate(from || "/", { replace: true });
    } catch (err: unknown) {
      console.error("Erro ao fazer login:", err);
      const errorCode =
        typeof err === "object" && err !== null && "code" in err
          ? (err as FirebaseError).code
          : null;
      if (errorCode) {
        switch (errorCode) {
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
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotMessage(null);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotMessage({
        type: "success",
        text: "Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.",
      });
    } catch (err) {
      if (err instanceof FirebaseError && err.code === "auth/invalid-email") {
        setForgotMessage({ type: "error", text: "E-mail inválido." });
      } else {
        setForgotMessage({
          type: "error",
          text: "Não foi possível enviar o e-mail. Tente novamente.",
        });
      }
    } finally {
      setForgotLoading(false);
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
                    className="pl-4"
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                  />
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
                    className="pl-4"
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                  />
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
                    <div className="ml-3">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(true);
                    setForgotEmail(email);
                    setForgotMessage(null);
                  }}
                  className="text-sm text-primary hover:opacity-80 underline-offset-2 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>

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
                  className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-lg p-4"
                >
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {recaptchaError}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Entrando...
                  </>
                ) : (
                  <>Entrar</>
                )}
              </Button>
            </form>

            {/* Recuperação de senha */}
            {showForgot && (
              <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Redefinir senha
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-2">
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={forgotLoading}
                  />
                  {forgotMessage && (
                    <p
                      className={`text-xs ${
                        forgotMessage.type === "success"
                          ? "text-green-700"
                          : "text-red-600"
                      }`}
                    >
                      {forgotMessage.text}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1"
                    >
                      {forgotLoading ? "Enviando…" : "Enviar link"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowForgot(false)}
                      disabled={forgotLoading}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            )}
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
                <Link to="/cadastro">Criar conta gratuita</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Ao entrar, você concorda com nossos{" "}
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

export default Login;
