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
  <div className="bg-white dark:bg-gray-800 rounded-none border-2 border-primary-200 dark:border-primary-700 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-3">
          <span className="text-3xl mr-2">🎫</span>
          <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">
            INGRESSO
          </h2>
        </div>
        <div
  className={`${statusColor} text-white px-3 py-1 rounded-none text-xs font-semibold inline-block`}>
          {statusText}
        </div>
      </div>

      {/* Event Details */}
      <div className="space-y-3 mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center">
          {ticket.eventTitle || "Evento"}
        </h3>

        <div className="space-y-2">
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <span className="mr-2">📅</span>
            <span className="text-sm">
              <strong>Data:</strong> {ticket.eventDate || "Data não disponível"}
            </span>
          </div>

          {ticket.eventTime && (
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <span className="mr-2">⏰</span>
              <span className="text-sm">
                <strong>Horário:</strong> {ticket.eventTime}
              </span>
            </div>
          )}

          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <span className="mr-2">📍</span>
            <span className="text-sm">
              <strong>Local:</strong>{" "}
              {ticket.eventLocation || "Local não disponível"}
            </span>
          </div>

          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <span className="mr-2">🎟️</span>
            <span className="text-sm">
              <strong>Tipo:</strong> {ticket.ticketType}
            </span>
          </div>

          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <span className="mr-2">💰</span>
            <span className="text-sm">
              <strong>Preço:</strong> R$ {ticket.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      {ticket.qrCode ? (
        <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-4">
          {showQR ? (
            <div className="space-y-3">
              <QRCodeDisplay
                ticketId={ticket.id}
                qrCode={ticket.qrCode}
                eventId={ticket.eventId}
                size={120}
              />
              <button
                onClick={() => setShowQR(false)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                🔒 Ocultar QR Code
              </button>
            </div>
          ) : (
            <div className="space-y-3">
  <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-none mx-auto flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-1">📱</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    QR CODE
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowQR(true)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                👁️ Mostrar QR Code
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-2">
            ID: {ticket.id.slice(0)}
          </p>
        </div>
      ) : (
        <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-4">
  <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-none mx-auto flex items-center justify-center mb-2">
            <div className="text-center text-gray-400 dark:text-gray-500">
              <div className="text-lg mb-1">⏳</div>
              <div className="text-xs">Gerando QR</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            ID: {ticket.id.slice(0, 8)}...
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
       
  <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-none text-sm font-medium transition-colors duration-200">
          📤 Compartilhar
        </button>
      </div>
    </div>
  );
}

export default memo(Ticket);
