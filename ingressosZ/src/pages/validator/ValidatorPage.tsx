import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScannerSection } from "@/components/validator/ScannerSection";
import { ValidationResult } from "@/components/validator/ValidationResult";
import { ValidatorForm } from "@/components/validator/ValidatorForm";
import { normalizeUserRole, VALIDATOR_ROLES } from "@/constants/roles";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useTicketValidator,
  type ValidationResultState,
} from "@/hooks/validator/useTicketValidator";
import { logger } from "@/services/logger";
import { TestDataService } from "@/services/testDataService";

function ValidatorPage() {
  const { userProfile } = useAuth();
  const [ticketCode, setTicketCode] = useState("");
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [isCreatingTestData, setIsCreatingTestData] = useState(false);
  const [recentScans, setRecentScans] = useState<ValidationResultState[]>([]);

  const { validateTicket, validationResult, isValidating, resetValidation } =
    useTicketValidator();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const resp = await fetch("/functions/health", { method: "GET" });
        if (!resp.ok) return;
        const h = await resp.json();
        const parts: string[] = [];
        parts.push(h?.emulator ? "Emulador: ativo" : "Emulador: inativo");
        parts.push(
          h?.firestoreEmulator ? "Firestore: emulador" : "Firestore: real"
        );
        parts.push(h?.authEmulator ? "Auth: emulador" : "Auth: real");
        setBackendStatus(parts.join(" • "));
      } catch {
        setBackendStatus("Backend indisponível");
      }
    };
    checkHealth();
  }, []);

  // Dev-only test utilities
  const DEV_TEST_CODES = import.meta.env.DEV
    ? [
        "TICKET-1756219017406-fh2k739l1",
        "TICKET-JT1ZHCGOVQYIECOUAZCF",
        "TICKET-1756219017407-usado123",
        "TICKET-1735210800000-ABC123",
        "TICKET-1756295230187-lxfcondum",
      ]
    : [];

  const generateTestCode = import.meta.env.DEV
    ? () => {
        const randomCode =
          DEV_TEST_CODES[Math.floor(Math.random() * DEV_TEST_CODES.length)];
        setTicketCode(randomCode);
      }
    : undefined;

  const createTestData = async () => {
    setIsCreatingTestData(true);
    try {
      // Forçar recriação dos dados
      await TestDataService.initializeTestData(true);
      toast.success("Dados de teste criados! Códigos: TICKET-1756219017406-fh2k739l1, TICKET-JT1ZHCGOVQYIECOUAZCF, TICKET-1756295230187-lxfcondum", { duration: 8000 });
    } catch (error) {
      logger.error("Erro ao criar dados de teste no Validator", error);
      toast.info("Firebase indisponível — modo offline ativo. Códigos: TICKET-1756219017406-fh2k739l1, TICKET-JT1ZHCGOVQYIECOUAZCF, TICKET-1756219017407-usado123 (usado)", { duration: 8000 });
    } finally {
      setIsCreatingTestData(false);
    }
  };

  const handleValidate = async (code?: string) => {
    const codeToValidate = code || ticketCode;
    const result = await validateTicket(codeToValidate);
    if (result) {
      // Adicionar timestamp ou ID único para a lista se necessário, mas por enquanto usamos o objeto
      setRecentScans((prev) => [result, ...prev].slice(0, 5));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate();
  };

  const handleReset = () => {
    setTicketCode("");
    resetValidation();
  };

  const userRole = normalizeUserRole(userProfile?.role);

  return (
    <div className="min-h-screen page-bg">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 border-b border-border pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Operação de entrada
          </p>
          <h1 className="mb-3 text-4xl font-bold text-foreground">
            Validador de Ingressos
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Escaneie ou digite o código do ingresso para liberar a entrada.
          </p>
          {backendStatus && (
            <p className="mt-2 text-xs text-muted-foreground">
              {backendStatus}
            </p>
          )}
        </div>

        <ScannerSection
          userProfile={userProfile}
          scannerActive={scannerActive}
          onScan={(code) => {
            setTicketCode(code);
            setScannerActive(false);
            handleValidate(code);
          }}
          onError={() => {
            setScannerActive(false);
          }}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Validation Form */}
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="text-2xl">Validar Ingresso</CardTitle>
              <p className="text-muted-foreground">
                Digite o código do ingresso para validar
              </p>
            </CardHeader>
            <CardContent>
              <ValidatorForm
                ticketCode={ticketCode}
                setTicketCode={setTicketCode}
                onSubmit={handleFormSubmit}
                isValidating={isValidating}
                onReset={handleReset}
                userProfile={userProfile}
                validationStatus={validationResult.status}
                generateTestCode={generateTestCode}
                createTestData={import.meta.env.DEV ? createTestData : undefined}
                isCreatingTestData={isCreatingTestData}
              />
            </CardContent>
          </Card>

          {/* Validation Result */}
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="text-2xl">Resultado da Validação</CardTitle>
            </CardHeader>
            <CardContent>
              <div id="validation-result" role="status" aria-live="polite">
                <ValidationResult
                  status={validationResult.status}
                  message={validationResult.message}
                  ticketData={validationResult.ticketData}
                  onConfirm={() => {
                    // Lógica adicional de confirmação se necessário
                    // Por enquanto apenas reseta
                    handleReset();
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <Card className="mt-8 rounded-none">
            <CardHeader>
              <CardTitle className="text-xl">Histórico Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentScans.map((scan, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between border p-3 ${
                      scan.status === "success"
                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                        : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    }`}
                  >
                    <div>
                      <div className="font-medium">
                        {scan.ticketData?.holderName || "Desconhecido"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {scan.ticketData?.ticketType || "Ingresso"} -{" "}
                        {scan.ticketData?.eventTitle}
                      </div>
                    </div>
                    <div
                      className={`font-bold ${
                        scan.status === "success"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {scan.status === "success"
                        ? "VÁLIDO"
                        : scan.status === "error"
                        ? "USADO"
                        : "INVÁLIDO"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-12 rounded-none">
          <CardHeader>
            <CardTitle className="text-xl">Como Validar Ingressos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border border-border p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary">01</div>
                <div className="font-semibold mb-1">Digite o Código</div>
                <div className="text-sm text-muted-foreground">
                  Insira o código alfanumérico do ingresso
                </div>
              </div>
              <div className="border border-border p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary">02</div>
                <div className="font-semibold mb-1">Valide</div>
                <div className="text-sm text-muted-foreground">
                  Clique em validar para verificar autenticidade
                </div>
              </div>
              <div className="border border-border p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary">03</div>
                <div className="font-semibold mb-1">Confirme</div>
                <div className="text-sm text-muted-foreground">
                  Libere a entrada se o ingresso for válido
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-none transition-colors"
                onClick={() => setScannerActive((s) => !s)}
                disabled={!VALIDATOR_ROLES.includes(userRole)}
              >
                {scannerActive ? "Fechar Scanner" : "Scanear QR"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ValidatorPage;
