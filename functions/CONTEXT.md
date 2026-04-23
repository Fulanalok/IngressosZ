# functions/ - Firebase Functions (Backend)

Cloud Functions serverless para backend do IngressosZ.

## Estrutura

```
functions/
├── src/
│   ├── admin/
│   │   └── setAdminRole.ts       # Promover usuário a admin
│   ├── payment/
│   │   ├── createPreference.ts   # Criar preferência Mercado Pago
│   │   └── receiveWebhook.ts     # Processar webhook MP
│   └── ticket/
│       ├── validateTicket.ts     # Validar ingresso na entrada
│       └── fetchTicketsByPurchaseId.ts
├── lib/ (build output)
├── package.json
└── tsconfig.json
```

## Configuração

### Environment Variables

Configuradas via `firebase functions:config:set`:

```bash
firebase functions:config:set \
  mercadopago.access_token="APP_USR-..." \
  ticket.secret="STRONG_SECRET_KEY"
```

**Acesso no código**:
```typescript
import { defineString } from 'firebase-functions/params';

const MP_ACCESS_TOKEN = defineString('mercadopago.access_token');
const TICKET_SECRET = defineString('ticket.secret');
```

### Runtime

- **Node.js**: 24 (LTS)
- **Region**: `southamerica-east1` (São Paulo)
- **Memory**: 512MB (padrão, pode aumentar para funções pesadas)
- **Timeout**: 60s (padrão)

---

## 📁 admin/

### `setAdminRole.ts`

**Responsabilidade**: Promover usuário a admin (somente admin pode chamar).

```typescript
import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';

export const setAdminRole = onCall(async (request) => {
  // Verificar se caller é admin
  if (!request.auth?.token.admin) {
    throw new Error('Unauthorized: only admins can set admin role');
  }

  const { email } = request.data;

  // Buscar usuário por email
  const user = await getAuth().getUserByEmail(email);

  // Setar custom claim
  await getAuth().setCustomUserClaims(user.uid, { admin: true });

  return { success: true, uid: user.uid };
});
```

**Chamada frontend**:
```typescript
const setAdminRoleFunction = httpsCallable(functions, 'setAdminRole');
await setAdminRoleFunction({ email: 'user@example.com' });
```

---

## 📁 payment/

### `createPreference.ts`

**Responsabilidade**: Criar preferência de pagamento no Mercado Pago.

```typescript
import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { defineString } from 'firebase-functions/params';

const MP_ACCESS_TOKEN = defineString('mercadopago.access_token');

export const createPreference = onCall(async (request) => {
  const { eventId, quantity, buyerData } = request.data;
  const userId = request.auth?.uid;

  if (!userId) throw new Error('Unauthorized');

  const db = getFirestore();

  // Buscar evento
  const eventDoc = await db.collection('events').doc(eventId).get();
  const event = eventDoc.data();

  if (!event) throw new Error('Event not found');

  // Validar maxPerPurchase
  if (quantity > event.maxPerPurchase) {
    throw new Error(`Max ${event.maxPerPurchase} tickets per purchase`);
  }

  // Criar purchase doc
  const purchaseRef = await db.collection('purchases').add({
    eventId,
    userId,
    quantity,
    totalAmount: event.price * quantity,
    status: 'pending',
    createdAt: new Date(),
  });

  // Configurar Mercado Pago
  const client = new MercadoPagoConfig({ 
    accessToken: MP_ACCESS_TOKEN.value() 
  });
  const preference = new Preference(client);

  // Criar preferência
  const result = await preference.create({
    body: {
      items: [{
        title: event.title,
        quantity,
        unit_price: event.price,
      }],
      payer: {
        name: buyerData.name,
        email: buyerData.email,
        identification: {
          type: 'CPF',
          number: buyerData.cpf,
        },
      },
      external_reference: purchaseRef.id,
      back_urls: {
        success: `https://ingressosz.com/purchase-success?purchaseId=${purchaseRef.id}`,
        failure: 'https://ingressosz.com/purchase-failure',
        pending: 'https://ingressosz.com/purchase-pending',
      },
      auto_return: 'approved',
    },
  });

  // Salvar preferenceId
  await purchaseRef.update({ mpPreferenceId: result.id });

  return { 
    preferenceId: result.id, 
    initPoint: result.init_point 
  };
});
```

---

### `receiveWebhook.ts`

**Responsabilidade**: Processar webhook do Mercado Pago (gerar tickets).

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { defineString } from 'firebase-functions/params';
import * as crypto from 'crypto';

const MP_ACCESS_TOKEN = defineString('mercadopago.access_token');
const TICKET_SECRET = defineString('ticket.secret');

// Rate limiting (simples in-memory map)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const receiveWebhook = onRequest(async (req, res) => {
  // Rate limiting
  const ip = req.ip;
  const now = Date.now();
  const limit = requestCounts.get(ip);

  if (limit && limit.resetAt > now) {
    if (limit.count >= 10) {
      res.status(429).send('Too many requests');
      return;
    }
    limit.count++;
  } else {
    requestCounts.set(ip, { count: 1, resetAt: now + 60000 });
  }

  // Validar signature
  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;

  if (!xSignature || !xRequestId) {
    res.status(400).send('Missing signature headers');
    return;
  }

  // (Implementação de validação de signature do MP aqui)

  // Processar notificação
  const { type, data } = req.body;

  if (type !== 'payment') {
    res.status(200).send('Ignored');
    return;
  }

  const paymentId = data.id;
  const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN.value() });
  const payment = new Payment(client);

  const paymentData = await payment.get({ id: paymentId });

  if (paymentData.status !== 'approved') {
    res.status(200).send('Payment not approved');
    return;
  }

  const purchaseId = paymentData.external_reference;
  const db = getFirestore();

  // Lock de purchase (evitar race condition)
  const purchaseRef = db.collection('purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    res.status(404).send('Purchase not found');
    return;
  }

  const purchase = purchaseDoc.data();

  if (purchase.status === 'approved') {
    res.status(200).send('Already processed');
    return;
  }

  // Atualizar purchase
  await purchaseRef.update({ 
    status: 'approved', 
    mpPaymentId: paymentId 
  });

  // Gerar tickets
  const eventDoc = await db.collection('events').doc(purchase.eventId).get();
  const event = eventDoc.data();

  const ticketPromises = [];
  for (let i = 0; i < purchase.quantity; i++) {
    const ticketRef = db.collection('tickets').doc();
    const ticketId = ticketRef.id;

    // Hash assinado
    const hash = crypto
      .createHmac('sha256', TICKET_SECRET.value())
      .update(ticketId)
      .digest('hex')
      .substring(0, 8);

    ticketPromises.push(
      ticketRef.set({
        eventId: purchase.eventId,
        userId: purchase.userId,
        purchaseId,
        name: paymentData.payer.name,
        email: paymentData.payer.email,
        cpf: paymentData.payer.identification.number,
        qrCode: `ticket_${ticketId}_${hash}`,
        isValidated: false,
        createdAt: new Date(),
      })
    );
  }

  await Promise.all(ticketPromises);

  res.status(200).send('Tickets created');
});
```

**Webhook URL**: Configurar no dashboard do Mercado Pago:
```
https://<region>-<your-project>.cloudfunctions.net/receiveWebhook
```

---

## 📁 ticket/

### `validateTicket.ts`

**Responsabilidade**: Validar ingresso na entrada do evento.

```typescript
import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { defineString } from 'firebase-functions/params';
import * as crypto from 'crypto';

const TICKET_SECRET = defineString('ticket.secret');

export const validateTicket = onCall(async (request) => {
  const { qrCodeData } = request.data;

  // Verificar se caller é admin/validator
  if (!request.auth?.token.admin && !request.auth?.token.validator) {
    throw new Error('Unauthorized: only validators can validate tickets');
  }

  // Parse QR Code: "ticket_{ticketId}_{hash}"
  const parts = qrCodeData.split('_');
  if (parts.length !== 3 || parts[0] !== 'ticket') {
    throw new Error('Invalid QR code format');
  }

  const ticketId = parts[1];
  const providedHash = parts[2];

  // Verificar hash
  const validHash = crypto
    .createHmac('sha256', TICKET_SECRET.value())
    .update(ticketId)
    .digest('hex')
    .substring(0, 8);

  if (providedHash !== validHash) {
    throw new Error('Invalid QR code signature');
  }

  // Buscar ticket
  const db = getFirestore();
  const ticketRef = db.collection('tickets').doc(ticketId);
  const ticketDoc = await ticketRef.get();

  if (!ticketDoc.exists) {
    throw new Error('Ticket not found');
  }

  const ticket = ticketDoc.data();

  if (ticket.isValidated) {
    throw new Error('Ticket already validated');
  }

  // Marcar como validado
  await ticketRef.update({
    isValidated: true,
    validatedAt: new Date(),
    validatedBy: request.auth.uid,
  });

  return { 
    success: true, 
    ticket: {
      id: ticketId,
      name: ticket.name,
      email: ticket.email,
      eventId: ticket.eventId,
    }
  };
});
```

---

## Convenções

### Admin SDK

**SEMPRE** usar `getFirestore()` de `firebase-admin/firestore`, **NUNCA** `admin.firestore()`:

```typescript
// ✅ Correto
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore();

// ❌ Evitar
import * as admin from 'firebase-admin';
const db = admin.firestore();
```

### Error Handling

Lançar erros explícitos (frontend captura e exibe):

```typescript
if (!user) {
  throw new Error('User not found'); // Frontend exibe toast
}
```

### Logging

Use `console.log/error` (aparece no Firebase Functions logs):

```typescript
console.log('Creating preference for event:', eventId);
console.error('Webhook validation failed:', error);
```

### Secrets

Nunca commitar secrets no código. Use `firebase functions:config:set`.

---

## Deploy

```bash
# Deploy todas as functions
firebase deploy --only functions

# Deploy function específica
firebase deploy --only functions:receiveWebhook

# Ver logs em tempo real
firebase functions:log --only receiveWebhook
```

---

**Última atualização**: 2026-04-23
