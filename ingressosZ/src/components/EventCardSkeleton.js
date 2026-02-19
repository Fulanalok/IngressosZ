import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
export function EventCardSkeleton() {
    return (_jsxs(Card, { className: "h-full overflow-hidden flex flex-col bg-card", children: [_jsx("div", { className: "relative h-48 w-full", children: _jsx(Skeleton, { className: "h-full w-full" }) }), _jsxs(CardHeader, { className: "p-4 space-y-2", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsx(Skeleton, { className: "h-4 w-20" }), _jsx(Skeleton, { className: "h-4 w-16" })] }), _jsx(Skeleton, { className: "h-6 w-3/4" })] }), _jsxs(CardContent, { className: "p-4 pt-0 space-y-2 flex-grow", children: [_jsx(Skeleton, { className: "h-4 w-full" }), _jsx(Skeleton, { className: "h-4 w-2/3" })] }), _jsx(CardFooter, { className: "p-4 pt-0 mt-auto", children: _jsx(Skeleton, { className: "h-10 w-full" }) })] }));
}
