# functions/ - Firebase Functions Backend

Atualizado em 2026-06-29.

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
|   |   |-- purchaseLimits.ts
|   |   `-- ticketTypes.ts
|   |-- endpoints/
|   |   |-- checkout.ts
|   |   |-- email.ts
|   |   |-- maintenance.ts
|   |   |-- payments.ts
|   |   |-- paymentSessions.ts
|   |   |-- pix.ts
|   |   |-- refunds.ts
|   |   |-- seed.ts
|   |   |-- storage.ts
|   |   |-- system.ts
|   |   |-- tickets.ts
|   |   |-- users.ts
|   |   `-- webhook.ts
|   |-- domain/paymentFulfillment.ts
|   |-- infrastructure/paymentFulfillmentFirestore.ts
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
- Ultimo deploy confirmado: 2026-06-02, com
  `functions/.env.<your-firebase-project-id>` carregado pelo Firebase CLI.
- URL publica de `receiveWebhook`:
  `https://<your-region>-<your-project>.cloudfunctions.net/receiveWebhook`.
- Qualidade local revalidada em 2026-06-29:
  - `npm.cmd --prefix functions run lint` passou.
  - `npm.cmd --prefix functions run build` passou.
  - `npm.cmd --prefix functions run test` passou com 9 passing e 1 pending.
- ESLint aplica `complexity` maxima 10. Handlers legados criticos de
  pagamento, Pix, webhook, validacao, e-mail, seed, roles e reembolso mantem
  excecoes pontuais para evitar refatoracao arriscada antes do lancamento
  controlado.

Comandos:

```bash
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions run test
npx firebase-tools deploy --only functions --project <your-firebase-project-id>
```

## Configuracao

Secrets em `functions/src/config/params.ts`:

- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `JWT_SECRET`
- `SMTP_PASSWORD`
- `RECAPTCHA_V2_SECRET`

Params:

- `SENTRY_DSN`
- `SMTP_EMAIL`
- `SMTP_HOST`, default `smtp.gmail.com`
- `SMTP_PORT`, default `465`
- `WEB_BASE_URL`, default `https://<your-firebase-project-id>.web.app`

Nota: `SMTP_EMAIL` nao deve voltar para Secret Manager. Em 2026-06-01 o secret
antigo `SMTP_EMAIL` foi removido apos o redeploy das Functions. Em 2026-06-02,
o deploy carregou `SMTP_EMAIL` e `WEB_BASE_URL` via dotenv local de projeto.

Use `defineSecret` para secrets e `defineString` para params. Nao use runtime
config legado para novos fluxos.

## Endpoints Exportados

Pagamentos:

- `createPaymentSession`: callable autenticada para criar sessao confiavel.
- `createPaymentPreference`: callable de Checkout Pro.
- `createPixPayment`: callable de Pix.
- `receiveWebhook`: HTTP webhook Mercado Pago.
- `refundPayment`: callable administrativo de reembolso.

Tickets e usuarios:

- `validateTicket`: HTTP autenticado para validacao presencial.
- `setAdminRole`: callable para promover admin.
- `setUserRole`: callable para definir `validator`, `organizer` ou `admin`.
- Alteracoes de role usam `authorization/{uid}`, roleVersion monotonica,
  operacoes idempotentes e estados fail-closed. `users.role` e apenas espelho.

Sistema e operacao:

- `health`: healthcheck HTTP.
- `logClientError`: callable para logs do frontend.
- `verifyRecaptchaV2`: callable de verificacao reCAPTCHA.
- `seedDatabase`: callable de seed/dev.
- `optimizeImage`: trigger Storage.
- `onTicketCreated`: trigger Firestore para complemento/e-mail.
- `expireStalePaymentSessions`: schedule paginado para sessoes pendentes cujo
  prazo de iniciar a operacao no provider venceu.

## Fluxo Checkout/Pix

1. Frontend chama `createPaymentSession`.
2. Function valida usuario, evento, tipo, estoque e valores e cria a sessao.
3. Frontend envia somente `paymentSessionId` para Checkout/Pix.
4. Function faz claim atomico de `providerState` e chama o Mercado Pago.
5. Resultado volta ao frontend.
6. `receiveWebhook` confirma o pagamento contra a `paymentSession`.
7. Uma transacao atomica cria `paymentWebhookEvents`, compra e tickets,
   decrementa estoque e conclui a sessao, sem estado `processing`.

## Webhook Mercado Pago

Requisitos:

- Exige `MP_WEBHOOK_SECRET`.
- Valida HMAC dos headers Mercado Pago.
- Consulta API Mercado Pago antes de atualizar Firestore.
- `paymentSessions` e a unica autoridade dos dados da compra; metadata atual e
  legado apenas localizam a sessao.
- `paymentWebhookEvents/{paymentId}` torna replays e concorrencia idempotentes.
- A colecao contem somente resultados terminais; `ignored_not_approved` e
  retornado sem persistencia, permitindo `approved` posterior.
- A mesma transacao consulta compras legadas pelo `paymentId` antes de criar um
  fulfillment e repara sessoes compativeis sem repetir efeitos.
- Deve registrar oversell, duplicidade e incompatibilidades como
  `refund_required_*`, sem afirmar ou executar reembolso automatico.
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

## Manutencao de Payment Sessions

- `domain/paymentSessionLifecycle.ts` concentra a classificacao pura de
  expiracao, lease e aprovacao tardia.
- `infrastructure/paymentSessionMaintenanceFirestore.ts` pagina a consulta e
  relê cada candidato em transacao antes da mutacao.
- `expiresAt` e somente o prazo para iniciar Checkout ou Pix. Sessoes
  `providerState: created` nao expiram, e aprovacoes tardias validas sao
  cumpridas com `approvedAfterInitiationExpiry: true` para auditoria.
- A rotina preserva evidencias do provider e nao cancela ou reembolsa recursos
  externos.

## Testes

Testes unitarios cobrem helpers e decisao do fulfillment. A integracao do webhook
e obrigatoria no Firestore Emulator e cobre atomicidade, concorrencia e outcomes.

```bash
npm --prefix functions run test
npm run test:webhook
npm run test:maintenance
npm run test:roles
```

Os scripts de integracao iniciam o emulador e falham se ele ou a suite nao
iniciar. O CI executa webhook e manutencao em etapas explicitas.
