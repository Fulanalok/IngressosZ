# Architecture - Arquitetura IngressosZ

Decisões arquiteturais, padrões de design e estrutura do sistema.

## Visão Geral

IngressosZ é uma aplicação **single-company** para venda e validação de ingressos, com arquitetura **serverless** usando Firebase.

```
┌─────────────┐
│   Cliente   │ (React 19 + Vite 7 + Tailwind v4)
│  (Browser)  │
└──────┬──────┘
       │
       ├─── Firebase Auth (autenticação)
       ├─── Firestore (banco de dados)
       ├─── Storage (imagens de eventos)
       └─── Functions v2 (backend serverless)
              │
              └─── Mercado Pago API (pagamentos)
```

## Stack Tecnológico

### Frontend
- **Framework**: React 19 + TypeScript
- **Build**: Vite 7 (fast refresh, code splitting)
- **Routing**: React Router v7
- **State**: TanStack Query v5 (server state) + Context API (global state)
- **Styling**: Tailwind CSS v4 (mobile-first, glassmorphism)
- **UI**: Componentes customizados (sem biblioteca pesada)

### Backend
- **Firebase Functions v2**: Node.js 24, ESM, TypeScript
- **Database**: Firestore (NoSQL, real-time)
- **Storage**: Firebase Storage (imagens de eventos)
- **Auth**: Firebase Authentication
- **Payments**: Mercado Pago SDK

### DevOps
- **Hosting**: Firebase Hosting (CDN global, HTTPS automático)
- **CI/CD**: Manual via Firebase CLI (deploy seletivo)
- **Monitoring**: Firebase Performance, Sentry (PII stripped)

## Princípios Arquiteturais

### 1. Low Firestore Footprint

**Objetivo**: Minimizar custos de leituras/escritas.

- **`getDocs`** para dados estáticos (Meus Ingressos)
- **`onSnapshot`** apenas onde real-time é essencial (lista de eventos, admin)
- **Indices compostos** para queries complexas

### 2. Mobile-First

- Design responsivo com breakpoints Tailwind
- Touch-friendly (botões grandes, espaçamento adequado)
- PWA para experiência "app-like"

### 3. Security by Default

- **Firestore Rules**: Restrições granulares por collection
- **Functions**: Validação de signatures (MP webhook), rate limiting
- **QR Code**: Hash assinado com secret server-side
- **Admin SDK**: Sempre `getFirestore()`, nunca `admin.firestore()`

### 4. Single-Company Simplicity

- **Sem multi-tenancy**: Todos os eventos são da mesma empresa
- **Permissões simplificadas**: Apenas `admin` e `user`
- **UI limpa**: Foco em UX, sem complexidade de marketplace

## Padrões de Design

### Frontend

#### Component Organization
```
src/components/
├── admin/       # Exclusivo para painel administrativo
├── common/      # Componentes genéricos (ErrorBoundary, SEO)
├── dev/         # Ferramentas de desenvolvimento
├── event/       # Relacionados a eventos
├── layout/      # Estrutura global (Navbar, Footer)
├── qr/          # Geração/leitura de QR Code
├── ticket/      # Exibição de ingressos
├── ui/          # Componentes base (Button, Card, Input)
└── validator/   # Validação de ingressos (entrada)
```

#### Custom Hooks
- **Data fetching**: `useEvents`, `useTickets`, `useTicketValidation`
- **Auth**: `useAuth` (Context wrapper)
- **Theme**: `useTheme` (dark/light mode)
- **Payment**: `useCheckout` (Mercado Pago)

#### State Management
- **Server state**: TanStack Query (cache, refetch, optimistic updates)
- **Global state**: Context API (Auth, Theme)
- **Local state**: `useState` (form inputs, UI toggles)

### Backend

#### Functions Organization
```
functions/src/
├── payment/
│   ├── createPreference.ts   # Criar preferência MP
│   └── receiveWebhook.ts     # Webhook MP (gera tickets)
├── ticket/
│   ├── validateTicket.ts     # Validar QR Code
│   └── fetchTicketsByPurchaseId.ts
└── admin/
    └── setAdminRole.ts        # Definir role admin
```

#### Middleware Pattern
- **CORS**: Habilitado para domínios permitidos
- **Auth**: `verifyIdToken` para rotas protegidas
- **Rate Limit**: In-memory map (IP → tentativas)
- **Error Handling**: Try-catch + logs estruturados

## Decisões Técnicas

### Por que React 19?
- **Compiler nativo**: Otimizações automáticas (sem `React.memo` manual)
- **Concurrent features**: Melhor UX em interações lentas
- **Ecosystem maduro**: Vasto suporte de bibliotecas

### Por que Firestore?
- **Real-time**: Essencial para admin dashboard e lista de eventos
- **Escalabilidade**: Serverless, paga pelo uso
- **Integração**: Nativo com Firebase Auth e Functions

### Por que Tailwind v4?
- **Velocidade**: JIT compiler, sem CSS não utilizado
- **Customização**: Paleta blue premium via `index.css`
- **Responsive**: Mobile-first por padrão

### Por que Functions v2?
- **Node.js 24**: Performance moderna
- **ESM**: Import/export nativo, sem Babel
- **Concurrency**: Melhor controle de recursos

## Limitações Conhecidas

1. **Webhook Race Condition**: Mitigado com lock de `purchaseId`, mas não 100% à prova de falhas (risco em alta concorrência).
2. **QR Code Offline**: Validação requer conexão (sem crypto client-side).
3. **PWA iOS**: Limitações do Safari (não é app nativo completo).
4. **Firestore Cost**: Real-time onSnapshot pode escalar custo com muitos usuários simultâneos.

---

**Última atualização**: 2026-04-23
