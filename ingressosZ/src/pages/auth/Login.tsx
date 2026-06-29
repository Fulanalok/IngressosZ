import { useAuth } from "@/hooks/auth/useAuth";
import { FirebaseError } from "firebase/app";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth, functions } from "@/firebaseConfig";

type ForgotMessage = {
  type: "success" | "error";
  text: string;
};

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as FirebaseError).code
    : null;
}

function getLoginErrorMessage(error: unknown) {
  switch (getErrorCode(error)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "E-mail ou senha inválidos.";
    case "auth/too-many-requests":
      return "Muitas tentativas de login. Tente novamente mais tarde.";
    case "auth/network-request-failed":
      return "Falha de rede ao tentar entrar. Verifique sua conexão e tente novamente.";
    case "auth/configuration-not-found":
      return "Erro de configuração do Firebase. Verifique as configurações do projeto.";
    case "auth/api-key-not-valid":
      return "Chave de API do Firebase inválida.";
    case null:
      return "Ocorreu um erro ao fazer login.";
    default:
      return "Não foi possível fazer login. Tente novamente em alguns instantes.";
  }
}

function getRecaptchaError(siteKey: string, recaptchaToken: string | null) {
  if (!siteKey) return "reCAPTCHA não configurado.";
  if (!recaptchaToken) return "Confirme o reCAPTCHA para continuar.";
  return "";
}

function LoginAlert({ id, message }: { id?: string; message: string }) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-600 rounded-lg p-4"
    >
      <p className="text-sm text-red-800 dark:text-red-300">{message}</p>
    </div>
  );
}

function RecaptchaField({
  recaptchaRef,
  setRecaptchaToken,
  siteKey,
}: {
  recaptchaRef: React.RefObject<ReCAPTCHA | null>;
  setRecaptchaToken: (token: string | null) => void;
  siteKey: string;
}) {
  if (!siteKey) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        reCAPTCHA não configurado neste ambiente
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        onChange={(token: string | null) => setRecaptchaToken(token)}
        onExpired={() => setRecaptchaToken(null)}
      />
    </div>
  );
}

function ForgotPasswordPanel({
  forgotEmail,
  forgotLoading,
  forgotMessage,
  handleForgotPassword,
  setForgotEmail,
  setShowForgot,
}: {
  forgotEmail: string;
  forgotLoading: boolean;
  forgotMessage: ForgotMessage | null;
  handleForgotPassword: (event: FormEvent) => void;
  setForgotEmail: (email: string) => void;
  setShowForgot: (show: boolean) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Redefinir senha</p>
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
          <Button type="submit" disabled={forgotLoading} className="flex-1">
            {forgotLoading ? "Enviando..." : "Enviar link"}
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
  );
}

function SubmitContent({ loading }: { loading: boolean }) {
  if (!loading) return <>Entrar</>;

  return (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
      Entrando...
    </>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<ForgotMessage | null>(null);
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

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setRecaptchaError("");
    setLoading(true);

    try {
      const recaptchaMessage = getRecaptchaError(siteKey, recaptchaToken);
      if (recaptchaMessage) {
        setRecaptchaError(recaptchaMessage);
        return;
      }

      const verifyRecaptcha = httpsCallable(functions, "verifyRecaptchaV2");
      await verifyRecaptcha({ token: recaptchaToken });
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      navigate(from || "/", { replace: true });
    } catch (err: unknown) {
      console.error("Erro ao fazer login:", err);
      setError(getLoginErrorMessage(err));
      toast.error("Erro ao fazer login. Tente novamente.");
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent) => {
    event.preventDefault();
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
      setForgotMessage(
        err instanceof FirebaseError && err.code === "auth/invalid-email"
          ? { type: "error", text: "E-mail inválido." }
          : {
              type: "error",
              text: "Não foi possível enviar o e-mail. Tente novamente.",
            }
      );
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
    <div className="min-h-screen page-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Bem-vindo de volta!
          </h2>
          <p className="mt-2 text-muted-foreground">
            Entre na sua conta para acessar seus ingressos
          </p>
        </div>

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

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Senha
                </label>
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

              <LoginAlert id="login-error" message={error} />

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

              <RecaptchaField
                recaptchaRef={recaptchaRef}
                setRecaptchaToken={setRecaptchaToken}
                siteKey={siteKey}
              />
              <LoginAlert message={recaptchaError} />

              <Button type="submit" disabled={loading} className="w-full">
                <SubmitContent loading={loading} />
              </Button>
            </form>

            {showForgot && (
              <ForgotPasswordPanel
                forgotEmail={forgotEmail}
                forgotLoading={forgotLoading}
                forgotMessage={forgotMessage}
                handleForgotPassword={handleForgotPassword}
                setForgotEmail={setForgotEmail}
                setShowForgot={setShowForgot}
              />
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
