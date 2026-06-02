# API Backend - IngressosZ

O backend usa Firebase Cloud Functions v2 em Node.js 24, com TypeScript,
Firestore, Mercado Pago, Nodemailer, Sharp e Sentry.

## Organizacao do Codigo

`functions/src/index.ts` e somente o ponto de exportacao das Functions. Os
handlers vivem em `functions/src/endpoints/`:

- `payments.ts`: Checkout Pro, Pix e webhook Mercado Pago.
- `checkout.ts`: callables/endpoints HTTP de Checkout Pro.
- `pix.ts`: callables/endpoints HTTP de Pix.
- `webhook.ts`: webhook Mercado Pago, emissao de compra e tickets.
- `tickets.ts`: validacao de ingressos.
- `email.ts`: trigger de ticket e envio de e-mails.
- `refunds.ts`: reembolso administrativo.
- `users.ts`: definicao de roles/custom claims.
- `system.ts`: healthcheck, log de erro do cliente e reCAPTCHA v2.
- `storage.ts`: otimizacao de imagens.
- `seed.ts`: carga de desenvolvimento.
- `maintenance.ts`: expiracao agendada de sessoes Pix.

## Callable Functions

Funcoes chamadas pelo frontend com o SDK do Firebase.

Todas as callables sensiveis exigem Firebase App Check em producao. As
operacoes de pagamento, reembolso, roles e logs tambem aplicam rate limit por
usuario ou contexto para reduzir automacao abusiva.

### `seedDatabase`

- **Descricao:** popula eventos e dados de teste para desenvolvimento.
- **Acesso:** desabilitada fora do emulador.
- **Retorno:** status da operacao e IDs criados.

### `createPaymentPreference`

- **Descricao:** cria uma preferencia de Checkout Pro no Mercado Pago.
- **Parametros:** `eventId`, `ticketType`, `quantity` e dados do usuario
  autenticado.
- **Pre-condicao:** o frontend cria uma `paymentSession` no Firestore com
  `paymentMethod: "checkout"`.
- **Retorno:** `preferenceId`/dados de checkout usados pelo Wallet do Mercado
  Pago.

### `createPixPayment`

- **Descricao:** cria pagamento Pix no Mercado Pago.
- **Parametros:** `eventId`, `ticketType`, `quantity` e dados do usuario
  autenticado.
- **Pre-condicao:** o frontend cria uma `paymentSession` com
  `paymentMethod: "pix"`.
- **Retorno:** QR Code Pix, QR Code Base64 e dados de acompanhamento.

### `refundPayment`

- **Descricao:** executa reembolso no Mercado Pago e atualiza o estado interno
  da compra.
- **Acesso:** usuarios com permissao administrativa.
- **Efeito:** registra status de reembolso para auditoria e evita alterar dados
  diretamente pelo cliente.

## HTTP Endpoints

### `receiveWebhook`

- **Metodo:** `POST`
- **URL publica:** URL gerada pelo deploy da Function `receiveWebhook`.
- **Descricao:** recebe notificacoes de pagamento do Mercado Pago.
- **Seguranca:** valida assinatura HMAC com `MP_WEBHOOK_SECRET`.
- **Fluxo:**
  1. Recebe notificacao de pagamento.
  2. Valida `x-signature` e `x-request-id`.
  3. Consulta o pagamento na API do Mercado Pago.
  4. Resolve `paymentSessionId`, usuario, evento, tipo e quantidade.
  5. Se aprovado, atualiza `paymentSessions`, cria `purchases`, desconta
     estoque, gera `tickets` com QR Code JWT e envia e-mail.
  6. Em oversell ou erro operacional, registra o estado para auditoria e evita
     duplicidade.

### `createPaymentPreferencePublic` e `createPixPaymentPublic`

- **Descricao:** variantes HTTP publicas para criacao de checkout/Pix quando o
  fluxo precisa chamar endpoint direto.
- **Seguranca:** exigem header `X-Firebase-AppCheck`, validam
  `paymentSessionId` e aplicam rate limit por IP.
- **Observacao:** devem manter o mesmo contrato de `paymentSessions` usado pelas
  callables.

### `validateTicket`

- **Metodo:** `POST`
- **Descricao:** valida QR Code apresentado na entrada do evento.
- **Seguranca:** exige `Authorization: Bearer <Firebase ID token>`,
  `X-Firebase-AppCheck`, role `validator`, `organizer` ou `admin`, e rate limit
  por usuario validador.
- **Parametros:** `qrCode`.
- **Retorno:** resultado de validacao e dados do ingresso.

## Firestore Triggers

### `onTicketCreated`

- **Gatilho:** criacao de documento em `tickets/{ticketId}`.
- **Acao:** complementa dados do ticket e envia e-mail de confirmacao quando
  aplicavel.

## Regras Relacionadas

- `paymentSessions` aceita criacao pelo usuario autenticado quando:
  - `userId` corresponde a `request.auth.uid`;
  - `userEmail` corresponde ao email autenticado quando presente no token;
  - `status` e `provider` sao `pending` e `mercadopago`;
  - `paymentMethod` e opcional, mas quando presente deve ser `checkout` ou
    `pix`.
- `purchases` e `tickets` continuam protegidos contra escrita direta do cliente;
  a emissao acontece via Functions.

## Testes

```bash
npm run lint
npm run build
npm run test
```

O teste E2E do webhook simula assinatura HMAC e fica pendente quando os
emuladores Firebase nao estao rodando.

## Deploy

```bash
npx firebase-tools deploy --only functions --project <your-firebase-project-id> --config ../firebase.json
```
