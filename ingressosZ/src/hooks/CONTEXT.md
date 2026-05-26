# hooks/ - Custom Hooks

Atualizado em 2026-05-26. Base Git: `1baef6c feat: harden production security and compliance`.

Hooks concentram logica reutilizavel de auth, eventos, pagamentos, SEO, tema,
analytics e validacao.

## Estrutura Atual

```text
hooks/
|-- auth/
|   `-- useAuth.ts
|-- event/
|   |-- useEvents.ts
|   `-- useTickets.ts
|-- payment/
|   `-- useMercadoPagoCheckout.ts
|-- seo/
|   `-- useEventSEO.ts
|-- theme/
|   `-- useTheme.ts
|-- validator/
|   `-- useTicketValidator.ts
`-- useAnalytics.ts
```

## `auth/useAuth.ts`

Wrapper do AuthContext.

Uso esperado:

```typescript
const { user, userProfile, role, isAdmin, signIn, signOut } = useAuth();
```

Rotas devem usar `RequireAuth` e `RequireRole` em vez de replicar protecao
manual em cada pagina.

## `event/useEvents.ts`

Lista e busca eventos usando `eventService`.

Responsabilidades:

- carregar eventos paginados;
- buscar evento por id;
- expor estados de loading/error;
- manter o componente sem detalhes de Firestore.

## `event/useTickets.ts`

Carrega ingressos do usuario autenticado usando `ticketService`.

Responsabilidades:

- listar tickets do usuario;
- observar mudancas quando necessario;
- tratar estados vazios e erros para paginas de ingresso.

## `payment/useMercadoPagoCheckout.ts`

Hook central do fluxo Checkout/Pix no frontend.

Responsabilidades:

- receber evento, tipo de ingresso, quantidade, userId e userEmail;
- calcular `unitPrice` e `totalAmount`;
- criar `paymentSessions` no Firestore;
- marcar `paymentMethod` como `checkout` ou `pix`;
- chamar `createPaymentPreference` ou `createPixPayment`;
- usar fallback HTTP quando `VITE_API_URL` estiver configurado;
- expor `preferenceId`, `pixData`, `isLoading`, `error` e `totalAmount`.

Atencoes:

- Exige usuario autenticado e e-mail normalizado.
- App Check e enviado no fallback HTTP quando disponivel.
- `VITE_MERCADOPAGO_PUBLIC_KEY` inicializa o SDK Mercado Pago.

## `validator/useTicketValidator.ts`

Hook de validacao presencial.

Responsabilidades:

- receber codigo/QR lido;
- chamar `/functions/validateTicket` via HTTP;
- enviar Firebase ID token no header `Authorization`;
- tentar renovar token em `401`;
- aplicar timeout de 10 segundos;
- em desenvolvimento, usar fallback offline via `TestDataService`.

Estados retornados:

- `validationResult`
- `isValidating`
- `validateTicket`
- `resetValidation`

## `seo/useEventSEO.ts`

Define metadados da pagina de evento com base nos dados do evento.

## `theme/useTheme.ts`

Wrapper do ThemeContext. Use para ler/trocar tema sem acessar contexto
diretamente.

## `useAnalytics.ts`

Hook para eventos de analytics/logs do frontend. Use com cuidado para nao
registrar dados sensiveis.

## Convencoes

- Hooks nao devem renderizar UI.
- Hooks podem chamar services e outros hooks.
- Sempre declarar dependencias de `useEffect`, `useMemo` e `useCallback`.
- Tipar parametros e retorno.
- Propagar erros de forma que pagina/componente consiga exibir feedback.
- Evitar duplicar regra de permissao dentro de hooks quando a rota ja protege.
- Preferir nomes alinhados aos arquivos reais, como `useMercadoPagoCheckout`.
