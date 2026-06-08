import { Button } from "../ui/button";
import { formatDisplayDate } from "@/lib/date";

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

const statusStyles = {
  success: {
    label: "VÁLIDO",
    badge: "bg-green-900/30 text-green-300",
    box: "border-green-900/50 bg-green-950/30 text-green-200",
  },
  error: {
    label: "USADO",
    badge: "bg-red-900/30 text-red-300",
    box: "border-red-900/50 bg-red-950/30 text-red-200",
  },
  invalid: {
    label: "INVÁLIDO",
    badge: "bg-yellow-900/30 text-yellow-300",
    box: "border-yellow-900/50 bg-yellow-950/30 text-yellow-200",
  },
};

export function ValidationResult({
  status,
  message,
  ticketData,
  onConfirm,
}: ValidationResultProps) {
  if (status === null) {
    return (
      <div className="border border-dashed border-border py-12 text-center text-muted-foreground">
        <p>Digite um código de ingresso para validar</p>
      </div>
    );
  }

  const styles = statusStyles[status];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className={`inline-flex items-center px-4 py-2 ${styles.badge}`}>
          <span className="font-semibold">{styles.label}</span>
        </div>
      </div>

      <div className={`border p-4 text-center ${styles.box}`}>
        <p className="font-medium">{message}</p>
      </div>

      {status === "success" && ticketData && (
        <div className="space-y-3 border border-border bg-background p-4">
          <h4 className="text-center font-semibold text-foreground">
            Detalhes do Ingresso
          </h4>
          <div className="space-y-2 text-sm">
            <DetailRow label="Evento" value={ticketData.eventTitle} />
            <DetailRow label="Tipo" value={ticketData.ticketType} />
            <DetailRow label="Portador" value={ticketData.holderName} />
            <DetailRow
              label="Data"
              value={formatDisplayDate(ticketData.eventDate)}
            />
            <DetailRow label="Horário" value={ticketData.eventTime} />
          </div>

          <Button className="mt-4 w-full" onClick={onConfirm}>
            Confirmar Entrada
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
