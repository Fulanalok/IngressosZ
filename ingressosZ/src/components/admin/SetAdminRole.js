import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
const SetAdminRole = () => {
    const [uid, setUid] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const handleSetAdmin = async () => {
        if (!uid.trim()) {
            setMessage({ type: 'error', text: 'Por favor, insira um UID.' });
            return;
        }
        setIsLoading(true);
        setMessage(null);
        try {
            const functions = getFunctions();
            const setAdminRole = httpsCallable(functions, 'setAdminRole');
            const result = await setAdminRole({ uid });
            // O tipo de 'result.data' é 'any' por padrão, então fazemos um type cast seguro.
            const data = result.data;
            if (data.success) {
                setMessage({ type: 'success', text: data.message || 'Operação concluída com sucesso!' });
                setUid(''); // Limpa o campo após o sucesso
            }
            else {
                // Se a função retornar um erro de forma estruturada, mas sem lançar uma exceção
                setMessage({ type: 'error', text: data.message || 'Ocorreu um erro desconhecido.' });
            }
        }
        catch (error) {
            console.error("Error calling setAdminRole function:", error);
            // Os erros do https.onCall vêm com uma propriedade 'message'
            setMessage({ type: 'error', text: error.message || 'Falha ao executar a operação.' });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Tornar Usu\u00E1rio Administrador" }), _jsx(CardDescription, { children: "Insira o UID do usu\u00E1rio para conceder-lhe privil\u00E9gios de administrador. Apenas administradores podem executar esta a\u00E7\u00E3o." })] }), _jsx(CardContent, { children: _jsxs("div", { className: "flex flex-col space-y-4", children: [_jsx(Input, { type: "text", value: uid, onChange: (e) => setUid(e.target.value), placeholder: "UID do Usu\u00E1rio", disabled: isLoading }), _jsx(Button, { onClick: handleSetAdmin, disabled: isLoading, children: isLoading ? 'Processando...' : 'Tornar Admin' }), message && (_jsx("div", { className: `p-2 text-center rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`, children: message.text }))] }) })] }));
};
export default SetAdminRole;
