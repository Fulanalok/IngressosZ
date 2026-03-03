import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";

function PaymentCanceled() {
  return (
    <div className="min-h-screen gradient-bg">

      <main className="page-container py-10">
        <Card className="text-center">
          <CardHeader className="items-center">
            <div className="text-6xl mb-2">❌</div>
            <CardTitle className="text-foreground">Pagamento cancelado</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sua sessão de pagamento foi cancelada. Você pode tentar novamente quando quiser.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center gap-3">
            <Button asChild>
              <Link to="/eventos">Voltar aos eventos</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/meus-ingressos">Meus ingressos</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default PaymentCanceled;