# Documentação da API - IngressosZ (Backend)

O backend do IngressosZ é construído sobre **Firebase Cloud Functions v2**, oferecendo uma arquitetura serverless escalável e orientada a eventos.

## 🛠️ Tech Stack

- **Runtime:** Node.js 24
- **Framework:** Firebase Functions v2
- **Linguagem:** TypeScript
- **Banco de Dados:** Cloud Firestore
- **Outras Libs:**
  - `mercadopago`: SDK oficial para processamento de pagamentos.
  - `nodemailer`: Envio de e-mails transacionais (confirmação de compra).
  - `sharp`: Processamento e otimização de imagens (upload de banners de eventos).

## ⚡ Funções Disponíveis

### 1. Callable Functions (Cliente -> Backend)

Estas funções são invocadas diretamente pelo frontend usando o SDK do Firebase.

#### `seedDatabase`

- **Descrição:** Popula o banco de dados com eventos e ingressos de teste. Útil para desenvolvimento e demonstrações.
- **Acesso:** Requer autenticação.
- **Retorno:** Status da operação e IDs criados.

#### `createPaymentPreference`

- **Descrição:** Cria uma preferência de pagamento no Mercado Pago para um ingresso específico.
- **Parâmetros:** `eventId`, `ticketType`, `quantity`.
- **Retorno:** URL de checkout do Mercado Pago (`init_point`).

#### `validateTicket`

- **Descrição:** Valida um ingresso scaneado pelo app do validador.
- **Parâmetros:** `qrCode`.
- **Lógica:** Verifica se o código existe, se pertence ao evento correto e se já foi utilizado.
- **Retorno:** Status (`valid`, `used`, `invalid`) e dados do portador.

### 2. HTTPS Triggers (Webhooks)

Endpoints HTTP públicos para integrações externas.

#### `receiveWebhook`

- **Método:** `POST`
- **URL:** `/receiveWebhook`
- **Descrição:** Recebe notificações de status de pagamento do Mercado Pago.
- **Fluxo:**
  1.  Recebe notificação `payment.updated`.
  2.  Verifica status na API do Mercado Pago.
  3.  Se aprovado, gera o ingresso na coleção `tickets`.
  4.  Envia e-mail de confirmação com os dados do evento e ingressos.

### 3. Firestore Triggers (Eventos de Banco)

Funções disparadas automaticamente por mudanças no banco de dados.

#### `onTicketCreated`

- **Gatilho:** Criação de documento em `tickets/{ticketId}`.
- **Ação:** Complementa dados do ticket, atualiza contadores do evento e dispara e-mail de confirmação por compra.

## 🧪 Testes

O backend utiliza **Mocha** e **Chai** para testes, juntamente com `firebase-functions-test` para simular o ambiente Cloud.

```bash
# Rodar testes do backend
npm run test
```

## 📦 Deploy

```bash
# Deploy apenas das functions
firebase deploy --only functions
```
