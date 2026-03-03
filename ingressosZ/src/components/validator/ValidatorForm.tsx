import type { UserProfile } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ValidatorFormProps {
  ticketCode: string;
  setTicketCode: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isValidating: boolean;
  onReset: () => void;
  userProfile: UserProfile | null;
  validationStatus: "success" | "error" | "invalid" | null;
  generateTestCode: () => void;
  createTestData: () => void;
  isCreatingTestData: boolean;
}

export function ValidatorForm({
  ticketCode,
  setTicketCode,
  onSubmit,
  isValidating,
  onReset,
  userProfile,
  validationStatus,
  generateTestCode,
  createTestData,
  isCreatingTestData,
}: ValidatorFormProps) {
  const allowedRoles = ["validator", "organizer", "admin"];
  const userRole = String(userProfile?.role || "user").toLowerCase();
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-6" aria-busy={isValidating}>
        <div>
          <label
            htmlFor="ticketCode"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Código do Ingresso
          </label>
          <div className="relative">
            <Input
              id="ticketCode"
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
              placeholder="Ex: TICKET-1735210800000-ABC123"
              required
              className="pl-10 font-mono tracking-widest"
              disabled={isValidating}
              aria-describedby={
                validationStatus
                  ? "validation-help validation-result"
                  : "validation-help"
              }
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-muted-foreground">🎫</span>
            </div>
          </div>
          <p
            id="validation-help"
            className="text-xs text-muted-foreground mt-2"
          >
            Exemplo: TICKET-1735210800000-ABC123
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            type="submit"
            disabled={
              isValidating ||
              !ticketCode.trim() ||
              !allowedRoles.includes(userRole)
            }
            className="flex-1 flex justify-center items-center py-3 px-4 font-medium"
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Validando...
              </>
            ) : (
              <>
                <span className="mr-2">🔍</span>
                Validar Ingresso
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onReset}
            className="px-4 py-3 font-medium"
          >
            🗑️
            <span className="sr-only">Limpar código</span>
          </Button>
        </div>
      </form>

      {/* Quick Actions */}
      <div className="mt-6 p-4 rounded-lg bg-muted">
        <h3 className="font-semibold text-foreground mb-3">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={generateTestCode}
            variant="secondary"
            className="py-2 px-3 text-sm"
          >
            <span className="mr-1">🎲</span>
            Código Teste
          </Button>
          {String(userProfile?.role || "user").toLowerCase() !== "user" && (
            <Button
              type="button"
              onClick={createTestData}
              disabled={isCreatingTestData}
              className="py-2 px-3 text-sm"
            >
              <span className="mr-1">🔧</span>
              {isCreatingTestData ? "Criando..." : "Criar Dados"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
