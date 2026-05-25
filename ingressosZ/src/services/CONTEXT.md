# services/ - Servicos de Integracao

Atualizado em 2026-05-25. Base Git: `341d924 Clean local tooling artifacts`.

Services encapsulam acesso a Firebase, Storage, QR helpers, logs e dados de
desenvolvimento. Eles nao devem renderizar UI nem conhecer detalhes de rotas.

## Estrutura Atual

```text
services/
|-- firestore.ts
|-- logger.ts
|-- qrCodeService.ts
|-- storage.ts
`-- testDataService.ts
```

Cada arquivo possui testes correspondentes quando aplicavel.

## `firestore.ts`

Agrupa services por dominio.

### `eventService`

- `getEvents(pageSize, lastDoc?)`
- `getAdminEvents()`
- `getEventById(eventId)`
- `createEvent(eventData)`
- `updateEvent(eventId, eventData)`
- `deleteEvent(eventId)`
- `decrementAvailableTickets(eventId, quantity)`

Usa `events`, ordenacao por data e filtros de disponibilidade.

### `ticketService`

- `getUserTickets(userId)`
- `subscribeToUserTickets(userId, onUpdate, onError)`
- `getTicketById(ticketId)`
- `getTicketForValidation(ticketId)`
- `markTicketAsUsed(ticketId, validatorId)`
- `getAllTickets()`
- `getTicketsByEvent(eventId)`

Escrita direta em tickets pelo cliente nao e o caminho de producao para emissao;
emissao deve acontecer via Functions/webhook.

### `userService`

- `getUserProfile(userId)`
- `createUserProfile(userId, data)`
- `updateUserProfile(userId, data)`
- `onUserProfileSnapshot(userId, callback)`
- `searchUserByEmail(email)`

Role e campo protegido por Firestore Rules e Functions administrativas.

### `paymentService`

- `getAllPayments()`
- `getPaymentsByEvent(eventId)`
- `subscribeToAllPayments(onUpdate, onError)`

Le `paymentSessions` aprovadas para dashboards/analytics.

### `adminRealtimeService`

- `subscribeToAdminEvents(onUpdate, onError)`
- `subscribeToAllTickets(onUpdate, onError)`

Usado por painel administrativo para visoes em tempo real.

## `storage.ts`

Responsavel por upload/remocao de imagens no Firebase Storage. O backend tambem
possui trigger `optimizeImage` para otimizacao.

## `qrCodeService.ts`

Helpers relacionados a QR Code no frontend. QR de producao deve carregar o
token assinado emitido pelo backend; validacao real ocorre em `validateTicket`.

## `logger.ts`

Centraliza logs do frontend. Pode integrar com `logClientError`/Sentry conforme
configuracao.

## `testDataService.ts`

Dados e validacoes offline apenas para desenvolvimento/testes. Nao deve ser
tratado como fonte de verdade em producao.

## Convencoes

- Services devem propagar erro para hooks/componentes exibirem feedback.
- Retornos devem ser tipados com interfaces de `types/index.ts`.
- Nao commitar secrets nem valores reais de ambiente.
- Nao colocar regra visual em services.
- Nao atualizar `tickets`/`purchases` diretamente no cliente para fluxos de
  producao.
- Preferir nomes de service por dominio (`eventService`, `ticketService`,
  `userService`, `paymentService`).
