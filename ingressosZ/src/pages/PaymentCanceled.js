import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
function PaymentCanceled() {
    return (_jsx("div", { className: "min-h-screen gradient-bg", children: _jsx("main", { className: "page-container py-10", children: _jsxs(Card, { className: "text-center", children: [_jsxs(CardHeader, { className: "items-center", children: [_jsx(CardTitle, { className: "text-foreground", children: "Pagamento cancelado" }), _jsx(CardDescription, { className: "text-muted-foreground", children: "Sua sess\u00E3o de pagamento foi cancelada. Voc\u00EA pode tentar novamente quando quiser." })] }), _jsxs(CardFooter, { className: "justify-center gap-3", children: [_jsx(Button, { asChild: true, children: _jsx(Link, { to: "/eventos", children: "Voltar aos eventos" }) }), _jsx(Button, { variant: "secondary", asChild: true, children: _jsx(Link, { to: "/meus-ingressos", children: "Meus ingressos" }) })] })] }) }) }));
}
export default PaymentCanceled;
