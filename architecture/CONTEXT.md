# architecture/ - Arquitetura do IngressosZ

## Visao Geral

IngressosZ e uma plataforma single-company para venda, emissao e validacao de
ingressos. A arquitetura prioriza Firebase, baixo custo operacional e fluxos
seguros de pagamento.

## Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind v4.
- **Roteamento:** React Router v7.
- **Estado servidor:** TanStack Query.
- **Backend:** Firebase Cloud Functions v2, Node.js 24, ESM.
- **Banco:** Cloud Firestore.
- **Storage:** Firebase Storage.
- **Auth:** Firebase Authentication.
- **Pagamentos:** Mercado Pago Checkout Pro e Pix.
- **Monitoramento:** Sentry frontend/backend.

## Principios

### Security by Default

- Firestore Rules por collection.
- `paymentSessions` criado pelo cliente autenticado, mas validado por regras.
- `paymentMethod` permitido apenas como `checkout` ou `pix`.
- `purchases` e `tickets` nao aceitam escrita direta do cliente.
- Webhook Mercado Pago validado por HMAC com `MP_WEBHOOK_SECRET`.
- QR Code dos ingressos e JWT assinado com `JWT_SECRET`.
- Validacao presencial exige auth e role adequada.
- Backend usa `getFirestore()` de `firebase-admin/firestore`.

### Single-Company Simplicity

- Sem multi-tenancy.
- Roles atuais:
  - `user`: comprador.
  - `validator`: valida ingressos.
  - `organizer`: gerencia eventos e validacao.
  - `admin`: acesso administrativo amplo.
- Permissoes continuam simples, mas nao se limitam mais a `admin` e `user`.

### Fluxo de Pagamento

1. Usuario autenticado escolhe evento, tipo e quantidade.
2. Frontend cria `paymentSessions/{id}` com:
   `eventId`, `userId`, `userEmail`, `ticketType`, `quantity`, `unitPrice`,
   `totalAmount`, `provider: "mercadopago"`, `status: "pending"` e
   `paymentMethod`.
3. Frontend chama callable/endpoint de Checkout ou Pix.
4. Mercado Pago confirma via `receiveWebhook`.
5. Function valida assinatura, consulta pagamento, atualiza sessao, cria compra,
   decrementa estoque e emite tickets.
6. Reembolso/oversell atualiza estado para auditoria.

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
|-- context/
|-- hooks/
|-- pages/
|-- routing/
|-- services/
`-- types/
```

Hooks principais:

- `useEvents`, `useTickets`
- `useMercadoPagoCheckout`
- `useTicketValidator`
- `useAuth`
- `useTheme`

## Organizacao das Functions

O backend usa `functions/src/index.ts` apenas como agregador de exports. Os
handlers ficam separados por dominio em `functions/src/endpoints/`:

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
|-- utils/
|   `-- rateLimit.ts
|-- test/
`-- index.ts
```

## Regras Firestore Relevantes

- `events`: leitura publica; escrita por owner/organizer/admin conforme regra.
- `paymentSessions`: criacao pelo usuario autenticado; leitura pelo dono ou
  owner/admin; sem update/delete pelo cliente.
- `tickets`: leitura pelo dono ou owner/admin; escrita via Functions.
- `purchases`: sem acesso direto do cliente.
- `users`: usuario gerencia dados proprios, role protegida.

## Limitacoes Conhecidas

1. O teste E2E do webhook depende dos emuladores Firebase para rodar completo.
2. QR Code offline ainda exige desenho futuro; validacao atual depende do
   backend.
3. Fluxo real de Mercado Pago precisa validacao manual em producao antes de
   publico amplo.
