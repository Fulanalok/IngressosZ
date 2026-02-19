import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
const QRScannerLazy = lazy(() => import("../QRScanner"));
export function ScannerSection({ userProfile, scannerActive, onScan, onError, }) {
    if (String(userProfile?.role || "user").toLowerCase() !== "validator" ||
        !scannerActive) {
        return null;
    }
    return (_jsx("div", { className: "mb-6", children: _jsx(Suspense, { fallback: _jsx("div", { className: "bg-gray-900 text-white p-6 text-center", children: "Carregando scanner..." }), children: _jsx(QRScannerLazy, { isActive: scannerActive, onScan: onScan, onError: onError }) }) }));
}
