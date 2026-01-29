# Documentação da API - IngressosZ

Esta documentação detalha as Cloud Functions disponíveis no backend do projeto.

## Visão Geral

O backend utiliza **Firebase Cloud Functions (v2)** e expõe dois tipos de endpoints:
1.  **Callable Functions**: Chamadas diretamente pelo cliente Firebase no Frontend.
2.  **HTTPS Requests**: Endpoints HTTP padrão (Webhooks).

---

## 🔐 Callable Functions

Estas funções devem ser chamadas utilizando o SDK `functions` do Firebase no cliente. Elas possuem autenticação integrada.

### 1. `setAdminRole`

Define o privilégio de administrador (`customClaim: { admin: true }`) para um usuário específico.

*   **Autenticação**: Obrigatória.
*   **Autorização**: Apenas usuários que JÁ são administradores podem chamar esta função.

#### Parâmetros (Request Data)

| Campo | Tipo     | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | Sim | O UID do usuário que receberá o privilégio de admin. |

#### Resposta (Response)

**Sucesso:**
```json
{
  "success": true,
  "message": "Usuário <UID> agora tem o papel de administrador."
}
```

**Erros Comuns (`HttpsError`):**
*   `unauthenticated`: Usuário não logado.
*   `permission-denied`: Usuário logado não é admin.
*   `invalid-argument`: `uid` não fornecido ou inválido.

---

## 🌍 HTTPS Requests (Webhooks)

Estes endpoints são acessíveis via HTTP padrão e geralmente são utilizados para integrações externas.

### 2. `mercadopagoWebhook`

Recebe notificações de pagamento (IPN/Webhooks) do Mercado Pago.

*   **Método**: `POST`
*   **URL**: `https://<region>-<project-id>.cloudfunctions.net/mercadopagoWebhook`
    *   *Dev*: `http://127.0.0.1:5001/<project-id>/<region>/mercadopagoWebhook`

#### Parâmetros (Query ou Body)

O Mercado Pago envia os dados tanto na query string quanto no corpo da requisição, dependendo do tipo de notificação.

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `topic` | `string` | O tipo de notificação (ex: `payment`). |
| `id` | `string` | O ID do recurso (ex: ID do pagamento). |

#### Comportamento

1.  Verifica se o `topic` é `payment`.
2.  Consulta a API do Mercado Pago usando o `id` recebido para validar o status real.
3.  Atualiza o documento correspondente na coleção `paymentSessions` do Firestore (usando `external_reference` como chave).
4.  Se o pagamento for `approved`, o sistema está pronto para disparar a emissão do ingresso.

#### Respostas HTTP

*   `200 OK`: Processamento bem-sucedido ou tópico ignorado (para não travar a fila do webhook).
*   `400 Bad Request`: ID não fornecido.
*   `500 Internal Server Error`: Erro ao consultar a API do Mercado Pago ou atualizar o Firestore.
