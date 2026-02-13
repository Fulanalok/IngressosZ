/************************************************************************************************
 *  ATENÇÃO: Este é código de BACKEND e NÃO DEVE ser executado no NAVEGADOR.
 *
 *  O SDK Admin do Firebase (`firebase-admin`) requer credenciais de serviço com altos privilégios
 *  e nunca deve ser exposto no lado do cliente (frontend).
 *
 *  Este código deve ser movido para um ambiente seguro, como:
 *  - Firebase Functions (recomendado)
 *  - Um servidor Node.js que você gerencia
 *
 *  Se este código for incluído no seu aplicativo React, ele irá falhar e, pior, se você
 *  conseguir fazê-lo funcionar (por exemplo, expondo suas chaves de serviço),
 *  você estará criando uma falha de segurança GIGANTESCA em sua aplicação.
 ************************************************************************************************/

// Importe o Admin SDK. Certifique-se de inicializá-lo corretamente em seu ambiente de backend.
// Exemplo de inicialização (em um arquivo de inicialização de backend):
/*
import * as admin from 'firebase-admin';
import { serviceAccount } from './path/to/your/serviceAccountKey.json'; // NÃO adicione este arquivo ao controle de versão

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
*/

import * as admin from 'firebase-admin';

// Função para definir um usuário como administrador
async function setAdminClaim(uid: string) {
  try {
    // Esta verificação garante que o SDK Admin foi inicializado.
    if (!admin.apps.length) {
        console.error('O SDK Admin do Firebase não foi inicializado. Chame admin.initializeApp() no seu backend.');
        return;
    }
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`Custom claim 'admin: true' set for user ${uid}`);

    // Revoga os tokens de atualização para forçar o usuário a obter um novo ID token com as claims atualizadas.
    await admin.auth().revokeRefreshTokens(uid);
    console.log(`Refresh tokens revoked for user ${uid}. User will need to re-authenticate to get new claims.`);

  } catch (error) {
    console.error('Error setting custom user claims:', error);
  }
}

// Exemplo de como esta função seria chamada em um endpoint de uma Firebase Function:
/*
import { https } from 'firebase-functions';

export const makeAdmin = https.onCall(async (data, context) => {
  // Verifique se o chamador é um administrador antes de permitir a operação.
  if (context.auth?.token.admin !== true) {
    throw new https.HttpsError('permission-denied', 'Only admins can add other admins.');
  }

  const uid = data.uid;
  await setAdminClaim(uid);
  return { message: `Success! ${uid} is now an admin.` };
});
*/

// Para uso local ou em um script de admin, você pode chamar a função diretamente:
// setAdminClaim('algumUIDdeUsuario'); // Substitua pelo UID do usuário que você quer tornar admin
