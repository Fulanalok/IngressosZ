import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ScannerSection } from "../components/validator/ScannerSection";
import { ValidationResult } from "../components/validator/ValidationResult";
import { ValidatorForm } from "../components/validator/ValidatorForm";
import { useAuth } from "../hooks/useAuth";
import {
  useTicketValidator,
  type ValidationResultState,
} from "../hooks/validator/useTicketValidator";
import { TestDataService } from "../services/testDataService";

function ValidatorPage() {
  const { user, userProfile } = useAuth();
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

  // Códigos de teste válidos
  const testCodes = [
    "TICKET-1756219017406-fh2k739l1",
    "TICKET-JT1ZHCGOVQYIECOUAZCF",
    "TICKET-1756219017407-usado123",
    "TICKET-1735210800000-ABC123",
    "TICKET-1756295230187-lxfcondum",
  ];

  const generateTestCode = () => {
    const randomCode = testCodes[Math.floor(Math.random() * testCodes.length)];
    setTicketCode(randomCode);
  };

  const createTestData = async () => {
    setIsCreatingTestData(true);
    try {
      // Forçar recriação dos dados
      await TestDataService.initializeTestData(true);
      alert(
        "✅ Dados de teste criados com sucesso!\n\nCódigos disponíveis:\n- TICKET-1756219017406-fh2k739l1\n- TICKET-JT1ZHCGOVQYIECOUAZCF\n- TICKET-1756295230187-lxfcondum\n\nCódigo usado (para teste):\n- TICKET-1756219017407-usado123"
      );
    } catch (error) {
      console.error("Erro ao criar dados:", error);
      alert(
        "⚠️ Firebase indisponível - Usando modo offline!\n\nCódigos de teste funcionais:\n- TICKET-1756219017406-fh2k739l1\n- TICKET-JT1ZHCGOVQYIECOUAZCF\n- TICKET-1756295230187-lxfcondum\n- TICKET-1756219017407-usado123 (usado)\n\nO validador funcionará normalmente!"
      );
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

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Validador de Ingressos
          </h1>
          <p className="text-xl text-muted-foreground">
            Olá,{" "}
            <span className="font-semibold text-green-600 dark:text-green-400">
              {user?.email}
            </span>
            !
          </p>
          <p className="text-muted-foreground mt-2">
            Valide ingressos de forma rápida e segura
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

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Validation Form */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                <span className="mr-2 text-4xl align-middle">📱</span>
                Validar Ingresso
              </CardTitle>
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
                createTestData={createTestData}
                isCreatingTestData={isCreatingTestData}
              />
            </CardContent>
          </Card>

          {/* Validation Result */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                <span className="mr-2 text-4xl align-middle">📋</span>
                Resultado da Validação
              </CardTitle>
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
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-xl">Histórico Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentScans.map((scan, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border flex justify-between items-center ${
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
        <Card className="mt-12">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Como Validar Ingressos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">1️⃣</div>
                <div className="font-semibold mb-1">Digite o Código</div>
                <div className="text-sm text-muted-foreground">
                  Insira o código alfanumérico do ingresso
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">2️⃣</div>
                <div className="font-semibold mb-1">Valide</div>
                <div className="text-sm text-muted-foreground">
                  Clique em validar para verificar autenticidade
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">3️⃣</div>
                <div className="font-semibold mb-1">Confirme</div>
                <div className="text-sm text-muted-foreground">
                  Libere a entrada se o ingresso for válido
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
                onClick={() => setScannerActive((s) => !s)}
                disabled={
                  String(userProfile?.role || "user").toLowerCase() !==
                  "validator"
                }
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
