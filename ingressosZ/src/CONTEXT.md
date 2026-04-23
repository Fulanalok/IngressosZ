# src/ - Código Fonte Frontend

Visão geral da estrutura do código React, organização e convenções.

## Estrutura de Diretórios

```
src/
├── assets/           # Imagens, ícones estáticos
├── components/       # Componentes React organizados por domínio
├── constants/        # Constantes globais (configs, enums)
├── context/          # Context API (Auth, Theme)
├── hooks/            # Custom hooks
├── lib/              # Configurações de bibliotecas (Firebase, MP)
├── pages/            # Componentes de página (rotas)
├── routing/          # Configuração React Router v7
├── services/         # Lógica de integração (Firebase, API)
├── test/             # Helpers e mocks para testes
├── types/            # TypeScript interfaces e types
└── utils/            # Funções utilitárias (formatters, validators)
```

## Convenções

### Nomenclatura de Arquivos

- **Componentes**: PascalCase (`EventCard.tsx`, `QRScanner.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useAuth.ts`, `useEvents.ts`)
- **Utils**: camelCase (`formatCurrency.ts`, `validateCPF.ts`)
- **Types**: PascalCase (`Event.ts`, `Ticket.ts`)

### Organização de Componentes

Cada componente segue a estrutura:

```typescript
// 1. Imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Types/Interfaces
interface EventCardProps {
  event: Event;
  onClick: () => void;
}

// 3. Component
export function EventCard({ event, onClick }: EventCardProps) {
  // 4. Hooks
  const [isHovered, setIsHovered] = useState(false);

  // 5. Handlers
  const handleClick = () => {
    onClick();
  };

  // 6. Render
  return (
    <div className="glass-card" onClick={handleClick}>
      {/* JSX */}
    </div>
  );
}
```

### Regras de Importação

1. React/Third-party primeiro
2. Absolute imports (`@/components/...`)
3. Relative imports (`./utils`)
4. Types/Interfaces por último

```typescript
// ✅ Correto
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EventCard } from '@/components/event/EventCard';
import { formatDate } from './utils';
import type { Event } from '@/types/Event';

// ❌ Incorreto (misturado)
import type { Event } from '@/types/Event';
import { useState } from 'react';
import { formatDate } from './utils';
```

## Padrões de Código

### Data Fetching

Use **TanStack Query** para qualquer data fetching:

```typescript
// ✅ Correto
const { data: events, isLoading } = useQuery({
  queryKey: ['events'],
  queryFn: fetchEvents,
});

// ❌ Evitar
const [events, setEvents] = useState([]);
useEffect(() => {
  fetchEvents().then(setEvents);
}, []);
```

### Firestore Queries

- **`getDocs`**: Dados estáticos/pouco frequentes (Meus Ingressos)
- **`onSnapshot`**: Dados em tempo real (Lista de Eventos, Admin Dashboard)

```typescript
// Static data - getDocs
const tickets = await getDocs(
  query(
    collection(db, 'tickets'),
    where('userId', '==', userId)
  )
);

// Real-time data - onSnapshot
const unsubscribe = onSnapshot(
  collection(db, 'events'),
  (snapshot) => {
    const events = snapshot.docs.map(doc => doc.data());
    setEvents(events);
  }
);
```

### Error Handling

Sempre envolva em `try-catch` e exiba feedback ao usuário:

```typescript
try {
  await createPreference(eventId, quantity);
  toast.success('Compra iniciada!');
} catch (error) {
  console.error('Error creating preference:', error);
  toast.error('Erro ao iniciar compra. Tente novamente.');
}
```

### Styling

Use apenas **Tailwind CSS v4**. Evite CSS inline ou styled-components.

```typescript
// ✅ Correto
<div className="glass-card rounded-xl p-6 hover:scale-105 transition-transform">

// ❌ Evitar
<div style={{ backgroundColor: '#1e40af', padding: '24px' }}>
```

### TypeScript

- **Sem `any`**: Use tipos explícitos sempre
- **Interfaces > Types**: Para objetos complexos
- **Enums**: Para valores fixos (status, roles)

```typescript
// ✅ Correto
interface Ticket {
  id: string;
  eventId: string;
  userId: string;
}

// ❌ Evitar
const ticket: any = { ... };
```

## Performance

### Lazy Loading

Use `React.lazy()` para páginas pesadas:

```typescript
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));

<Route path="/admin" element={
  <Suspense fallback={<LoadingSpinner />}>
    <AdminDashboard />
  </Suspense>
} />
```

### Memoization

React Compiler cuida automaticamente, mas para casos específicos:

```typescript
// Computação pesada
const sortedEvents = useMemo(
  () => events.sort((a, b) => a.date - b.date),
  [events]
);

// Callbacks passados como props
const handleClick = useCallback(() => {
  navigate(`/event/${eventId}`);
}, [eventId, navigate]);
```

## Testes

Localização: `src/components/__tests__/`, `src/test/`

Executar: `npm test` (286 testes passando)

---

**Última atualização**: 2026-04-23
