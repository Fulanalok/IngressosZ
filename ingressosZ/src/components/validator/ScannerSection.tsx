import { lazy, Suspense } from "react";
import { normalizeUserRole, VALIDATOR_ROLES } from "@/constants/roles";
import type { UserProfile } from "../../types";

const QRScannerLazy = lazy(() => import("@/components/qr/QRScanner"));

interface ScannerSectionProps {
  userProfile: UserProfile | null;
  scannerActive: boolean;
  onScan: (code: string) => void;
  onError: () => void;
}

export function ScannerSection({
  userProfile,
  scannerActive,
  onScan,
  onError,
}: ScannerSectionProps) {
  const userRole = normalizeUserRole(userProfile?.role);
  if (!VALIDATOR_ROLES.includes(userRole) || !scannerActive) {
    return null;
  }

  return (
    <div className="mb-6">
      <Suspense
        fallback={
          <div className="bg-gray-900 text-white p-6 text-center">
            Carregando scanner...
          </div>
        }
      >
        <QRScannerLazy
          isActive={scannerActive}
          onScan={onScan}
          onError={onError}
        />
      </Suspense>
    </div>
  );
}
