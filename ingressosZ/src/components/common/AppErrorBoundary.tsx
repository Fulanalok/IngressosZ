import { Button } from "@/components/ui/button";
import { logger } from "@/services/logger";
import React from "react";
import { Link } from "react-router";

type AppErrorBoundaryProps = {
  onReset: () => void;
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    logger.error("Render Error", error, {
      type: "render-error",
      info,
    });
  }

  reset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Algo deu errado
          </h2>
          <p className="text-muted-foreground mb-6">
            Tente novamente. Se persistir, volte para a pagina inicial.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={this.reset}>Tentar novamente</Button>
            <Button variant="secondary" asChild>
              <Link to="/">Inicio</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
