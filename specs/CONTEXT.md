# Specs - Especificações Técnicas IngressosZ

Especificações de funcionalidades, requisitos e comportamentos esperados.

## Autenticação

- **Provider**: Firebase Auth (Email/Password)
- **Admin Role**: Custom claim `admin: true` via Function `setAdminRole`
- **Proteção**: Routes protegidas com `AuthContext` + `RequireAuth`

## Pagamentos (Mercado Pago)

### Fluxo de Compra

1. **Frontend**: Usuário seleciona ingressos → `TicketPurchase` → `createPreference` Function
2. **Backend**: Function cria preferência MP com `maxPerPurchase` limite
3. **MP Checkout**: Redirecionamento para pagamento (cartão ou PIX)
4. **Webhook**: MP notifica `receiveWebhook` → cria tickets no Firestore
5. **Frontend**: Polling `fetchTicketsByPurchaseId` até tickets aparecerem

### Segurança

- **Signature validation**: Webhook valida `x-signature` e `x-request-id` do MP
- **Race condition**: Lock via `purchaseId` para evitar duplicação de tickets
- **Rate limiting**: 10 tentativas por minuto por IP (middleware)

## Validação de Ingressos

### QR Code Assinado

- **Formato**: `ticket_${ticketId}_${hash(SECRET + ticketId)}`
- **Validação**: Function `validateTicket` verifica hash + marca `isValidated`
- **Segurança**: Não pode ser forjado sem `TICKET_SECRET` (Functions env)

### Fluxo de Validação

1. **QRScanner**: Lê QR Code
2. **Frontend**: Chama `validateTicket` Function
3. **Backend**: Valida hash, verifica se já usado, marca como validado
4. **Response**: Dados do ingresso (nome, evento, etc) ou erro

## Firestore Schema

### Collections

#### `events`
```typescript
{
  id: string,
  title: string,
  date: Timestamp,
  location: string,
  price: number,
  maxPerPurchase: number,
  ticketsAvailable: number,
  imageUrl: string,
  description: string,
  createdAt: Timestamp
}
```

#### `tickets`
```typescript
{
  id: string,
  eventId: string,
  userId: string,
  purchaseId: string,
  name: string,
  email: string,
  cpf: string,
  isValidated: boolean,
  validatedAt?: Timestamp,
  createdAt: Timestamp
}
```

#### `purchases`
```typescript
{
  id: string,
  eventId: string,
  userId: string,
  quantity: number,
  totalAmount: number,
  status: 'pending' | 'approved' | 'rejected',
  mpPreferenceId: string,
  mpPaymentId?: string,
  createdAt: Timestamp
}
```

## Performance

### Otimizações de Firestore

- **`getDocs`**: Usado para "Meus Ingressos" (lista estática após compra)
- **`onSnapshot`**: Usado para lista de eventos (mudanças em tempo real) e Admin Dashboard
- **Indices**: Compostos para `tickets` (userId + eventId), `events` (date, createdAt)

### Frontend

- **React Compiler**: Otimização automática de re-renders
- **TanStack Query**: Cache de requisições, stale-while-revalidate
- **Code splitting**: Lazy loading de páginas com `React.lazy()`

## PWA (Progressive Web App)

- **Manifest**: `manifest.json` com ícones, cores, display mode
- **Service Worker**: Cache de assets estáticos via Vite PWA Plugin
- **Offline**: Página de fallback quando sem conexão

---

**Última atualização**: 2026-04-23
