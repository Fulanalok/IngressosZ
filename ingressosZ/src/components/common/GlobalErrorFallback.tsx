import { Button } from "../ui/button";

interface FallbackProps {
  error: any;
  resetErrorBoundary: () => void;
}

export function GlobalErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Ops! Algo deu errado.
        </h2>
        <p className="text-muted-foreground mb-6">
          Não conseguimos processar sua solicitação. Tente recarregar a página.
        </p>
        <div className="bg-muted/50 p-4 rounded-md text-left mb-6 overflow-auto max-h-40">
          <code className="text-xs text-red-500 font-mono">
            {error.message}
          </code>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => window.location.reload()} variant="outline">
            Recarregar Página
          </Button>
          <Button onClick={resetErrorBoundary}>Tentar Novamente</Button>
        </div>
      </div>
    </div>
  );
}
