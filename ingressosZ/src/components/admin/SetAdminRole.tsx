
import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const SetAdminRole: React.FC = () => {
  const [uid, setUid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'admin' | 'organizer' | 'validator'>('admin');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSetAdmin = async () => {
    if (!uid.trim()) {
      setMessage({ type: 'error', text: 'Por favor, insira um UID.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const functions = getFunctions();
      const fnName = role === 'admin' ? 'setAdminRole' : 'setUserRole';
      const callable = httpsCallable(functions, fnName);
      const result = await callable(role === 'admin' ? { uid } : { uid, role });

      // O tipo de 'result.data' é 'any' por padrão, então fazemos um type cast seguro.
      const data = result.data as { success?: boolean; message?: string };

      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Operação concluída com sucesso!' });
        setUid('');
      } else {
        // Se a função retornar um erro de forma estruturada, mas sem lançar uma exceção
        setMessage({ type: 'error', text: data.message || 'Ocorreu um erro desconhecido.' });
      }
    } catch (error: any) {
      console.error("Error calling setAdminRole function:", error);
      // Os erros do https.onCall vêm com uma propriedade 'message'
      setMessage({ type: 'error', text: error.message || 'Falha ao executar a operação.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Definir papel do usuário</CardTitle>
        <CardDescription>
          Insira o UID e selecione o papel. Apenas administradores podem executar esta ação.
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
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="border rounded p-2"
            disabled={isLoading}
          >
            <option value="admin">Admin</option>
            <option value="organizer">Organizer</option>
            <option value="validator">Validator</option>
          </select>
          <Button onClick={handleSetAdmin} disabled={isLoading}>
            {isLoading ? 'Processando...' : 'Aplicar papel'}
          </Button>
          {message && (
            <div className={`p-2 text-center rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SetAdminRole;
