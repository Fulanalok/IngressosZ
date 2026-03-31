import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { Button } from "@/components/ui/button";
import { TICKET_TYPES } from "@/constants/ticketTypes";
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";
import { StatusScreen, Wallet } from "@mercadopago/sdk-react";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
export function TicketPurchase({ event, user, onClose }) {
    const [selectedTicketType, setSelectedTicketType] = useState("standard");
    const [quantity, setQuantity] = useState(1);
    const [paymentStatus, setPaymentStatus] = useState("idle");
    const [paymentMethod, setPaymentMethod] = useState("checkout");
    const hasPublicKey = Boolean(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);
    const buyerEmail = user?.email || "";
    const { createPreference, createPixPayment, preferenceId, pixData, isLoading: checkoutLoading, error: checkoutError, } = useMercadoPagoCheckout(event, selectedTicketType, quantity, user?.uid, buyerEmail);
    const unitPrice = useMemo(() => {
        return event.pricing?.[selectedTicketType] ?? event.price;
    }, [event, selectedTicketType]);
    const totalPrice = useMemo(() => unitPrice * quantity, [unitPrice, quantity]);
    const handlePurchase = async () => {
        if (maxQuantity < quantity) {
            toast.error("Quantidade solicitada superior ao estoque disponível.");
            return;
        }
        setPaymentStatus("processing");
        await createPreference();
    };
    const handlePixPurchase = async () => {
        if (maxQuantity < quantity) {
            toast.error("Quantidade solicitada superior ao estoque disponível.");
            return;
        }
        setPaymentStatus("processing");
        await createPixPayment();
    };
    const maxQuantity = event.inventory?.[selectedTicketType] ?? event.availableTickets ?? 0;
    if (paymentStatus === "succeeded") {
        return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-background rounded-lg shadow-xl p-8 max-w-md w-full text-center", children: [_jsx(StatusScreen, { initialization: { paymentId: "" }, onReady: () => console.log("Status screen ready"), onError: (err) => console.error("Status screen error", err) }), _jsx(Button, { onClick: onClose, className: "mt-4", children: "Fechar" })] }) }));
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col", children: [_jsxs("div", { className: "flex justify-between items-center p-4 border-b border-border", children: [_jsx("h2", { className: "text-xl font-bold text-foreground", children: "Comprar Ingressos" }), _jsx(Button, { variant: "ghost", size: "icon", onClick: onClose, children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "p-6 space-y-6 overflow-y-auto", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-foreground mb-3", children: "Tipo de Ingresso" }), _jsx("div", { className: "space-y-3", children: Object.entries(TICKET_TYPES).map(([type, info]) => {
                                        const availableForType = event.inventory?.[type] ??
                                            event.availableTickets;
                                        const isSoldOut = availableForType === 0;
                                        return (_jsxs("label", { className: `flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${isSoldOut
                                                ? "opacity-50 cursor-not-allowed border-border bg-muted/50"
                                                : selectedTicketType === type
                                                    ? "border-primary bg-muted"
                                                    : "border-border hover:border-primary"}`, children: [_jsx("input", { type: "radio", name: "ticketType", value: type, checked: selectedTicketType === type, onChange: () => !isSoldOut &&
                                                        setSelectedTicketType(type), disabled: isSoldOut, className: "sr-only" }), _jsx("div", { className: "flex-1", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "text-2xl mr-3", children: info.icon }), _jsxs("div", { children: [_jsxs("p", { className: "font-medium text-foreground", children: [info.name, isSoldOut && (_jsx("span", { className: "ml-2 text-xs font-bold text-red-500 uppercase", children: "(Esgotado)" }))] }), _jsx("p", { className: "text-sm text-muted-foreground", children: info.description })] })] }), _jsx("div", { className: "text-right", children: _jsxs("p", { className: "font-bold text-lg text-primary", children: ["R$", " ", (event.pricing?.[type] ?? event.price * info.multiplier).toFixed(2)] }) })] }) })] }, type));
                                    }) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "quantity-select", className: "block text-sm font-medium text-foreground mb-2", children: "Quantidade" }), _jsx("select", { id: "quantity-select", value: quantity, onChange: (e) => setQuantity(parseInt(e.target.value)), disabled: maxQuantity === 0, className: "w-full px-4 py-3 border border-input rounded-md bg-background", children: maxQuantity > 0 ? (Array.from({ length: Math.min(maxQuantity, 5) }, (_, i) => i + 1).map((num) => (_jsxs("option", { value: num, children: [num, " ", num === 1 ? "ingresso" : "ingressos"] }, num)))) : (_jsx("option", { value: 0, children: "0 ingressos" })) })] }), checkoutError && (_jsx("p", { className: "text-red-500 text-sm", children: checkoutError })), !user && (_jsx("p", { className: "text-sm text-muted-foreground", children: "Fa\u00E7a login para continuar com a compra." }))] }), _jsxs("div", { className: "p-6 mt-auto border-t border-border bg-muted/50 rounded-b-2xl", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2 mb-4", children: [_jsx(Button, { variant: paymentMethod === "checkout" ? "default" : "outline", onClick: () => setPaymentMethod("checkout"), children: "Cart\u00E3o" }), _jsx(Button, { variant: paymentMethod === "pix" ? "default" : "outline", onClick: () => setPaymentMethod("pix"), children: "Pix" })] }), paymentMethod === "checkout" && preferenceId && hasPublicKey ? (_jsx(Wallet, { initialization: { preferenceId: preferenceId }, onSubmit: async () => { } })) : paymentMethod === "pix" && pixData?.qrCode ? (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex justify-center", children: pixData.qrCodeBase64 ? (_jsx("img", { src: `data:image/jpeg;base64,${pixData.qrCodeBase64}`, alt: "QR Code Pix", className: "w-44 h-44" })) : (_jsx(QRCodeDisplay, { qrCode: pixData.qrCode, size: 170 })) }), _jsx("div", { className: "text-xs text-muted-foreground font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all", children: pixData.qrCode }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => navigator.clipboard.writeText(pixData.qrCode), children: "Copiar Pix" }), pixData.ticketUrl ? (_jsx(Button, { variant: "outline", asChild: true, children: _jsx("a", { href: pixData.ticketUrl, target: "_blank", rel: "noreferrer", children: "Abrir link" }) })) : (_jsx(Button, { variant: "outline", disabled: true, children: "Link indispon\u00EDvel" }))] })] })) : (_jsxs(_Fragment, { children: [!hasPublicKey && paymentMethod === "checkout" && (_jsx("p", { className: "text-sm text-muted-foreground", children: "Configure a chave p\u00FAblica do Mercado Pago para continuar." })), _jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("span", { className: "text-lg font-medium text-foreground", children: "Total:" }), _jsxs("span", { className: "text-3xl font-bold text-primary", children: ["R$ ", totalPrice.toFixed(2)] })] }), _jsx(Button, { onClick: paymentMethod === "pix" ? handlePixPurchase : handlePurchase, disabled: checkoutLoading ||
                                        maxQuantity < quantity ||
                                        (paymentMethod === "checkout" && !hasPublicKey) ||
                                        !user, className: "w-full h-12 text-lg", children: checkoutLoading
                                        ? "Processando..."
                                        : paymentMethod === "pix"
                                            ? "Gerar Pix"
                                            : "Ir para Pagamento" })] }))] })] }) }));
}
