import { Link } from "react-router-dom";
import CameraTest from "@/components/dev/CameraTest";
import QRGenerator from "@/components/dev/QRGenerator";
import QRTestDisplay from "@/components/dev/QRTestDisplay";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function QRTestPage() {
  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Teste de QR Codes
          </h1>
          <p className="text-xl text-muted-foreground">
            Página para testar o scanner de QR codes
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* QR Code de Teste */}
          <div>
            <QRTestDisplay
              ticketId="test-ticket-123"
              eventId="test-event-456"
            />
          </div>

          {/* Gerador Personalizado */}
          <div>
            <QRGenerator />
          </div>

          {/* Teste de Câmera */}
          <div>
            <CameraTest />
          </div>
        </div>

        <div className="mt-8">
          {/* Instruções */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Como Testar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-muted text-primary rounded-full flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Abrir Nova Aba
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Abra uma nova aba do navegador e vá para a página do
                        Validador
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-muted text-primary rounded-none flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Iniciar Scanner
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Clique no botão "Scan QR" para ativar a câmera
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-muted text-primary rounded-none flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Escanear QR
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Aponte a câmera para o QR code mostrado ao lado
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-muted text-primary rounded-full flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Verificar Resultado
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        O sistema deve detectar e validar o ingresso
                        automaticamente
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dicas Importantes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Certifique-se de que a câmera tenha permissão para acessar
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Mantenha o QR code bem enquadrado na câmera</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Ajuste a distância se o scanner não detectar</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Use boa iluminação para melhor detecção</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alternativas de Teste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <strong>Opção 1:</strong> Use outro dispositivo (tablet,
                    outro celular) para mostrar este QR code
                  </div>
                  <div>
                    <strong>Opção 2:</strong> Imprima o QR code em papel
                  </div>
                  <div>
                    <strong>Opção 3:</strong> Use o input manual no validador
                    com o código:{" "}
                    <code className="bg-muted px-1 rounded-md font-mono">
                      qr-test-ticket-123
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Link rápido para validador */}
        <div className="mt-12 text-center">
          <Button asChild>
            <Link to="/validador">Ir para o Validador</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QRTestPage;
