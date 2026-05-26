# functions/ - Firebase Functions Backend

Atualizado em 2026-05-26. Base Git: `1baef6c feat: harden production security and compliance`.

Backend serverless do IngressosZ em Firebase Cloud Functions v2, Node.js 24,
TypeScript e ESM.

## Estrutura Atual

```text
functions/
|-- src/
|   |-- config/
|   |   |-- bootstrap.ts
|   |   |-- cors.ts
|   |   |-- params.ts
|   |   `-- sentry.ts
|   |-- domain/
|   |   |-- inventory.ts
|   |   `-- purchaseLimits.ts
|   |-- endpoints/
|   |   |-- checkout.ts
|   |   |-- email.ts
|   |   |-- maintenance.ts
|   |   |-- payments.ts
|   |   |-- pix.ts
|   |   |-- refunds.ts
|   |   |-- seed.ts
|   |   |-- storage.ts
|   |   |-- system.ts
|   |   |-- tickets.ts
|   |   |-- users.ts
|   |   `-- webhook.ts
|   |-- test/
|   |-- utils/
|   `-- index.ts
|-- package.json
`-- tsconfig.json
```

`src/index.ts` importa `config/bootstrap.ts` e exporta apenas os endpoints
publicos.

## Runtime e Deploy

- Runtime: Node.js 24.
- Region: `southamerica-east1`.
- Module system: ESM.
- Build output: `functions/lib/` gerado localmente e ignorado pelo Git.

Comandos:

```bash
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions run test
firebase deploy --only functions
```

## Configuracao

Secrets em `functions/src/config/params.ts`:

- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `JWT_SECRET`
- `SMTP_EMAIL`
- `SMTP_PASSWORD`
- `RECAPTCHA_V2_SECRET`

Params:

- `SENTRY_DSN`
- `SMTP_HOST`, default `smtp.gmail.com`
- `SMTP_PORT`, default `465`
- `WEB_BASE_URL`, default `https://<your-project>.web.app`

Use `defineSecret` para secrets e `defineString` para params. Nao use runtime
config legado para novos fluxos.

## Endpoints Exportados

Pagamentos:

- `createPaymentPreference`: callable de Checkout Pro.
- `createPaymentPreferencePublic`: HTTP fallback de Checkout Pro.
- `createPixPayment`: callable de Pix.
- `createPixPaymentPublic`: HTTP fallback de Pix.
- `receiveWebhook`: HTTP webhook Mercado Pago.
- `refundPayment`: callable administrativo de reembolso.

Tickets e usuarios:

- `validateTicket`: HTTP autenticado para validacao presencial.
- `setAdminRole`: callable para promover admin.
- `setUserRole`: callable para definir `validator`, `organizer` ou `admin`.

Sistema e operacao:

- `health`: healthcheck HTTP.
- `logClientError`: callable para logs do frontend.
- `verifyRecaptchaV2`: callable de verificacao reCAPTCHA.
- `seedDatabase`: callable de seed/dev.
- `optimizeImage`: trigger Storage.
- `onTicketCreated`: trigger Firestore para complemento/e-mail.
- `expireStalePixSessions`: schedule para Pix pendente expirado.

## Fluxo Checkout/Pix

1. Frontend cria `paymentSessions/{id}`.
2. Callable/HTTP valida usuario, evento, tipo de ingresso, estoque e limite por
   compra.
3. Function cria pagamento/preferencia no Mercado Pago.
4. Resultado volta ao frontend.
5. `receiveWebhook` confirma pagamento aprovado.
6. Backend atualiza `paymentSessions`, cria/atualiza `purchases`, decrementa
   estoque e emite `tickets`.

## Webhook Mercado Pago

Requisitos:

- Exige `MP_WEBHOOK_SECRET`.
- Valida HMAC dos headers Mercado Pago.
- Consulta API Mercado Pago antes de atualizar Firestore.
- Deve ser idempotente.
- Deve registrar falhas operacionais e oversell.
- Deve rejeitar webhook forjado.

## QR Code e Validacao

- Tickets emitidos usam JWT assinado com `JWT_SECRET`.
- `validateTicket` recebe `{ qrCode }` via HTTP.
- Frontend envia Firebase ID token no header `Authorization`.
- Roles permitidas: `validator`, `organizer`, `admin`.
- Ticket valido passa para status usado com `validatedAt` e `validatedBy`.

## Convencoes

- Sempre usar `getFirestore()` de `firebase-admin/firestore`.
- Sempre tipar dados de entrada e resposta quando possivel.
- Usar `HttpsError` em callables.
- Em HTTP, responder status e JSON/texto previsivel.
- Nunca commitar secrets.
- Manter handlers por dominio em `endpoints/`.
- Manter log suficiente para auditoria de pagamentos, sem expor segredo.

## Testes

Testes atuais cobrem exports, limites de compra, inventario/webhook e E2E de
webhook quando emuladores estao ativos.

```bash
npm --prefix functions run test
```

O E2E do webhook pode ficar pendente sem emuladores Firebase.
