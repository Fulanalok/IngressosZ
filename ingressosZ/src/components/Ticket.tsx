import { memo, useState } from "react";
import { Download, QrCode, ChevronUp } from "lucide-react";
import type { Ticket as TicketType } from "../types";
import QRCodeDisplay from "./QRCodeDisplay";
import { printTicket } from "../lib/pdfPrint";

interface TicketProps {
  ticket: TicketType;
}

const TYPE_LABELS: Record<string, string> = {
  standard: "Padrão",
  vip: "VIP",
  premium: "Premium",
};

const TYPE_COLORS: Record<string, string> = {
  standard: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  vip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  premium: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

function Ticket({ ticket }: TicketProps) {
  const isValid = ticket.status === "active" || ticket.status === "valid";
  const [showQR, setShowQR] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const statusLabel = isValid ? "VÁLIDO" : ticket.status === "used" ? "USADO" : "CANCELADO";
  const statusClass = isValid
    ? "bg-green-500"
    : ticket.status === "used"
    ? "bg-red-500"
    : "bg-yellow-500";

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await printTicket(ticket);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden ${
        !isValid ? "opacity-75" : ""
      }`}
    >
      {/* Colored top strip */}
      <div
        className={`h-1.5 w-full ${
          isValid ? "bg-primary" : ticket.status === "used" ? "bg-red-500" : "bg-yellow-500"
        }`}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 flex-1">
            {ticket.eventTitle || "Evento"}
          </h2>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 text-white ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Event info */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-10 shrink-0 pt-0.5">
              Data
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {ticket.eventDate || "—"}{ticket.eventTime ? ` · ${ticket.eventTime}` : ""}
            </span>
          </div>
          <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-10 shrink-0 pt-0.5">
              Local
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
              {ticket.eventLocation || "—"}
            </span>
          </div>
        </div>

        {/* Ticket type + price row */}
        <div className="flex items-center justify-between mb-5">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
              TYPE_COLORS[ticket.ticketType] ?? TYPE_COLORS.standard
            }`}
          >
            {TYPE_LABELS[ticket.ticketType] ?? ticket.ticketType}
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">
            R$ {ticket.price.toFixed(2)}
          </span>
        </div>

        {/* Dashed divider */}
        <div className="border-t border-dashed border-gray-200 dark:border-gray-600 mb-4" />

        {/* Actions */}
        {isValid ? (
          <div className="space-y-2">
            {/* Always-visible PDF download */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-95"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Gerando PDF..." : "Baixar Ingresso (PDF)"}
            </button>

            {/* QR Code toggle */}
            {ticket.qrCode && (
              <button
                onClick={() => setShowQR((v) => !v)}
                className="w-full flex items-center justify-center gap-2 border border-border hover:bg-muted py-2 rounded-lg text-sm font-medium text-foreground transition-colors"
              >
                {showQR ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ocultar QR Code
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4" />
                    Ver QR Code
                  </>
                )}
              </button>
            )}

            {/* QR Code panel */}
            {showQR && ticket.qrCode && (
              <div className="animate-in fade-in zoom-in duration-200 text-center pt-2">
                <div className="inline-block bg-white p-3 rounded-xl shadow-inner border border-gray-100">
                  <QRCodeDisplay qrCode={ticket.qrCode} size={150} />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-2 break-all px-2">
                  {ticket.qrCode}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-1">
            Este ingresso não está mais disponível para uso.
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(Ticket);
