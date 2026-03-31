import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
function PaymentSuccess() {
    const { sessionId } = useParams();
    return (_jsx("div", { className: "min-h-screen gradient-bg", children: _jsx("main", { className: "page-container py-10", children: _jsxs(Card, { className: "text-center", children: [_jsxs(CardHeader, { className: "items-center", children: [_jsx(CardTitle, { className: "text-foreground", children: "Pagamento conclu\u00EDdo" }), _jsx(CardDescription, { className: "text-muted-foreground", children: "Obrigado pela compra! Seus ingressos est\u00E3o dispon\u00EDveis em \"Meus Ingressos\"." })] }), _jsx(CardContent, { children: sessionId && (_jsxs("p", { className: "text-sm text-muted-foreground", children: ["Sess\u00E3o: ", sessionId] })) }), _jsx(CardFooter, { className: "justify-center", children: _jsx(Button, { asChild: true, children: _jsx(Link, { to: "/meus-ingressos", children: "Ver meus ingressos" }) }) })] }) }) }));
}
export default PaymentSuccess;
