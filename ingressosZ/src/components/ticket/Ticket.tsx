import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import { formatDisplayDate } from "@/lib/date";
import { printTicket } from "@/lib/pdfPrint";
import type { Ticket as TicketType } from "@/types";
import { ChevronUp, Download, QrCode } from "lucide-react";
import { memo, useState } from "react";

interface TicketProps {
  ticket: TicketType;
}

const TYPE_LABELS: Record<string, string> = {
  standard: "Padrão",
  vip: "VIP",
  premium: "Premium",
};

const TYPE_COLORS: Record<string, string> = {
  standard: "border border-border bg-background text-foreground",
  vip: "border border-primary/40 bg-primary/10 text-primary",
  premium: "border border-primary bg-primary text-primary-foreground",
};

const STATUS_LABELS: Record<TicketType["status"], string> = {
  valid: "VÁLIDO",
  used: "USADO",
  cancelled: "CANCELADO",
};

const STATUS_COLORS: Record<TicketType["status"], string> = {
  valid: "bg-green-500",
  used: "bg-red-500",
  cancelled: "bg-yellow-500",
};

function TicketHeader({ ticket }: { ticket: TicketType }) {
  const isValid = ticket.status === "valid";

  return (
    <>
      <div
        className={`h-1.5 w-full ${
          isValid ? "bg-primary" : STATUS_COLORS[ticket.status]
        }`}
      />
      <div className="flex items-start justify-between gap-4 mb-5">
        <h2 className="text-lg font-extrabold text-primary leading-tight line-clamp-2 flex-1">
          {ticket.eventTitle || "Evento"}
        </h2>
        <span
          className={`shrink-0 px-3 py-1 text-[10px] font-black text-white ${
            STATUS_COLORS[ticket.status]
          }`}
        >
          {STATUS_LABELS[ticket.status]}
        </span>
      </div>
    </>
  );
}

function TicketDetails({ ticket }: { ticket: TicketType }) {
  const eventDate = ticket.eventDate ? formatDisplayDate(ticket.eventDate) : "—";
  const dateTime = ticket.eventTime ? `${eventDate} · ${ticket.eventTime}` : eventDate;

  return (
    <div className="space-y-3 mb-6 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 w-12 shrink-0">
          Data
        </span>
        <span className="font-bold text-foreground">{dateTime}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 w-12 shrink-0">
          Local
        </span>
        <span className="font-bold text-foreground line-clamp-1">
          {ticket.eventLocation || "—"}
        </span>
      </div>
    </div>
  );
}

function TicketMeta({ ticket }: { ticket: TicketType }) {
  const price = typeof ticket.price === "number" ? ticket.price : 0;

  return (
    <div className="flex items-center justify-between mb-5">
      <span
        className={`px-2.5 py-1 text-xs font-semibold ${
          TYPE_COLORS[ticket.ticketType] ?? TYPE_COLORS.standard
        }`}
      >
        {TYPE_LABELS[ticket.ticketType] ?? ticket.ticketType}
      </span>
      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
        R$ {price.toFixed(2)}
      </span>
    </div>
  );
}

function QrToggleContent({ showQR }: { showQR: boolean }) {
  return showQR ? (
    <>
      <ChevronUp className="h-4 w-4" />
      Ocultar QR Code
    </>
  ) : (
    <>
      <QrCode className="h-4 w-4" />
      Ver QR Code
    </>
  );
}

function TicketQrPanel({ ticket }: { ticket: TicketType }) {
  return (
    <div className="pt-4 text-center">
      <div className="inline-block border border-border bg-white p-4 shadow-sm">
        <QRCodeDisplay qrCode={ticket.qrCode} size={160} />
        <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
          <p className="text-[9px] text-muted-foreground font-mono break-all opacity-50 uppercase tracking-tighter">
            ID: {ticket.id.slice(0, 8)}...{ticket.id.slice(-8)}
          </p>
        </div>
      </div>
    </div>
  );
}

function TicketActions({ ticket }: { ticket: TicketType }) {
  const [showQR, setShowQR] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await printTicket(ticket);
    } finally {
      setDownloading(false);
    }
  };

  if (ticket.status !== "valid") {
    return (
      <p className="text-center text-sm text-muted-foreground py-1">
        Este ingresso não está mais disponível para uso.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {downloading ? "Gerando PDF..." : "Baixar Ingresso (PDF)"}
      </button>

      {ticket.qrCode && (
        <button
          onClick={() => setShowQR((value) => !value)}
          className="flex w-full items-center justify-center gap-2 border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <QrToggleContent showQR={showQR} />
        </button>
      )}

      {showQR && ticket.qrCode && <TicketQrPanel ticket={ticket} />}
    </div>
  );
}

function Ticket({ ticket }: TicketProps) {
  const isValid = ticket.status === "valid";

  return (
    <div
      data-testid="ticket-card"
      className={`group overflow-hidden border border-border bg-card text-card-foreground shadow-sm ${
        isValid ? "" : "opacity-60"
      }`}
    >
      <TicketHeader ticket={ticket} />

      <div className="p-5">
        <TicketDetails ticket={ticket} />
        <TicketMeta ticket={ticket} />
        <div className="mb-4 border-t border-dashed border-border" />
        <TicketActions ticket={ticket} />
      </div>
    </div>
  );
}

export default memo(Ticket);
