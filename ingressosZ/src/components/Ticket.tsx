import type { Ticket as TicketType } from "../types";
import QRCodeDisplay from "./QRCodeDisplay";
import { useState, memo } from "react";

interface TicketProps {
  ticket: TicketType;
}

function Ticket({ ticket }: TicketProps) {
  const isValid = ticket.status === "active";
  const statusColor = isValid
    ? "bg-green-500"
    : ticket.status === "used"
    ? "bg-red-500"
    : "bg-yellow-500";
  const statusText = isValid
    ? "VÁLIDO"
    : ticket.status === "used"
    ? "USADO"
    : "CANCELADO";
  const [showQR, setShowQR] = useState(false);

  return (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-6 max-w-sm mx-auto relative overflow-hidden group ${!isValid ? 'opacity-80' : ''}`}>
      {/* Status Banner */}
      <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-lg font-bold text-xs text-white ${statusColor}`}>
          {statusText}
      </div>

      {/* Header */}
      <div className="text-center mb-6 mt-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 line-clamp-2 min-h-[3.5rem] flex items-center justify-center">
          {ticket.eventTitle || "Evento"}
        </h2>
      </div>

      {/* Event Details */}
      <div className="space-y-4 mb-6 text-sm">
        <div className="flex items-center text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
          <span className="mr-3 text-lg">📅</span>
          <div>
             <div className="font-semibold text-xs text-muted-foreground uppercase">Data</div>
             <div>{ticket.eventDate || "Data não disponível"} {ticket.eventTime && `• ${ticket.eventTime}`}</div>
          </div>
        </div>

        <div className="flex items-center text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
          <span className="mr-3 text-lg">📍</span>
          <div>
             <div className="font-semibold text-xs text-muted-foreground uppercase">Local</div>
             <div className="line-clamp-1">{ticket.eventLocation || "Local não disponível"}</div>
          </div>
        </div>

        <div className="flex items-center text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
          <span className="mr-3 text-lg">🎟️</span>
          <div>
             <div className="font-semibold text-xs text-muted-foreground uppercase">Tipo</div>
             <div>{ticket.ticketType} • R$ {ticket.price.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      {ticket.qrCode && isValid && (
        <div className="text-center border-t border-dashed border-gray-300 dark:border-gray-600 pt-6">
          {showQR ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-2 rounded-lg inline-block shadow-inner">
                  <QRCodeDisplay
                    ticketId={ticket.id}
                    qrCode={ticket.qrCode}
                    eventId={ticket.eventId}
                    size={150}
                  />
              </div>
              <p className="text-xs text-muted-foreground font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">
                  {ticket.qrCode}
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="text-sm text-primary hover:underline font-medium flex items-center justify-center w-full gap-2">
                🔒 Ocultar QR Code
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowQR(true)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-md font-bold transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2">
              <span className="text-xl">📱</span>
              Ver Ingresso (QR Code)
            </button>
          )}
        </div>
      )}
      
      {!isValid && (
         <div className="text-center border-t border-dashed border-gray-300 dark:border-gray-600 pt-6 text-muted-foreground">
            <div className="text-4xl mb-2 grayscale opacity-50">🎫</div>
            <p className="text-sm">Este ingresso não está mais disponível para uso.</p>
         </div>
      )}
  </div>
  );
}

export default memo(Ticket);
