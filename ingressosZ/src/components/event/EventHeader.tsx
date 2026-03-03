import type { Event } from "../../types";

interface EventHeaderProps {
  event: Event;
  availabilityBg: string;
  availabilityColor: string;
}

export function EventHeader({
  event,
  availabilityBg,
  availabilityColor,
}: EventHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-none text-sm font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200">
          <span className="mr-1">🎨</span>
          {event.category}
        </span>
        <div
          className={`inline-flex items-center px-3 py-1 rounded-none text-sm font-medium ${availabilityBg} ${availabilityColor}`}
        >
          <span className="mr-1">🎟️</span>
          {event.availableTickets} ingressos disponíveis
        </div>
      </div>

      <h1 className="text-4xl font-bold text-foreground mb-4">{event.title}</h1>

      <p className="text-lg text-muted-foreground leading-relaxed">
        {event.description}
      </p>
    </div>
  );
}
