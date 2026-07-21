# API Backend - IngressosZ

O backend usa Firebase Cloud Functions v2 em Node.js 24, com TypeScript,
Firestore, Mercado Pago, Nodemailer, Sharp e Sentry.

## Organizacao do Codigo

`functions/src/index.ts` e somente o ponto de exportacao das Functions. Os
handlers vivem em `functions/src/endpoints/`:

- `payments.ts`: Checkout Pro, Pix e webhook Mercado Pago.
- `paymentSessions.ts`: criacao e claim confiavel de sessoes de pagamento.
- `checkout.ts`: callable de Checkout Pro.
- `pix.ts`: callable de Pix.
- `webhook.ts`: camada HTTP fina do webhook Mercado Pago.
- `domain/paymentFulfillment.ts`: validacao e orquestracao testavel do fulfillment.
- `infrastructure/paymentFulfillmentFirestore.ts`: transacao atomica Firestore.
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

### `createPaymentSession`

- **Descricao:** cria no backend uma sessao de pagamento valida por 15 minutos.
- **Parametros:** somente `eventId`, `ticketType`, `quantity` e `paymentMethod`.
- **Seguranca:** exige Auth e App Check; calcula identidade, preco, total,
  estoque e expiracao em uma transacao Firestore. Limita cada UID a 10 novas
  sessoes por minuto com um bucket proprio.
- **Retorno:** `paymentSessionId` e `expiresAt`.

### `createPaymentPreference`

- **Descricao:** cria uma preferencia de Checkout Pro no Mercado Pago.
- **Parametros:** somente `paymentSessionId`.
- **Pre-condicao:** sessao autenticada, pendente, nao expirada e com
  `paymentMethod: "checkout"`.
- **Retorno:** `preferenceId`/dados de checkout usados pelo Wallet do Mercado
  Pago.
- **Idempotencia:** chave SHA-256 deterministica derivada do metodo e do
  `paymentSessionId`, enviada por `requestOptions.idempotencyKey`.

### `createPixPayment`

- **Descricao:** cria pagamento Pix no Mercado Pago.
- **Parametros:** somente `paymentSessionId`.
- **Pre-condicao:** sessao autenticada, pendente, nao expirada e com
  `paymentMethod: "pix"`.
- **Retorno:** QR Code Pix, QR Code Base64 e dados de acompanhamento.
- **Idempotencia:** chave SHA-256 deterministica derivada do metodo e do
  `paymentSessionId`, enviada por `requestOptions.idempotencyKey`.

As duas operacoes usam um lease de 2 minutos para `providerState: creating`.
Uma tentativa recente permanece bloqueada; depois do lease, a sessao pode ser
retomada com a mesma chave de idempotencia, sem chamada externa dentro da
transacao Firestore.

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
  4. Resolve `paymentSessionId` por `external_reference`,
     `metadata.paymentSessionId` ou `metadata.payment_session_id` legado.
  5. Valida valor em centavos, BRL, provider e referencia contra a sessao.
  6. Em uma transacao, grava `paymentWebhookEvents/{paymentId}`, sessao, compra,
     estoque e tickets. Nao usa `status: processing`.
  7. Envia e-mail best-effort somente apos um novo commit aprovado.

Metadata nunca fornece usuario, evento, tipo, quantidade ou valores. Outcomes
`refund_required_oversold`, `refund_required_duplicate`,
`refund_required_invalid_session` e `refund_required_amount_mismatch` registram
necessidade de reconciliacao/reembolso, sem chamar automaticamente a API.

`paymentWebhookEvents` contem somente outcomes terminais. Para `pending`,
`rejected` ou outro estado nao aprovado, a resposta logica e
`ignored_not_approved`, sem criar evento ou alterar sessao, compra, tickets e
estoque. Uma notificacao posterior `approved` permanece processavel.

Antes de um novo fulfillment aprovado, a transacao consulta compras pelo mesmo
`paymentId`. Uma compra legada compativel repara sessao e evento idempotente;
oversell legado vira `refund_required_oversold`; multiplos resultados ou dados
conflitantes geram outcome terminal sem modificar os registros existentes.

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

- `paymentSessions` nega create/update/delete pelo cliente. Criacao e estados
  do provider sao controlados exclusivamente pelas Functions/Admin SDK.
- `purchases` e `tickets` continuam protegidos contra escrita direta do cliente;
  a emissao acontece via Functions.
- `paymentWebhookEvents` nega toda leitura e escrita do cliente.

## Scheduled Functions

### `expireStalePaymentSessions`

- Executa a cada 15 minutos e pagina sessoes `pending` com `expiresAt` vencido.
- `expiresAt` limita o inicio da operacao no provedor; nao invalida uma
  aprovacao legitima recebida depois.
- Expira `providerState` `ready`, `failed` e `creating` quando o lease venceu,
  sempre apos reler a sessao em transacao. Nunca expira `created`.
- Preserva a evidencia do provider e registra `expiredAt` e
  `expirationReason`. Nao cancela nem reembolsa no Mercado Pago.
- O webhook aceita estados expirados que comprovem tentativa no provider e
  registra `approvedAfterInitiationExpiry` quando aplicavel.

## Testes

```bash
npm run lint
npm run build
npm run test
```

`npm run test:webhook` na raiz inicia o Firestore Emulator e executa a integracao
obrigatoria. A ausencia do emulador faz o teste falhar, nunca ser pulado.
`npm run test:maintenance` valida paginacao, lease, idempotencia e concorrencia
da manutencao no mesmo emulador.

## Deploy

```bash
npx firebase-tools deploy --only functions --project <your-firebase-project-id>
```

Execute o comando a partir da raiz do repositorio, usando o `firebase.json`
oficial da raiz.
