import type { Ticket } from "../types";
import QRCode from "qrcode";

/**
 * Opens a print-ready ticket in a new tab using a Blob URL (avoids popup blockers).
 * The user can then use Ctrl+P / Cmd+P → "Save as PDF".
 */
export async function printTicket(ticket: Ticket): Promise<void> {
  // ── QR Code ────────────────────────────────────────────────────────────────
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(ticket.qrCode || ticket.id, {
      width: 220,
      margin: 1,
      color: { dark: "#1d4ed8", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });
  } catch {
    // continue without QR if generation fails
  }

  // ── Labels ─────────────────────────────────────────────────────────────────
  const TYPE_LABELS: Record<string, string> = {
    standard: "Padrão",
    vip: "VIP",
    premium: "Premium",
  };
  const typeLabel = TYPE_LABELS[ticket.ticketType] ?? ticket.ticketType;

  const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    standard: { bg: "#EFF6FF", text: "#1d4ed8", border: "#BFDBFE" },
    vip:      { bg: "#1d4ed8", text: "#ffffff", border: "#1d4ed8" },
    premium:  { bg: "#0f172a", text: "#60a5fa", border: "#1d4ed8" },
  };
  const typeStyle = TYPE_COLORS[ticket.ticketType] ?? TYPE_COLORS.standard;

  const STATUS_LABELS: Record<string, string> = {
    valid: "VÁLIDO", active: "VÁLIDO", used: "UTILIZADO", cancelled: "CANCELADO",
  };
  const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status.toUpperCase();

  const STATUS_COLORS: Record<string, string> = {
    valid: "#16a34a", active: "#16a34a", used: "#dc2626", cancelled: "#d97706",
  };
  const statusColor = STATUS_COLORS[ticket.status] ?? "#6b7280";

  // ── Date ───────────────────────────────────────────────────────────────────
  // eventDate may already be a formatted "DD/MM/YYYY" string from the query layer
  const dateText = ticket.eventDate || "—";

  // ── Purchase date ──────────────────────────────────────────────────────────
  const purchasedAt = (() => {
    try {
      const ts = ticket.purchaseDate as { toDate?: () => Date } | null;
      const d = ts?.toDate?.() ?? null;
      return d
        ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "";
    } catch {
      return "";
    }
  })();

  // Short ID for display
  const shortId = ticket.id
    ? `${ticket.id.slice(0, 6).toUpperCase()}…${ticket.id.slice(-6).toUpperCase()}`
    : "—";

  // ── HTML ───────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ingresso – ${ticket.eventTitle || "Evento"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;
      background: #EFF6FF;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 16px;
    }

    .ticket {
      width: 440px;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(29, 78, 216, 0.15), 0 2px 8px rgba(0,0,0,0.06);
    }

    /* ── Header ── */
    .ticket-header {
      background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
      padding: 28px 32px 24px;
      position: relative;
      overflow: hidden;
    }
    .ticket-header::after {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 140px; height: 140px;
      border-radius: 50%;
      background: rgba(255,255,255,0.07);
    }
    .brand {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.65);
      margin-bottom: 10px;
    }
    .event-title {
      font-size: 22px;
      font-weight: 900;
      line-height: 1.2;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 4px 12px;
      border-radius: 99px;
      background: rgba(255,255,255,0.15);
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: ${statusColor};
      box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
    }

    /* ── Body ── */
    .ticket-body { padding: 24px 32px 20px; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .info-item { display: flex; flex-direction: column; gap: 3px; }
    .info-item.full { grid-column: 1 / -1; }
    .info-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .info-value {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }

    /* ── Type + Price row ── */
    .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .type-badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: ${typeStyle.bg};
      color: ${typeStyle.text};
      border: 1.5px solid ${typeStyle.border};
    }
    .price {
      font-size: 22px;
      font-weight: 900;
      color: #1d4ed8;
      letter-spacing: -0.02em;
    }

    /* ── Divider ── */
    .divider-wrap {
      position: relative;
      margin: 0 -32px 20px;
    }
    .divider-line {
      border: none;
      border-top: 2px dashed #BFDBFE;
    }
    .divider-notch {
      position: absolute;
      top: -12px;
      width: 24px; height: 24px;
      background: #EFF6FF;
      border-radius: 50%;
    }
    .divider-notch.left  { left: 0; }
    .divider-notch.right { right: 0; }

    /* ── QR Section ── */
    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 4px 0 8px;
    }
    .qr-frame {
      padding: 12px;
      background: #ffffff;
      border: 2px solid #DBEAFE;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(29, 78, 216, 0.10);
    }
    .qr-frame img { display: block; border-radius: 4px; }
    .qr-instruction {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-align: center;
    }
    .qr-id {
      font-size: 9px;
      color: #94a3b8;
      font-family: monospace;
      letter-spacing: 0.05em;
      text-align: center;
    }

    /* ── Footer ── */
    .ticket-footer {
      background: #F1F5F9;
      border-top: 1px solid #E2E8F0;
      padding: 14px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer-brand { font-size: 11px; font-weight: 700; color: #1d4ed8; }
    .footer-meta  { font-size: 10px; color: #94a3b8; text-align: right; line-height: 1.5; }

    /* ── Print ── */
    @media print {
      body { background: #ffffff; padding: 0; align-items: stretch; }
      .ticket {
        box-shadow: none;
        border-radius: 0;
        width: 100%;
        max-width: 100%;
      }
      .divider-notch { background: #ffffff; }
    }
  </style>
</head>
<body>
  <div class="ticket">

    <!-- Header -->
    <div class="ticket-header">
      <div class="brand">IngressosZ · Ingresso Digital</div>
      <div class="event-title">${ticket.eventTitle || "Evento"}</div>
      <div class="status-badge">
        <span class="status-dot"></span>
        ${statusLabel}
      </div>
    </div>

    <!-- Body -->
    <div class="ticket-body">

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Data</span>
          <span class="info-value">${dateText}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Horário</span>
          <span class="info-value">${ticket.eventTime || "—"}</span>
        </div>
        <div class="info-item full">
          <span class="info-label">Local</span>
          <span class="info-value">${ticket.eventLocation || "—"}</span>
        </div>
        <div class="info-item full">
          <span class="info-label">Portador</span>
          <span class="info-value">${ticket.userEmail}</span>
        </div>
      </div>

      <div class="meta-row">
        <span class="type-badge">${typeLabel}</span>
        <span class="price">R$ ${ticket.price.toFixed(2)}</span>
      </div>

      <!-- Dashed divider with notches -->
      <div class="divider-wrap">
        <span class="divider-notch left"></span>
        <hr class="divider-line" />
        <span class="divider-notch right"></span>
      </div>

      <!-- QR Code -->
      <div class="qr-section">
        ${
          qrDataUrl
            ? `<div class="qr-frame">
                <img src="${qrDataUrl}" width="180" height="180" alt="QR Code do ingresso" />
               </div>
               <p class="qr-instruction">Apresente este QR Code na entrada do evento</p>
               <p class="qr-id">ID: ${shortId}</p>`
            : `<p class="qr-instruction" style="color:#94a3b8;">QR Code não disponível</p>`
        }
      </div>

    </div>

    <!-- Footer -->
    <div class="ticket-footer">
      <span class="footer-brand">IngressosZ</span>
      <span class="footer-meta">
        ${purchasedAt ? `Comprado em ${purchasedAt}` : ""}
        ${purchasedAt ? "<br/>" : ""}
        Ingresso digital · Não transferível
      </span>
    </div>

  </div>

  <script>
    window.addEventListener('load', function () {
      // Short delay so fonts and QR render before print dialog
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  // Use Blob URL to avoid popup blockers
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank");

  // Revoke the object URL after the window has loaded
  if (tab) {
    tab.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
  } else {
    // Fallback: revoke after a timeout if tab ref unavailable
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
