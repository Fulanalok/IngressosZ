# architecture/ - Arquitetura do IngressosZ

Atualizado em 2026-05-25. Base Git: `341d924 Clean local tooling artifacts`.

## Visao Geral

IngressosZ e uma plataforma single-company para criacao de eventos, venda de
ingressos digitais, emissao de QR Codes e validacao presencial. A arquitetura
prioriza Firebase, baixo custo operacional, seguranca por padrao e um fluxo de
pagamento rastreavel via Mercado Pago.

## Stack Atual

- Frontend: React 19, Vite, TypeScript e Tailwind v4.
- Roteamento: React Router v7.
- Estado servidor: TanStack Query.
- Backend: Firebase Cloud Functions v2, Node.js 24 e ESM.
- Banco: Cloud Firestore.
- Storage: Firebase Storage.
- Auth: Firebase Authentication.
- Pagamentos: Mercado Pago Checkout Pro e Pix.
- Monitoramento: Sentry frontend/backend.

## Principios

### Security by Default

- Firestore Rules por collection.
- `paymentSessions` e criada pelo cliente autenticado e validada por regras.
- `paymentMethod` aceita apenas `checkout` ou `pix`.
- `purchases` e `tickets` nao aceitam escrita direta do cliente.
- Webhook Mercado Pago valida HMAC com `MP_WEBHOOK_SECRET`.
- QR Code dos ingressos usa JWT assinado com `JWT_SECRET`.
- Validacao presencial exige auth e role permitida.
- Backend usa `getFirestore()` de `firebase-admin/firestore`.

### Single-Company Simplicity

- Sem multi-tenancy.
- Roles atuais:
  - `user`: comprador.
  - `validator`: valida ingressos.
  - `organizer`: gerencia eventos e validacao.
  - `admin`: acesso administrativo amplo.
- Rotas administrativas aceitam `organizer` e `admin`.
- Rotas de validacao aceitam `validator`, `organizer` e `admin`.

## Fluxo de Pagamento

1. Usuario autenticado escolhe evento, tipo de ingresso e quantidade.
2. Frontend cria `paymentSessions/{id}` com `eventId`, `userId`,
   `userEmail`, `ticketType`, `quantity`, `unitPrice`, `totalAmount`,
   `status: "pending"`, `provider: "mercadopago"` e `paymentMethod`.
3. Frontend chama `createPaymentPreference` ou `createPixPayment`.
4. Se callable falhar e `VITE_API_URL` estiver configurado, o frontend usa as
   variantes HTTP publicas.
5. Mercado Pago confirma via `receiveWebhook`.
6. Function valida assinatura, consulta o pagamento, atualiza a sessao, cria a
   compra, decrementa estoque, emite tickets JWT e dispara e-mail.
7. Oversell, falha e reembolso ficam registrados para auditoria.

## Organizacao do Frontend

```text
ingressosZ/src/
|-- components/
|   |-- admin/
|   |-- common/
|   |-- dev/
|   |-- event/
|   |-- layout/
|   |-- qr/
|   |-- ticket/
|   |-- ui/
|   `-- validator/
|-- constants/
|-- context/
|-- hooks/
|-- lib/
|-- pages/
|-- routing/
|-- services/
|-- test/
|-- types/
`-- utils/
```

Hooks principais:

- `useAuth`
- `useTheme`
- `useEvents`
- `useTickets`
- `useMercadoPagoCheckout`
- `useTicketValidator`
- `useAnalytics`

## Organizacao das Functions

`functions/src/index.ts` e apenas o agregador de exports. Os handlers vivem em
`functions/src/endpoints/`.

```text
functions/src/
|-- config/
|   |-- bootstrap.ts
|   |-- cors.ts
|   |-- params.ts
|   `-- sentry.ts
|-- domain/
|   |-- inventory.ts
|   `-- purchaseLimits.ts
|-- endpoints/
|   |-- checkout.ts
|   |-- email.ts
|   |-- maintenance.ts
|   |-- payments.ts
|   |-- pix.ts
|   |-- refunds.ts
|   |-- seed.ts
|   |-- storage.ts
|   |-- system.ts
|   |-- tickets.ts
|   |-- users.ts
|   `-- webhook.ts
|-- test/
|-- utils/
`-- index.ts
```

Exports publicos atuais:

- `createPaymentPreference`
- `createPaymentPreferencePublic`
- `createPixPayment`
- `createPixPaymentPublic`
- `receiveWebhook`
- `refundPayment`
- `validateTicket`
- `setAdminRole`
- `setUserRole`
- `seedDatabase`
- `onTicketCreated`
- `optimizeImage`
- `expireStalePixSessions`
- `health`
- `logClientError`
- `verifyRecaptchaV2`

## Regras Firestore Relevantes

- `events`: leitura publica; escrita por owner, organizer ou admin.
- `paymentSessions`: criacao pelo usuario autenticado; leitura pelo dono ou
  por owner/admin; sem update/delete pelo cliente.
- `tickets`: leitura pelo dono ou owner/admin; escrita via Functions.
- `purchases`: sem acesso direto pelo cliente.
- `users`: usuario gerencia dados proprios, mas `role` e protegida.

## Limitacoes Conhecidas

1. O teste E2E do webhook depende de emuladores Firebase para rodar completo.
2. Validacao offline de QR Code ainda e futura; validacao atual depende do
   backend.
3. Fluxo real do Mercado Pago precisa validacao manual em producao antes de
   publico amplo.
4. O MCP `code-review-graph` estava indisponivel nesta rodada; a pasta local
   `.code-review-graph/` deve permanecer ignorada pelo Git.

## Referencias

- `README.md`
- `functions/API.md`
- `planning/CONTEXT.md`
- `planning/CHECKLIST_FINALIZACAO.md`
- `ops/CONTEXT.md`
