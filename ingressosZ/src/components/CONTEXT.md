# components/ - Componentes React

Organização e responsabilidades de cada categoria de componentes.

## Estrutura

```
components/
├── admin/       # Painel administrativo
├── common/      # Utilitários genéricos
├── dev/         # Ferramentas de desenvolvimento
├── event/       # Relacionados a eventos
├── layout/      # Estrutura global da aplicação
├── qr/          # QR Code (geração e leitura)
├── ticket/      # Exibição de ingressos
├── ui/          # Componentes base (design system)
└── validator/   # Validação de ingressos na entrada
```

## 📁 admin/

**Responsabilidade**: Componentes exclusivos do painel administrativo.

### Componentes

- **`AdminDashboard.tsx`**: Dashboard principal com métricas em tempo real (vendas, validações).
- **`AttendeeList.tsx`**: Lista de participantes por evento (com busca/filtro).
- **`SetAdminRole.tsx`**: Formulário para promover usuários a admin (requer permissão).

**Acesso**: Protegido por `RequireAuth` + verificação de `isAdmin`.

**Firestore**: Usa `onSnapshot` para real-time updates (métricas mudam durante o evento).

---

## 📁 common/

**Responsabilidade**: Componentes genéricos reutilizáveis em qualquer parte da aplicação.

### Componentes

- **`GlobalErrorFallback.tsx`**: Error boundary global (captura erros React).
- **`SEO.tsx`**: Metadados dinâmicos (title, description, Open Graph).

**Uso típico**:
```typescript
<SEO 
  title="Evento X - IngressosZ" 
  description="Compre ingressos para o Evento X"
/>
```

---

## 📁 dev/

**Responsabilidade**: Ferramentas de desenvolvimento (visíveis apenas em `NODE_ENV=development`).

### Componentes

- **`CameraTest.tsx`**: Testar acesso à câmera (QR Scanner).
- **`DevPanel.tsx`**: Painel com atalhos para debugging (limpar cache, reset state).
- **`FirebaseDebug.tsx`**: Visualizar estado do Firebase (auth, Firestore).
- **`QRGenerator.tsx`**: Gerar QR Codes de teste.
- **`QRTestDisplay.tsx`**: Exibir QR Code de ingresso mockado.

**Acesso**: Automaticamente oculto em produção.

---

## 📁 event/

**Responsabilidade**: Tudo relacionado a exibição e interação com eventos.

### Componentes

- **`EventCard.tsx`**: Card de evento (imagem, título, data, preço).
- **`EventCardSkeleton.tsx`**: Loading state do EventCard.
- **`EventDetailSkeleton.tsx`**: Loading state da página de detalhes.
- **`EventHeader.tsx`**: Header da página de detalhes (imagem, título, local).
- **`EventInfo.tsx`**: Informações detalhadas (descrição, horário, mapa).
- **`ShareButtons.tsx`**: Botões de compartilhamento (WhatsApp, Twitter, copiar link).
- **`TicketPurchase.tsx`**: Formulário de compra (quantidade, dados pessoais, checkout MP).

**Fluxo de compra**:
1. `EventCard` → clique → navega para `/event/:id`
2. `EventInfo` + `TicketPurchase` exibidos
3. `TicketPurchase` → `createPreference` → redirect para MP
4. Após pagamento → webhook → tickets criados

---

## 📁 layout/

**Responsabilidade**: Estrutura global da aplicação (presente em todas as páginas).

### Componentes

- **`Navbar.tsx`**: Barra de navegação (logo, links, auth status, dark mode toggle).
- **`ThemeToggle.tsx`**: Botão para alternar tema (dark/light).

**Estado global**: Usa `AuthContext` e `ThemeContext`.

---

## 📁 qr/

**Responsabilidade**: Geração e leitura de QR Codes (produção).

### Componentes

- **`QRCodeDisplay.tsx`**: Exibe QR Code do ingresso (usa `qrcode.react`).
- **`QRScanner.tsx`**: Scanner de QR Code (usa `react-qr-reader`, acesso à câmera).

**Segurança**: QR Code contém hash assinado (`ticket_${ticketId}_${hash}`).

---

## 📁 ticket/

**Responsabilidade**: Exibição de ingressos comprados.

### Componentes

- **`Ticket.tsx`**: Card de ingresso (QR Code, dados do evento, nome do comprador).
- **`TicketSkeleton.tsx`**: Loading state do Ticket.

**Usado em**: Página "Meus Ingressos" (`/my-tickets`).

---

## 📁 ui/

**Responsabilidade**: Componentes base do design system (sem lógica de negócio).

### Componentes

- **`button.tsx`**: Botão reutilizável (variants: primary, secondary, ghost).
- **`card.tsx`**: Card genérico com glassmorphism.
- **`input.tsx`**: Input de formulário estilizado.
- **`skeleton.tsx`**: Loading skeleton genérico.

**Estilo**: Todos usam classes Tailwind v4 com paleta blue premium.

**Exemplo de uso**:
```typescript
<Button variant="primary" onClick={handleClick}>
  Comprar Ingresso
</Button>
```

---

## 📁 validator/

**Responsabilidade**: Fluxo de validação de ingressos (entrada do evento).

### Componentes

- **`ScannerSection.tsx`**: Área de scan (integra `QRScanner`).
- **`ValidationResult.tsx`**: Resultado da validação (sucesso/erro, dados do ingresso).
- **`ValidatorForm.tsx`**: Formulário alternativo (validação manual por ID).

**Fluxo**:
1. `QRScanner` lê QR Code
2. Chama `validateTicket` Function
3. `ValidationResult` exibe feedback (verde = válido, vermelho = inválido/já usado)

**Permissão**: Requer role `admin` ou `validator`.

---

## Convenções

### Naming

- **Componentes de página**: `EventDetailPage.tsx` (sufixo Page)
- **Componentes de UI**: `Button.tsx`, `Card.tsx` (sem sufixo)
- **Componentes de domínio**: `EventCard.tsx`, `TicketPurchase.tsx`

### Props

Sempre definir interface explícita:

```typescript
interface EventCardProps {
  event: Event;
  onClick?: () => void;
  className?: string;
}

export function EventCard({ event, onClick, className }: EventCardProps) {
  // ...
}
```

### Children

Use `React.ReactNode` para components que aceitam children:

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
```

### Conditional Rendering

Preferir ternário ou `&&` sobre `if` statements:

```typescript
// ✅ Correto
{isLoading ? <Skeleton /> : <EventCard event={event} />}
{events.length > 0 && <EventList events={events} />}

// ❌ Evitar
if (isLoading) {
  return <Skeleton />;
}
return <EventCard event={event} />;
```

---

**Última atualização**: 2026-04-23
