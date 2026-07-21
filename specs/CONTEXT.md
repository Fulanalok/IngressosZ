# specs/ - Especificacoes Tecnicas IngressosZ

Atualizado em 2026-05-26. Base Git: `1baef6c feat: harden production security and compliance`.

Este arquivo descreve comportamento esperado. Ele deve acompanhar
`architecture/CONTEXT.md`, `functions/API.md` e
`planning/CHECKLIST_FINALIZACAO.md`.

## Autenticacao e Autorizacao

- Provider: Firebase Auth com email/senha.
- Perfil adicional: documento em `users/{uid}`.
- Roles: `user`, `validator`, `organizer`, `admin`.
- Admin real deve ter custom claims compativeis, incluindo `admin: true` e
  `role: "admin"`.
- Rotas autenticadas usam `RequireAuth`.
- Rotas por permissao usam `RequireRole`.
- Admin/organizer acessam painel administrativo.
- Validator/organizer/admin acessam validacao de ingressos.

## Eventos

Evento contem dados publicos de exibicao e controle de estoque.

Campos principais:

```typescript
{
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  price: number;
  maxTickets: number;
  availableTickets: number;
  maxPerPurchase?: number;
  inventory?: Record<string, number>;
  pricing?: Record<string, number>;
  image?: string;
  category: string;
  organizerId: string;
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Pagamentos Mercado Pago

### Fluxo Checkout

1. Usuario escolhe evento, tipo de ingresso e quantidade.
2. Frontend chama `createPaymentSession` com `paymentMethod: "checkout"`.
3. Frontend chama `createPaymentPreference` somente com o ID da sessao.
4. Mercado Pago processa Checkout Pro.
5. `receiveWebhook` confirma pagamento aprovado contra a `paymentSession`.
6. Backend conclui sessao, compra, estoque, tickets e trava idempotente em uma
   transacao.

### Fluxo Pix

1. Usuario escolhe evento, tipo de ingresso e quantidade.
2. Frontend chama `createPaymentSession` com `paymentMethod: "pix"`.
3. Frontend chama `createPixPayment` somente com o ID da sessao.
4. Frontend exibe QR Code Pix retornado pelo Mercado Pago.
5. `receiveWebhook` confirma pagamento aprovado.
6. Backend atualiza sessao/compra, decrementa estoque e emite tickets.
7. `expireStalePixSessions` expira sessoes Pix pendentes antigas.

### Seguranca

- Webhook valida `x-signature` e `x-request-id` com `MP_WEBHOOK_SECRET`.
- Backend consulta a API do Mercado Pago antes de confiar no pagamento.
- A sessao e a unica fonte de evento, usuario, tipo, quantidade e valores.
- Metadata atual ou legado apenas localiza `paymentSessionId`.
- `paymentWebhookEvents/{paymentId}` impede compra, estoque e ticket duplicados.
- A colecao contem somente resultados terminais. `ignored_not_approved` nao e
  persistido e estados nao aprovados podem chegar posteriormente como approved.
- Compras legadas pelo mesmo `paymentId` sao reconciliadas antes do fluxo novo;
  conflitos geram outcome terminal sem sobrescrever os registros existentes.
- Nao existe estado intermediario `processing` no fulfillment.
- Oversell e incompatibilidades geram `refund_required_*`, sem executar reembolso.

## `paymentSessions`

Campos esperados:

```typescript
{
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  ticketType: "standard" | "vip" | "premium";
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: "pending" | "approved" | "failed" | "cancelled" | "expired";
  provider: "mercadopago";
  paymentMethod: "checkout" | "pix";
  expiresAt: Timestamp;
  providerState: "ready" | "creating" | "created" | "failed";
  providerAttemptId?: string;
  providerStartedAt?: Timestamp;
  providerCreatedAt?: Timestamp;
  preferenceId?: string;
  paymentId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  expiredAt?: Timestamp;
}
```

Regras:

- Somente `createPaymentSession` cria sessoes, usando UID e e-mail do token.
- Cliente nao cria, atualiza nem deleta sessoes diretamente.
- `paymentMethod` deve ser `checkout` ou `pix`.
- `status` representa o ciclo do pagamento e permanece separado de
  `providerState`, que representa a tentativa no provedor.
- `providerAttemptId` protege as transicoes finais contra execucoes antigas.

## Tickets e QR Code

Campos principais:

```typescript
{
  id: string;
  eventId: string;
  userId: string;
  purchaseId?: string;
  userEmail: string;
  purchaseDate: Timestamp;
  qrCode: string;
  status: "valid" | "used" | "cancelled";
  price: number;
  ticketType: "standard" | "vip" | "premium";
  validatedAt?: Timestamp;
  validatedBy?: string;
}
```

QR Code:

- O backend emite QR Code assinado como JWT.
- O secret e `JWT_SECRET`.
- `validateTicket` valida o token, confere status e marca uso.
- QR ja usado nao deve validar novamente.

## Reembolso

- `refundPayment` e callable protegida por permissao administrativa.
- Reembolso chama Mercado Pago quando a compra e elegivel.
- Estado interno deve ser atualizado para auditoria.
- Reembolso nao deve apagar tickets/compra sem trilha historica.
- Outcomes `refund_required_*` registram trabalho financeiro pendente e nao
  significam que `refundPayment` ou a API do Mercado Pago foi executada.

## Firestore e Storage

- `events`: leitura publica; escrita por owner/organizer/admin.
- `users`: usuario gerencia dados proprios; role protegida.
- `paymentSessions`: create/update/delete negados ao cliente; criacao exclusiva
  pelo backend.
- `paymentWebhookEvents`: read/create/update/delete negados a todos os clientes.
- `purchases`: sem acesso direto do cliente.
- `tickets`: sem escrita direta do cliente.
- Storage: imagens de eventos devem passar por regras e otimizacao.

## Performance

- Eventos e dashboards podem usar listeners em tempo real quando fizer sentido.
- Tickets do usuario podem usar `getDocs` ou listener dedicado.
- TanStack Query centraliza cache e estados remotos no frontend.
- Rotas sao carregadas com `React.lazy`.
- Vite PWA gera cache de assets estaticos.

## Pendencias de Validacao

- Compra real de baixo valor via Checkout.
- Compra real de baixo valor via Pix.
- Webhook real Mercado Pago com assinatura.
- E-mail transacional real.
- Validacao QR com roles permitidas.
- Reembolso/admin em compra elegivel.
- Sentry/logs em producao.
