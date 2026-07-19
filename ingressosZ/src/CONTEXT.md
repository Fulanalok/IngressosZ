# src/ - Codigo Fonte Frontend

Atualizado em 2026-06-29.

Frontend React/Vite do IngressosZ. A aplicacao cobre descoberta de eventos,
compra por Checkout/Pix, area de ingressos, validacao presencial, painel admin
e paginas legais.

## Estrutura

```text
src/
|-- assets/
|-- components/
|-- constants/
|-- context/
|-- hooks/
|-- lib/
|-- pages/
|-- routing/
|-- services/
|-- test/
|-- types/
`-- utils/
```

## Rotas Principais

Definidas em `routing/AppRoutes.tsx`.

- `/`: home.
- `/eventos`: lista de eventos.
- `/evento/:eventId`: detalhe e compra.
- `/login`: login.
- `/cadastro`: cadastro.
- `/perfil`: perfil autenticado.
- `/meus-ingressos`: tickets do usuario autenticado.
- `/validador`: validacao com roles `validator`, `organizer` ou `admin`.
- `/admin`: painel com roles `organizer` ou `admin`.
- `/pagamento/sucesso` e `/pagamento/sucesso/:sessionId`: retorno de compra.
- `/pagamento/cancelado`: retorno cancelado.
- `/termos` e `/privacidade`: paginas legais.
- Rotas `/dev-auto`, `/debug/firebase`, `/doc` e `/teste-qr` existem apenas em
  desenvolvimento.

## Contextos Globais

- `context/auth`: AuthProvider, perfil do usuario e role normalizada.
- `context/theme`: tema light/dark.
- `firebaseConfig.ts`: inicializacao Firebase, Functions, App Check e emuladores
  quando configurados.

## Dados e Integracoes

- Firestore fica encapsulado em `services/firestore.ts`.
- Storage fica em `services/storage.ts`.
- QR helpers ficam em `services/qrCodeService.ts`.
- Logs do cliente ficam em `services/logger.ts`.
- Dados locais/dev ficam em `services/testDataService.ts`.
- Fluxo Mercado Pago no frontend fica no hook
  `hooks/payment/useMercadoPagoCheckout.ts`.

## Padroes de Codigo

- Componentes em PascalCase.
- Hooks com prefixo `use`.
- Tipos centrais em `types/index.ts`.
- Constantes compartilhadas em `constants/`.
- Rotas protegidas por `RequireAuth` e `RequireRole`.
- Evitar `any`; preferir interfaces e unions.
- Usar Tailwind v4 e componentes base de `components/ui`.
- Propagar erros para UI exibir feedback com toast/estado visual.
- Datas exibidas ao usuario devem passar por `lib/date.ts` (`formatDisplayDate`)
  para aparecer como `DD/MM/YYYY`, sem hifens.
- Visual publico atual: fundo preto absoluto, paleta preto/azul, sem
  gradientes/degrades, sem vidro-morfismo e sem animacoes de scroll. Botoes
  principais usam cantos retos.
- ESLint aplica `complexity` maxima 10; componentes, hooks e paginas
  principais foram refatorados para passar sem excecoes locais em 2026-06-29.

## Fluxo de Compra no Frontend

1. `TicketPurchase` recebe evento, tipo e quantidade.
2. `useMercadoPagoCheckout` calcula valores.
3. Hook chama `createPaymentSession` com evento, tipo, quantidade e metodo.
4. Hook envia somente o ID retornado para `createPaymentPreference` ou
   `createPixPayment`.
5. Checkout exibe Wallet Mercado Pago ou QR Code Pix.
6. Retorno vai para paginas de sucesso/cancelamento.

## Qualidade

Comandos principais:

```bash
npm --prefix ingressosZ run lint
npm --prefix ingressosZ run typecheck
npm --prefix ingressosZ run build
npm --prefix ingressosZ run test
```

`npm --prefix ingressosZ run test` roda Vitest com coverage.

Status 2026-06-29: `npm.cmd --prefix ingressosZ run qa` passou com 288 testes
passing e 18 skipped.

## Atencoes

- `VITE_USE_EMULATORS` deve ser `false` em producao.
- `VITE_APPCHECK_DEBUG_TOKEN` deve ser `false` em producao.
- `VITE_MERCADOPAGO_PUBLIC_KEY` e obrigatorio para Checkout Pro.
- Rotas dev nao devem aparecer em producao.
- `/vite.svg` foi removido; favicon usa `/pwa-192.png` e OG/Twitter/SEO default
  usam `/pwa-512.png`.
- `src/assets/react.svg` foi removido por falta de uso.
- `ingressosZ/.firebaserc` e `ingressosZ/firebase.json` foram removidos; deploy
  deve partir da raiz do repo.
- Home foi simplificada: chamada principal "Compre seus ingressos com seguranca
  aqui", copy curta, sem cards de metricas e sem bloco lateral de destaque.
- `lib/date.ts` centraliza formatacao de datas para Home, EventCard, Ticket,
  ValidationResult e PDF do ingresso.
- Manter textos e fluxos coerentes com `planning/CHECKLIST_FINALIZACAO.md`.
