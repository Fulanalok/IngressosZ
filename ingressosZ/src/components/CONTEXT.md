# components/ - Componentes React

Atualizado em 2026-06-11. Base Git: `241f1f9 style: set site background to black`.

Componentes estao organizados por dominio. Evite misturar regra de negocio
pesada dentro de UI; use hooks e services quando a logica passar de interacao
local.

## Estrutura

```text
components/
|-- admin/
|-- common/
|-- dev/
|-- event/
|-- layout/
|-- qr/
|-- ticket/
|-- ui/
`-- validator/
```

## `admin/`

Responsabilidade: painel administrativo.

- `AdminDashboard.tsx`: metricas e visao administrativa.
- `AttendeeList.tsx`: lista de participantes/tickets e acao de reembolso.
- `SetAdminRole.tsx`: define roles via `setAdminRole` ou `setUserRole`.

Acesso esperado: `organizer` ou `admin`, protegido por rota.

## `common/`

Responsabilidade: componentes reutilizaveis globais.

- `AppErrorBoundary.tsx`: boundary da aplicacao.
- `GlobalErrorFallback.tsx`: tela/estado de erro global.
- `SEO.tsx`: metadados por pagina.

## `dev/`

Responsabilidade: ferramentas locais de desenvolvimento.

- `CameraTest.tsx`
- `DevPanel.tsx`
- `FirebaseDebug.tsx`
- `QRGenerator.tsx`
- `QRTestDisplay.tsx`

Dev routes sao carregadas apenas com `import.meta.env.DEV`.

## `event/`

Responsabilidade: descoberta, detalhe e compra de eventos.

- `EventCard.tsx`
- `EventCardSkeleton.tsx`
- `EventDetailSkeleton.tsx`
- `EventHeader.tsx`
- `EventInfo.tsx`
- `ShareButtons.tsx`
- `TicketPurchase.tsx`

`TicketPurchase` integra `useMercadoPagoCheckout`, alterna entre Checkout e Pix,
solicita `paymentSessions` ao backend e exibe Wallet/QR Pix.

Datas de eventos exibidas em `EventCard` devem usar `formatDisplayDate` para
evitar formato `YYYY-MM-DD` na UI.

## `layout/`

Responsabilidade: estrutura global.

- `Footer.tsx`: copyright e links legais.
- `Navbar.tsx`: navegacao, status de auth e links por permissao.
- `ThemeToggle.tsx`: alternancia light/dark.

## `qr/`

Responsabilidade: renderizacao e leitura de QR Codes.

- `QRCodeDisplay.tsx`: exibe QR Code do ticket.
- `QRScanner.tsx`: leitura via camera.

QR Code de producao representa token assinado emitido pelo backend; validacao
real acontece na Function `validateTicket`.

## `ticket/`

Responsabilidade: exibicao de ingresso emitido.

- `Ticket.tsx`: card de ingresso com dados e QR Code.
- `TicketSkeleton.tsx`: estado de carregamento.

Usado principalmente em "Meus ingressos".

Datas de ingresso exibidas no card devem usar `formatDisplayDate`.

## `ui/`

Responsabilidade: componentes base sem regra de negocio.

- `button.tsx`
- `card.tsx`
- `input.tsx`
- `skeleton.tsx`

Mantenha API simples, acessivel e compativel com Tailwind v4.

## `validator/`

Responsabilidade: validacao presencial.

- `ScannerSection.tsx`: area de scan.
- `ValidationResult.tsx`: feedback visual de sucesso/erro/usado.
- `ValidatorForm.tsx`: validacao manual por codigo.

Fluxo:

1. Scanner ou formulario entrega codigo.
2. `useTicketValidator` chama `/functions/validateTicket`.
3. Backend valida JWT/status/role.
4. UI mostra resultado e dados basicos do ticket.

Permissao esperada: `validator`, `organizer` ou `admin`.

Datas mostradas no resultado de validacao devem usar `formatDisplayDate`.

## Convencoes

- Props sempre tipadas com interface.
- Componentes de pagina ficam em `pages/`, nao em `components/`.
- Componentes base nao devem importar services de negocio.
- Componentes de dominio podem usar hooks do seu dominio.
- Preferir composicao a props muito grandes.
- Estados de loading/empty/error devem ser explicitos.
- Testes ficam ao lado do componente ou em `__tests__`.
- Manter o visual publico em preto e azul, com fundo preto absoluto, sem
  gradientes/degrades, sem vidro-morfismo e sem animacoes de scroll. Botoes
  principais devem continuar com cantos retos.
