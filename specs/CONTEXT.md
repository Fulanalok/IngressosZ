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
2. Frontend cria `paymentSessions/{id}` com `paymentMethod: "checkout"`.
3. Frontend chama `createPaymentPreference`.
4. Mercado Pago processa Checkout Pro.
5. `receiveWebhook` confirma pagamento aprovado.
6. Backend atualiza sessao/compra, decrementa estoque e emite tickets.

### Fluxo Pix

1. Usuario escolhe evento, tipo de ingresso e quantidade.
2. Frontend cria `paymentSessions/{id}` com `paymentMethod: "pix"`.
3. Frontend chama `createPixPayment`.
4. Frontend exibe QR Code Pix retornado pelo Mercado Pago.
5. `receiveWebhook` confirma pagamento aprovado.
6. Backend atualiza sessao/compra, decrementa estoque e emite tickets.
7. `expireStalePixSessions` expira sessoes Pix pendentes antigas.

### Seguranca

- Webhook valida `x-signature` e `x-request-id` com `MP_WEBHOOK_SECRET`.
- Backend consulta a API do Mercado Pago antes de confiar no pagamento.
- Processamento deve ser idempotente para evitar ticket duplicado.
- Oversell deve gerar estado rastreavel, sem emissao indevida.

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
  paymentId?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  expiredAt?: Timestamp;
}
```

Regras:

- Cliente autenticado pode criar apenas sua propria sessao.
- `userId` deve bater com `request.auth.uid`.
- `userEmail` deve bater com o e-mail autenticado quando presente no token.
- `paymentMethod` deve ser `checkout` ou `pix`.
- Cliente nao atualiza nem deleta sessoes diretamente.

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

## Firestore e Storage

- `events`: leitura publica; escrita por owner/organizer/admin.
- `users`: usuario gerencia dados proprios; role protegida.
- `paymentSessions`: criacao controlada pelo usuario autenticado.
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
