import type { Ticket } from "../types";
import QRCode from "qrcode";
import { formatDisplayDate } from "./date";

type TypeStyle = {
  bg: string;
  border: string;
  label: string;
  text: string;
};

type StatusStyle = {
  color: string;
  label: string;
};

const TYPE_STYLES: Record<string, TypeStyle> = {
  standard: {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    label: "Padrão",
    text: "#1d4ed8",
  },
  vip: {
    bg: "#1d4ed8",
    border: "#1d4ed8",
    label: "VIP",
    text: "#ffffff",
  },
  premium: {
    bg: "#0f172a",
    border: "#1d4ed8",
    label: "Premium",
    text: "#60a5fa",
  },
};

const STATUS_STYLES: Record<string, StatusStyle> = {
  active: { color: "#16a34a", label: "VÁLIDO" },
  cancelled: { color: "#d97706", label: "CANCELADO" },
  used: { color: "#dc2626", label: "UTILIZADO" },
  valid: { color: "#16a34a", label: "VÁLIDO" },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function createQrDataUrl(ticket: Ticket) {
  try {
    return await QRCode.toDataURL(ticket.qrCode || ticket.id, {
      width: 220,
      margin: 1,
      color: { dark: "#1d4ed8", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });
  } catch {
    return "";
  }
}

function getTypeStyle(ticket: Ticket) {
  return TYPE_STYLES[ticket.ticketType] ?? {
    ...TYPE_STYLES.standard,
    label: ticket.ticketType,
  };
}

function getStatusStyle(ticket: Ticket) {
  return (
    STATUS_STYLES[ticket.status] ?? {
      color: "#6b7280",
      label: ticket.status.toUpperCase(),
    }
  );
}

function getPurchasedAt(ticket: Ticket) {
  try {
    const ts = ticket.purchaseDate as { toDate?: () => Date } | null;
    const purchasedAt = ts?.toDate?.() ?? null;
    return purchasedAt
      ? purchasedAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";
  } catch {
    return "";
  }
}

function getShortId(ticket: Ticket) {
  return ticket.id
    ? `${ticket.id.slice(0, 6).toUpperCase()}…${ticket.id
        .slice(-6)
        .toUpperCase()}`
    : "—";
}

function buildQrSection(qrDataUrl: string, shortId: string) {
  if (!qrDataUrl) {
    return `<p class="qr-instruction muted">QR Code não disponível</p>`;
  }

  return `<div class="qr-frame">
    <img src="${qrDataUrl}" width="180" height="180" alt="QR Code do ingresso" />
  </div>
  <p class="qr-instruction">Apresente este QR Code na entrada do evento</p>
  <p class="qr-id">ID: ${escapeHtml(shortId)}</p>`;
}

function buildFooterMeta(purchasedAt: string) {
  const purchaseLine = purchasedAt ? `Comprado em ${purchasedAt}<br/>` : "";
  return `${purchaseLine}Ingresso digital · Não transferível`;
}

function buildTicketHtml(ticket: Ticket, qrDataUrl: string) {
  const typeStyle = getTypeStyle(ticket);
  const statusStyle = getStatusStyle(ticket);
  const eventTitle = escapeHtml(ticket.eventTitle || "Evento");
  const eventLocation = escapeHtml(ticket.eventLocation || "—");
  const eventTime = escapeHtml(ticket.eventTime || "—");
  const userEmail = escapeHtml(ticket.userEmail);
  const dateText = ticket.eventDate ? formatDisplayDate(ticket.eventDate) : "—";
  const purchasedAt = getPurchasedAt(ticket);
  const shortId = getShortId(ticket);
  const qrSection = buildQrSection(qrDataUrl, shortId);
  const footerMeta = buildFooterMeta(purchasedAt);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ingresso - ${eventTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      align-items: flex-start;
      background: #EFF6FF;
      display: flex;
      font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;
      justify-content: center;
      min-height: 100vh;
      padding: 40px 16px;
    }
    .ticket {
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 8px 40px rgba(29, 78, 216, 0.15), 0 2px 8px rgba(0,0,0,0.06);
      overflow: hidden;
      width: 440px;
    }
    .ticket-header {
      background: #1d4ed8;
      overflow: hidden;
      padding: 28px 32px 24px;
      position: relative;
    }
    .brand {
      color: rgba(255,255,255,0.65);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.2em;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .event-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .status-badge {
      align-items: center;
      background: rgba(255,255,255,0.15);
      border-radius: 99px;
      color: #ffffff;
      display: inline-flex;
      font-size: 10px;
      font-weight: 800;
      gap: 6px;
      letter-spacing: 0.12em;
      margin-top: 12px;
      padding: 4px 12px;
      text-transform: uppercase;
    }
    .status-dot {
      background: ${statusStyle.color};
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
      height: 6px;
      width: 6px;
    }
    .ticket-body { padding: 24px 32px 20px; }
    .info-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 20px;
    }
    .info-item { display: flex; flex-direction: column; gap: 3px; }
    .info-item.full { grid-column: 1 / -1; }
    .info-label {
      color: #94a3b8;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }
    .info-value {
      color: #0f172a;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
    }
    .meta-row {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .type-badge {
      background: ${typeStyle.bg};
      border: 1.5px solid ${typeStyle.border};
      border-radius: 8px;
      color: ${typeStyle.text};
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 5px 14px;
      text-transform: uppercase;
    }
    .price {
      color: #1d4ed8;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .divider-wrap { margin: 0 -32px 20px; position: relative; }
    .divider-line { border: none; border-top: 2px dashed #BFDBFE; }
    .divider-notch {
      background: #EFF6FF;
      border-radius: 50%;
      height: 24px;
      position: absolute;
      top: -12px;
      width: 24px;
    }
    .divider-notch.left { left: 0; }
    .divider-notch.right { right: 0; }
    .qr-section {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 4px 0 8px;
    }
    .qr-frame {
      background: #ffffff;
      border: 2px solid #DBEAFE;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(29, 78, 216, 0.10);
      padding: 12px;
    }
    .qr-frame img { display: block; border-radius: 4px; }
    .qr-instruction {
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
    }
    .qr-instruction.muted { color: #94a3b8; }
    .qr-id {
      color: #94a3b8;
      font-family: monospace;
      font-size: 9px;
      letter-spacing: 0.05em;
      text-align: center;
    }
    .ticket-footer {
      align-items: center;
      background: #F1F5F9;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      padding: 14px 32px;
    }
    .footer-brand { color: #1d4ed8; font-size: 11px; font-weight: 700; }
    .footer-meta { color: #94a3b8; font-size: 10px; line-height: 1.5; text-align: right; }
    @media print {
      body { align-items: stretch; background: #ffffff; padding: 0; }
      .ticket { border-radius: 0; box-shadow: none; max-width: 100%; width: 100%; }
      .divider-notch { background: #ffffff; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <div class="brand">IngressosZ · Ingresso Digital</div>
      <div class="event-title">${eventTitle}</div>
      <div class="status-badge">
        <span class="status-dot"></span>
        ${escapeHtml(statusStyle.label)}
      </div>
    </div>
    <div class="ticket-body">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Data</span>
          <span class="info-value">${escapeHtml(dateText)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Horário</span>
          <span class="info-value">${eventTime}</span>
        </div>
        <div class="info-item full">
          <span class="info-label">Local</span>
          <span class="info-value">${eventLocation}</span>
        </div>
        <div class="info-item full">
          <span class="info-label">Portador</span>
          <span class="info-value">${userEmail}</span>
        </div>
      </div>
      <div class="meta-row">
        <span class="type-badge">${escapeHtml(typeStyle.label)}</span>
        <span class="price">R$ ${ticket.price.toFixed(2)}</span>
      </div>
      <div class="divider-wrap">
        <span class="divider-notch left"></span>
        <hr class="divider-line" />
        <span class="divider-notch right"></span>
      </div>
      <div class="qr-section">${qrSection}</div>
    </div>
    <div class="ticket-footer">
      <span class="footer-brand">IngressosZ</span>
      <span class="footer-meta">${footerMeta}</span>
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`;
}

function openPrintWindow(html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank");

  if (tab) {
    tab.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    return;
  }

  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function printTicket(ticket: Ticket): Promise<void> {
  const qrDataUrl = await createQrDataUrl(ticket);
  openPrintWindow(buildTicketHtml(ticket, qrDataUrl));
}
