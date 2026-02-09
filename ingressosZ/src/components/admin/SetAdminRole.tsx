import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { functions } from "@/firebaseConfig";
import { httpsCallable } from "firebase/functions";
import React, { useState } from "react";

const SetAdminRole: React.FC = () => {
  const [uid, setUid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSetAdmin = async () => {
    if (!uid.trim()) {
      setMessage({ type: "error", text: "Por favor, insira um UID." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (!functions) {
        throw new Error("Firebase Functions não inicializado.");
      }
      const setAdminRole = httpsCallable(functions, "setAdminRole");
      const result = await setAdminRole({ uid });

      // O tipo de 'result.data' é 'any' por padrão, então fazemos um type cast seguro.
      const data = result.data as { success?: boolean; message?: string };

      if (data.success) {
        setMessage({
          type: "success",
          text: data.message || "Operação concluída com sucesso!",
        });
        setUid(""); // Limpa o campo após o sucesso
      } else {
        // Se a função retornar um erro de forma estruturada, mas sem lançar uma exceção
        setMessage({
          type: "error",
          text: data.message || "Ocorreu um erro desconhecido.",
        });
      }
    } catch (error: any) {
      console.error("Error calling setAdminRole function:", error);
      // Os erros do https.onCall vêm com uma propriedade 'message'
      setMessage({
        type: "error",
        text: error.message || "Falha ao executar a operação.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Tornar Usuário Administrador</CardTitle>
        <CardDescription>
          Insira o UID do usuário para conceder-lhe privilégios de
          administrador. Apenas administradores podem executar esta ação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <Input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="UID do Usuário"
            disabled={isLoading}
          />
          <Button onClick={handleSetAdmin} disabled={isLoading}>
            {isLoading ? "Processando..." : "Tornar Admin"}
          </Button>
          {message && (
            <div
              className={`p-2 text-center rounded ${
                message.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SetAdminRole;
