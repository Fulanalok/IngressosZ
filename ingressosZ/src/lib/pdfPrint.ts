import type { Ticket } from "../types";
import QRCode from "qrcode";

/**
 * Opens a new browser window with a print-ready ticket layout.
 * The user can save as PDF from the print dialog.
 */
export async function printTicket(ticket: Ticket): Promise<void> {
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(ticket.qrCode, {
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    // continue without QR if generation fails
  }

  const typeLabel =
    ticket.ticketType === "vip"
      ? "VIP"
      : ticket.ticketType === "premium"
      ? "Premium"
      : "Standard";

  const dateText = ticket.eventDate
    ? new Date(ticket.eventDate).toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Data não informada";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Ingresso – ${ticket.eventTitle || "Evento"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 32px 16px;
      min-height: 100vh;
    }
    .ticket {
      background: #fff;
      width: 420px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    }
    .ticket-header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #fff;
      padding: 28px 28px 20px;
    }
    .ticket-header .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.15em;
      opacity: 0.8;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .ticket-header h1 {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.25;
    }
    .ticket-body {
      padding: 24px 28px;
    }
    .info-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 14px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 2px;
    }
    .info-value {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    .divider {
      border: none;
      border-top: 2px dashed #e5e7eb;
      margin: 20px 0;
      position: relative;
    }
    .divider::before,
    .divider::after {
      content: '';
      position: absolute;
      top: -10px;
      width: 20px;
      height: 20px;
      background: #f5f5f5;
      border-radius: 50%;
    }
    .divider::before { left: -38px; }
    .divider::after  { right: -38px; }
    .qr-section {
      text-align: center;
      padding: 4px 0 8px;
    }
    .qr-section img {
      width: 160px;
      height: 160px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px;
    }
    .qr-label {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 8px;
      font-family: monospace;
      word-break: break-all;
    }
    .badge {
      display: inline-block;
      background: #ede9fe;
      color: #6d28d9;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 99px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .price {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
    }
    .ticket-footer {
      background: #f9fafb;
      padding: 14px 28px;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .ticket { box-shadow: none; border-radius: 0; width: 100%; }
      .divider::before,
      .divider::after { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <div class="brand">IngressosZ</div>
      <h1>${ticket.eventTitle || "Evento"}</h1>
    </div>
    <div class="ticket-body">
      <div class="info-row">
        <span class="info-label">Data</span>
        <span class="info-value">${dateText}${ticket.eventTime ? " · " + ticket.eventTime : ""}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Local</span>
        <span class="info-value">${ticket.eventLocation || "—"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Portador</span>
        <span class="info-value">${ticket.userEmail}</span>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
        <div>
          <span class="info-label">Tipo</span><br/>
          <span class="badge">${typeLabel}</span>
        </div>
        <div style="text-align:right;">
          <span class="info-label">Valor</span><br/>
          <span class="price">R$ ${ticket.price.toFixed(2)}</span>
        </div>
      </div>
      <hr class="divider" />
      ${
        qrDataUrl
          ? `<div class="qr-section">
              <img src="${qrDataUrl}" alt="QR Code" />
              <div class="qr-label">${ticket.qrCode}</div>
            </div>`
          : `<div class="qr-section"><p style="color:#9ca3af;font-size:12px;">QR Code não disponível</p></div>`
      }
    </div>
    <div class="ticket-footer">
      Ingresso gerado por IngressosZ · Apresente este QR Code na entrada
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=520,height=780");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
