# hooks/ - Custom Hooks

Hooks personalizados para lógica reutilizável, organizados por domínio.

## Estrutura

```
hooks/
├── auth/
│   ├── useAuth.ts           # Context wrapper (AuthContext)
│   └── useRequireAuth.ts    # Proteção de rotas
├── event/
│   ├── useEvents.ts         # Listar eventos (real-time)
│   └── useEventById.ts      # Buscar evento por ID
├── payment/
│   ├── useCheckout.ts       # Fluxo de compra (MP)
│   └── usePurchasePolling.ts # Polling de tickets após compra
├── seo/
│   └── useSEO.ts            # Metadados dinâmicos
├── theme/
│   └── useTheme.ts          # Context wrapper (ThemeContext)
└── validator/
    └── useTicketValidation.ts # Validação de ingressos
```

## 📁 auth/

### `useAuth.ts`

**Responsabilidade**: Expor `AuthContext` para componentes.

```typescript
import { useContext } from 'react';
import { AuthContext } from '@/context/auth/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Uso**:
```typescript
const { user, isAdmin, signIn, signOut } = useAuth();

if (!user) return <LoginPage />;
```

---

### `useRequireAuth.ts`

**Responsabilidade**: Redirecionar usuários não autenticados.

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function useRequireAuth(requireAdmin = false) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (requireAdmin && !isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, requireAdmin, navigate]);

  return { user, isAdmin };
}
```

**Uso**:
```typescript
// Rota protegida (qualquer usuário autenticado)
function MyTicketsPage() {
  useRequireAuth();
  // ...
}

// Rota admin
function AdminDashboard() {
  useRequireAuth(true);
  // ...
}
```

---

## 📁 event/

### `useEvents.ts`

**Responsabilidade**: Listar eventos em tempo real (TanStack Query + `onSnapshot`).

```typescript
import { useQuery } from '@tanstack/react-query';
import { subscribeToEvents } from '@/services/firebase/firestore';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => {
      return new Promise<Event[]>((resolve) => {
        const unsubscribe = subscribeToEvents((events) => {
          resolve(events);
        });
        return unsubscribe;
      });
    },
    staleTime: 1000 * 60 * 5, // Cache 5 minutos
  });
}
```

**Uso**:
```typescript
const { data: events, isLoading, error } = useEvents();

if (isLoading) return <EventCardSkeleton />;
if (error) return <ErrorMessage />;

return events.map(event => <EventCard key={event.id} event={event} />);
```

---

### `useEventById.ts`

**Responsabilidade**: Buscar evento por ID.

```typescript
import { useQuery } from '@tanstack/react-query';
import { getEventById } from '@/services/firebase/firestore';

export function useEventById(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventById(id),
    enabled: !!id,
  });
}
```

---

## 📁 payment/

### `useCheckout.ts`

**Responsabilidade**: Gerenciar fluxo de compra.

```typescript
import { useMutation } from '@tanstack/react-query';
import { createPreference } from '@/services/payment/mercadopago';

export function useCheckout() {
  return useMutation({
    mutationFn: ({ eventId, quantity, buyerData }) => 
      createPreference(eventId, quantity, buyerData),
    onError: (error) => {
      console.error('Checkout error:', error);
      toast.error('Erro ao iniciar compra');
    },
  });
}
```

**Uso**:
```typescript
const checkout = useCheckout();

const handleBuy = () => {
  checkout.mutate({ 
    eventId, 
    quantity: 2, 
    buyerData: { name, email, cpf } 
  });
};
```

---

### `usePurchasePolling.ts`

**Responsabilidade**: Poll de tickets após redirecionamento do MP.

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchTicketsByPurchaseId } from '@/services/firebase/firestore';

export function usePurchasePolling(purchaseId: string | null) {
  return useQuery({
    queryKey: ['purchase-tickets', purchaseId],
    queryFn: () => fetchTicketsByPurchaseId(purchaseId!),
    enabled: !!purchaseId,
    refetchInterval: 3000, // Poll a cada 3s
    refetchIntervalInBackground: false,
  });
}
```

**Uso** (página de success após MP):
```typescript
const { purchaseId } = useSearchParams();
const { data: tickets, isLoading } = usePurchasePolling(purchaseId);

if (isLoading) return <Spinner text="Processando pagamento..." />;
if (tickets.length > 0) return <TicketList tickets={tickets} />;
```

---

## 📁 seo/

### `useSEO.ts`

**Responsabilidade**: Atualizar metadados da página (title, description, OG tags).

```typescript
import { useEffect } from 'react';

export function useSEO({ 
  title, 
  description, 
  image 
}: { 
  title: string; 
  description?: string; 
  image?: string; 
}) {
  useEffect(() => {
    document.title = `${title} | IngressosZ`;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && description) {
      metaDescription.setAttribute('content', description);
    }

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && image) {
      ogImage.setAttribute('content', image);
    }
  }, [title, description, image]);
}
```

**Uso**:
```typescript
function EventDetailPage() {
  const { event } = useEventById(eventId);

  useSEO({
    title: event.title,
    description: event.description,
    image: event.imageUrl,
  });

  return <EventInfo event={event} />;
}
```

---

## 📁 theme/

### `useTheme.ts`

**Responsabilidade**: Expor `ThemeContext` (dark/light mode).

```typescript
import { useContext } from 'react';
import { ThemeContext } from '@/context/theme/ThemeContext';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

**Uso**:
```typescript
const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  {theme === 'dark' ? '🌙' : '☀️'}
</button>
```

---

## 📁 validator/

### `useTicketValidation.ts`

**Responsabilidade**: Validar ingressos (admin/validator).

```typescript
import { useMutation } from '@tanstack/react-query';
import { validateTicket } from '@/services/validation/ticket';

export function useTicketValidation() {
  return useMutation({
    mutationFn: (qrCodeData: string) => validateTicket(qrCodeData),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Ingresso válido!');
      } else {
        toast.error(data.error || 'Ingresso inválido');
      }
    },
  });
}
```

**Uso**:
```typescript
const validation = useTicketValidation();

const handleScan = (qrCodeData: string) => {
  validation.mutate(qrCodeData);
};

return (
  <>
    <QRScanner onScan={handleScan} />
    {validation.isLoading && <Spinner />}
    {validation.data && <ValidationResult data={validation.data} />}
  </>
);
```

---

## Convenções

### Naming

- **Context wrappers**: `use{ContextName}` (ex: `useAuth`, `useTheme`)
- **Data fetching**: `use{Entity}` ou `use{Entity}By{Param}` (ex: `useEvents`, `useEventById`)
- **Actions**: `use{Action}` (ex: `useCheckout`, `useTicketValidation`)

### Return Type

Sempre tipar retorno explícito:

```typescript
// ✅ Correto
export function useAuth(): AuthContextValue {
  // ...
}

// ❌ Evitar
export function useAuth() {
  // ...
}
```

### Dependencies

Sempre declarar dependências no `useEffect`:

```typescript
// ✅ Correto
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ❌ Evitar
useEffect(() => {
  fetchData(userId);
}, []); // userId deveria estar nas dependências
```

---

**Última atualização**: 2026-04-23
