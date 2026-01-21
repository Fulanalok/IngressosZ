import type { Event } from "../../types";

interface EventInfoProps {
  event: Event;
  formattedDate: string;
  formattedTime: string;
}

export function EventInfo({
  event,
  formattedDate,
  formattedTime,
}: EventInfoProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground mb-4">
        📅 Informações do Evento
      </h2>

      <div className="space-y-4">
        <div className="flex items-center text-foreground">
          <span className="w-6 h-6 mr-3 text-primary">📅</span>
          <div>
            <p className="font-medium">Data</p>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center text-foreground">
          <span className="w-6 h-6 mr-3 text-primary">⏰</span>
          <div>
            <p className="font-medium">Horário</p>
            <p className="text-sm text-muted-foreground">{formattedTime}</p>
          </div>
        </div>

        <div className="flex items-center text-foreground">
          <span className="w-6 h-6 mr-3 text-primary">📍</span>
          <div>
            <p className="font-medium">Local</p>
            <p className="text-sm text-muted-foreground">{event.location}</p>
          </div>
        </div>

        <div className="flex items-center text-foreground">
          <span className="w-6 h-6 mr-3 text-primary">💰</span>
          <div>
            <p className="font-medium">Preço Base</p>
            <p className="text-sm text-muted-foreground">
              A partir de R$ {event.price.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
