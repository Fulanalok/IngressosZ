import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useState } from "react";
import { Download, QrCode, ChevronUp } from "lucide-react";
import QRCodeDisplay from "./QRCodeDisplay";
import { printTicket } from "../lib/pdfPrint";
const TYPE_LABELS = {
    standard: "Padrão",
    vip: "VIP",
    premium: "Premium",
};
const TYPE_COLORS = {
    standard: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    vip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    premium: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};
function Ticket({ ticket }) {
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
        }
        finally {
            setDownloading(false);
        }
    };
    return (_jsxs("div", { className: `bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden ${!isValid ? "opacity-75" : ""}`, children: [_jsx("div", { className: `h-1.5 w-full ${isValid ? "bg-primary" : ticket.status === "used" ? "bg-red-500" : "bg-yellow-500"}` }), _jsxs("div", { className: "p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-4", children: [_jsx("h2", { className: "text-base font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 flex-1", children: ticket.eventTitle || "Evento" }), _jsx("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 text-white ${statusClass}`, children: statusLabel })] }), _jsxs("div", { className: "space-y-2 mb-4 text-sm", children: [_jsxs("div", { className: "flex items-start gap-2 text-gray-600 dark:text-gray-400", children: [_jsx("span", { className: "text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-10 shrink-0 pt-0.5", children: "Data" }), _jsxs("span", { className: "font-medium text-gray-800 dark:text-gray-200", children: [ticket.eventDate || "—", ticket.eventTime ? ` · ${ticket.eventTime}` : ""] })] }), _jsxs("div", { className: "flex items-start gap-2 text-gray-600 dark:text-gray-400", children: [_jsx("span", { className: "text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-10 shrink-0 pt-0.5", children: "Local" }), _jsx("span", { className: "font-medium text-gray-800 dark:text-gray-200 line-clamp-1", children: ticket.eventLocation || "—" })] })] }), _jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsx("span", { className: `text-xs font-semibold px-2.5 py-1 rounded-md ${TYPE_COLORS[ticket.ticketType] ?? TYPE_COLORS.standard}`, children: TYPE_LABELS[ticket.ticketType] ?? ticket.ticketType }), _jsxs("span", { className: "text-base font-bold text-gray-900 dark:text-gray-100", children: ["R$ ", ticket.price.toFixed(2)] })] }), _jsx("div", { className: "border-t border-dashed border-gray-200 dark:border-gray-600 mb-4" }), isValid ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("button", { onClick: handleDownload, disabled: downloading, className: "w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-95", children: [_jsx(Download, { className: "h-4 w-4" }), downloading ? "Gerando PDF..." : "Baixar Ingresso (PDF)"] }), ticket.qrCode && (_jsx("button", { onClick: () => setShowQR((v) => !v), className: "w-full flex items-center justify-center gap-2 border border-border hover:bg-muted py-2 rounded-lg text-sm font-medium text-foreground transition-colors", children: showQR ? (_jsxs(_Fragment, { children: [_jsx(ChevronUp, { className: "h-4 w-4" }), "Ocultar QR Code"] })) : (_jsxs(_Fragment, { children: [_jsx(QrCode, { className: "h-4 w-4" }), "Ver QR Code"] })) })), showQR && ticket.qrCode && (_jsxs("div", { className: "animate-in fade-in zoom-in duration-200 text-center pt-2", children: [_jsx("div", { className: "inline-block bg-white p-3 rounded-xl shadow-inner border border-gray-100", children: _jsx(QRCodeDisplay, { qrCode: ticket.qrCode, size: 150 }) }), _jsx("p", { className: "text-[10px] text-muted-foreground font-mono mt-2 break-all px-2", children: ticket.qrCode })] }))] })) : (_jsx("p", { className: "text-center text-sm text-muted-foreground py-1", children: "Este ingresso n\u00E3o est\u00E1 mais dispon\u00EDvel para uso." }))] })] }));
}
export default memo(Ticket);
