import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ScannerSection } from "./ScannerSection";
import type { UserProfile } from "../../types";

// Mock do QRScanner (lazy loaded) — evita interações com câmera
vi.mock("@/components/qr/QRScanner", () => ({
  default: ({ onScan, onError }: { onScan: (c: string) => void; onError: () => void }) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan("TICKET-TEST-123")}>Simular Scan</button>
      <button onClick={() => onError()}>Simular Erro</button>
    </div>
  ),
}));

function makeProfile(role: string): UserProfile {
  return {
    uid: "uid-1",
    email: "test@test.com",
    displayName: "Tester",
    role: role as UserProfile["role"],
    createdAt: null as unknown as UserProfile["createdAt"],
  };
}

describe("ScannerSection", () => {
  it("não renderiza nada quando scannerActive é false", () => {
    const { container } = render(
      <ScannerSection
        userProfile={makeProfile("validator")}
        scannerActive={false}
        onScan={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("não renderiza nada para role 'user' mesmo com scannerActive true", () => {
    const { container } = render(
      <ScannerSection
        userProfile={makeProfile("user")}
        scannerActive={true}
        onScan={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("não renderiza nada para userProfile null", () => {
    const { container } = render(
      <ScannerSection
        userProfile={null}
        scannerActive={true}
        onScan={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza QRScanner para role validator com scannerActive true", async () => {
    render(
      <ScannerSection
        userProfile={makeProfile("validator")}
        scannerActive={true}
        onScan={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(await screen.findByTestId("qr-scanner")).toBeInTheDocument();
  });

  it("renderiza QRScanner para role organizer com scannerActive true", async () => {
    render(
      <ScannerSection
        userProfile={makeProfile("organizer")}
        scannerActive={true}
        onScan={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(await screen.findByTestId("qr-scanner")).toBeInTheDocument();
  });

  it("renderiza QRScanner para role admin com scannerActive true", async () => {
    render(
      <ScannerSection
        userProfile={makeProfile("admin")}
        scannerActive={true}
        onScan={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(await screen.findByTestId("qr-scanner")).toBeInTheDocument();
  });

  it("chama onScan com o código lido pelo scanner", async () => {
    const onScan = vi.fn();
    render(
      <ScannerSection
        userProfile={makeProfile("validator")}
        scannerActive={true}
        onScan={onScan}
        onError={vi.fn()}
      />
    );
    const btn = await screen.findByRole("button", { name: "Simular Scan" });
    btn.click();
    expect(onScan).toHaveBeenCalledWith("TICKET-TEST-123");
  });

  it("chama onError quando o scanner emite erro", async () => {
    const onError = vi.fn();
    render(
      <ScannerSection
        userProfile={makeProfile("validator")}
        scannerActive={true}
        onScan={vi.fn()}
        onError={onError}
      />
    );
    const btn = await screen.findByRole("button", { name: "Simular Erro" });
    btn.click();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
