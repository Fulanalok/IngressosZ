# services/ - Serviços de Integração

Lógica de comunicação com Firebase e APIs externas.

## Estrutura

```
services/
├── firebase/
│   ├── auth.ts         # Autenticação (login, logout, signUp)
│   ├── firestore.ts    # CRUD Firestore (events, tickets, purchases)
│   └── storage.ts      # Upload/download de imagens (Storage)
├── payment/
│   ├── mercadopago.ts  # Integração Mercado Pago (createPreference)
│   └── webhook.ts      # (Backend) Processamento webhook MP
└── validation/
    └── ticket.ts       # Validação de ingressos (validateTicket)
```

## 📁 firebase/

### `auth.ts`

**Responsabilidade**: Operações de autenticação.

#### Funções principais

```typescript
// Login com email/senha
export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// Cadastro
export async function signUp(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// Logout
export async function signOut(): Promise<void> {
  await auth.signOut();
}

// Verificar se usuário é admin
export async function isAdmin(user: User): Promise<boolean> {
  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}
```

**Uso típico**:
```typescript
try {
  const user = await signIn(email, password);
  navigate('/');
} catch (error) {
  toast.error('Credenciais inválidas');
}
```

---

### `firestore.ts`

**Responsabilidade**: CRUD de coleções Firestore.

#### Eventos

```typescript
// Listar eventos (real-time)
export function subscribeToEvents(callback: (events: Event[]) => void) {
  return onSnapshot(collection(db, 'events'), (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(events);
  });
}

// Buscar evento por ID
export async function getEventById(id: string): Promise<Event | null> {
  const docRef = doc(db, 'events', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

// Criar evento (admin)
export async function createEvent(eventData: Omit<Event, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'events'), {
    ...eventData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
```

#### Ingressos

```typescript
// Buscar ingressos do usuário (static - getDocs)
export async function fetchTicketsByUserId(userId: string): Promise<Ticket[]> {
  const q = query(
    collection(db, 'tickets'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Buscar ingressos por purchaseId (polling após compra)
export async function fetchTicketsByPurchaseId(purchaseId: string): Promise<Ticket[]> {
  const q = query(
    collection(db, 'tickets'),
    where('purchaseId', '==', purchaseId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

**Otimização**: 
- `onSnapshot` apenas para eventos (muda frequentemente).
- `getDocs` para tickets (estáticos após compra).

---

### `storage.ts`

**Responsabilidade**: Upload e download de imagens (Storage).

```typescript
// Upload de imagem de evento
export async function uploadEventImage(file: File): Promise<string> {
  const storageRef = ref(storage, `events/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// Deletar imagem
export async function deleteEventImage(imageUrl: string): Promise<void> {
  const imageRef = ref(storage, imageUrl);
  await deleteObject(imageRef);
}
```

---

## 📁 payment/

### `mercadopago.ts`

**Responsabilidade**: Criar preferências de pagamento no MP.

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const createPreferenceFunction = httpsCallable(functions, 'createPreference');

export async function createPreference(
  eventId: string,
  quantity: number,
  buyerData: { name: string; email: string; cpf: string }
) {
  const result = await createPreferenceFunction({ eventId, quantity, buyerData });
  const { preferenceId, initPoint } = result.data;
  
  // Redireciona para checkout MP
  window.location.href = initPoint;
}
```

**Fluxo**:
1. Frontend chama `createPreference`
2. Backend (Function) cria preferência no MP
3. Retorna `initPoint` (URL do checkout)
4. Usuário é redirecionado para MP

---

## 📁 validation/

### `ticket.ts`

**Responsabilidade**: Validar ingressos na entrada do evento.

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const validateTicketFunction = httpsCallable(functions, 'validateTicket');

export async function validateTicket(qrCodeData: string) {
  const result = await validateTicketFunction({ qrCodeData });
  return result.data; // { success: boolean, ticket?: Ticket, error?: string }
}
```

**Segurança**:
- QR Code contém: `ticket_${ticketId}_${hash}`
- Backend valida hash com `TICKET_SECRET`
- Marca `isValidated: true` no Firestore

---

## Convenções

### Error Handling

Sempre propagar erros para o componente tratar:

```typescript
// ✅ Correto
export async function signIn(email: string, password: string) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error; // Deixa componente exibir toast
  }
}

// ❌ Evitar (engolir erro)
export async function signIn(email: string, password: string) {
  try {
    // ...
  } catch (error) {
    console.error(error);
    return null; // Componente não sabe o que aconteceu
  }
}
```

### Typing

Sempre tipar retornos e parâmetros:

```typescript
// ✅ Correto
export async function fetchTickets(userId: string): Promise<Ticket[]> { ... }

// ❌ Evitar
export async function fetchTickets(userId) { ... }
```

### Naming

- **Funções de leitura**: `fetch*`, `get*`, `subscribe*`
- **Funções de escrita**: `create*`, `update*`, `delete*`
- **Funções de ação**: `validate*`, `process*`

---

**Última atualização**: 2026-04-23
