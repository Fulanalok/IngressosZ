
import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Inicializa o Firebase Admin SDK.
admin.initializeApp();

/**
 * Cloud Function HTTPS Callable para definir um
 * Custom Claim 'admin' para um usuário.
 *
 * Esta função deve ser chamada apenas por usuários autorizados.
 * Recebe o UID do usuário alvo e define o claim 'admin: true'.
 */
export const setAdminRole = onCall(async (request) => {
  // 1. Verificação de Autenticação
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Apenas usuários autenticados podem chamar esta função."
    );
  }

  // 2. Verificação de Autorização
  const user = await admin.auth().getUser(request.auth.uid);
  const callerClaims = user.customClaims;
  if (!callerClaims || !callerClaims.admin) {
    throw new HttpsError(
      "permission-denied",
      "Você não tem permissão para conceder o papel de administrador."
    );
  }

  // 3. Validação dos Dados
  const targetUid = request.data.uid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "O UID do usuário alvo é obrigatório e deve ser uma string."
    );
  }

  // 4. Definição do Custom Claim
  try {
    await admin.auth().setCustomUserClaims(targetUid, {admin: true});
    logger.log(`Custom claim 'admin: true' set for user ${targetUid}`);

    await admin.auth().revokeRefreshTokens(targetUid);
    logger.log(`Refresh tokens revoked for user ${targetUid}.`);

    return {
      success: true,
      message: `Usuário ${targetUid} agora tem o papel de administrador.`,
    };
  } catch (error: any) {
    logger.error("Erro ao definir custom claims:", error);
    throw new HttpsError(
      "internal",
      `Ocorreu um erro ao processar a solicitação: ${error.message}`
    );
  }
});
