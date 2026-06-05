import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

function PaymentSuccess() {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <div className="min-h-screen page-bg">

      <main className="page-container py-10">
        <Card className="text-center">
          <CardHeader className="items-center">
            <CardTitle className="text-foreground">Pagamento concluído</CardTitle>
            <CardDescription className="text-muted-foreground">
              Obrigado pela compra! Seus ingressos estão disponíveis em "Meus Ingressos".
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionId && (
              <p className="text-sm text-muted-foreground">Sessão: {sessionId}</p>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link to="/meus-ingressos">Ver meus ingressos</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default PaymentSuccess;
