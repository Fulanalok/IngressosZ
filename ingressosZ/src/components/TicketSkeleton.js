import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Skeleton } from "./ui/skeleton";
export function TicketSkeleton() {
    return (_jsxs("div", { className: "bg-card rounded-lg border shadow-md p-6 max-w-sm mx-auto space-y-6", children: [_jsx("div", { className: "flex justify-center", children: _jsx(Skeleton, { className: "h-8 w-3/4" }) }), _jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-12 w-full" }), _jsx(Skeleton, { className: "h-12 w-full" }), _jsx(Skeleton, { className: "h-12 w-full" })] }), _jsx("div", { className: "pt-6 border-t border-dashed", children: _jsx(Skeleton, { className: "h-12 w-full" }) })] }));
}
