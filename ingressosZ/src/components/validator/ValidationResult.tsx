import { Button } from "../ui/button";

interface TicketData {
  eventTitle: string;
  ticketType: string;
  holderName: string;
  eventDate: string;
  eventTime: string;
}

interface ValidationResultProps {
  status: "success" | "error" | "invalid" | null;
  message: string;
  ticketData?: TicketData;
  onConfirm?: () => void;
}

export function ValidationResult({
  status,
  message,
  ticketData,
  onConfirm,
}: ValidationResultProps) {
  if (status === null) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <div className="text-6xl mb-4">⏳</div>
        <p>Digite um código de ingresso para validar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="text-center">
        {status === "success" && (
          <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-none">
            <span className="mr-2">✅</span>
            <span className="font-semibold">VÁLIDO</span>
          </div>
        )}
        {status === "error" && (
          <div className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-none">
            <span className="mr-2">❌</span>
            <span className="font-semibold">USADO</span>
          </div>
        )}
        {status === "invalid" && (
          <div className="inline-flex items-center px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-none">
            <span className="mr-2">⚠️</span>
            <span className="font-semibold">INVÁLIDO</span>
          </div>
        )}
      </div>

      {/* Message */}
      <div
        className={`p-4 rounded-none text-center ${
          status === "success"
            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            : status === "error"
            ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
        }`}
      >
        <p
          className={`font-medium ${
            status === "success"
              ? "text-green-800 dark:text-green-300"
              : status === "error"
              ? "text-red-800 dark:text-red-300"
              : "text-yellow-800 dark:text-yellow-300"
          }`}
        >
          {message}
        </p>
      </div>

      {/* Ticket Details */}
      {status === "success" && ticketData && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-none p-4 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-center">
            Detalhes do Ingresso
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Evento:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {ticketData.eventTitle}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {ticketData.ticketType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Portador:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {ticketData.holderName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Data:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {ticketData.eventDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Horário:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {ticketData.eventTime}
              </span>
            </div>
          </div>

          <Button className="w-full mt-4" onClick={onConfirm}>
            ✅ Confirmar Entrada
          </Button>
        </div>
      )}
    </div>
  );
}
