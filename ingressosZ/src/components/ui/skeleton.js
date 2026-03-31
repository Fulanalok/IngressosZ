import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../lib/utils";
function Skeleton({ className, ...props }) {
    return (_jsx("div", { className: cn("animate-pulse rounded-md bg-muted/70 transition-opacity duration-300", className), ...props }));
}
export { Skeleton };
