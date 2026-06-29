# IngressosZ - Frontend

Frontend React/Vite da plataforma IngressosZ. Esta aplicacao cobre a vitrine de
eventos, checkout, area de ingressos, validacao de QR Code e telas
administrativas.

## Estado visual atual

- Base publica em fundo preto.
- Paleta principal preto/azul.
- Sem gradientes, degrade, vidro-morfismo ou animacoes de scroll.
- Botoes principais com cantos retos.
- Home simplificada com chamada direta.
- Datas exibidas como `DD/MM/YYYY` via `src/lib/date.ts`.

## Stack

- React 19.
- TypeScript.
- Vite.
- Tailwind CSS v4.
- React Router v7.
- TanStack Query v5.
- Firebase SDK.
- Mercado Pago SDK React.
- Vitest, Testing Library e Cypress.

## Estrutura

```text
src/
|-- components/       # Componentes reutilizaveis e UI
|-- context/          # Auth, tema e estados globais
|-- hooks/            # Hooks de dominio e integracao
|-- lib/              # Utilitarios compartilhados
|-- pages/            # Paginas roteadas
|-- routing/          # Rotas e guards
|-- services/         # Firebase, Storage, pagamentos e dados
|-- test/             # Setup e utilitarios de teste
|-- types/            # Tipos globais
`-- utils/            # Utilitarios diversos
```

## Scripts

| Script | Descricao |
| --- | --- |
| `npm run dev` | Inicia o Vite em desenvolvimento. |
| `npm run build` | Roda typecheck e gera build de producao. |
| `npm run lint` | Executa ESLint. |
| `npm run typecheck` | Executa TypeScript sem emitir arquivos. |
| `npm run test` | Executa Vitest com cobertura. |
| `npm run qa` | Executa lint, typecheck e testes. |
| `npm run preview` | Serve o build localmente. |

## Integracoes principais

### Pagamento

O hook `src/hooks/payment/useMercadoPagoCheckout.ts` cria uma
`paymentSession` no Firestore antes de chamar Mercado Pago. O campo
`paymentMethod` identifica `checkout` ou `pix`.

### Tickets e QR Code

Os ingressos emitidos pelo backend aparecem para o comprador na area
"Meus ingressos". O QR Code e validado via Function `validateTicket`.

### Validador

O validador envia o QR Code para o backend com `Authorization: Bearer <ID_TOKEN>`
e App Check quando aplicavel. Roles permitidas: `validator`, `organizer` e
`admin`.

### Admin

As telas administrativas permitem gerenciar eventos, roles, vendas e
reembolsos conforme permissao do usuario.

## Qualidade

```bash
npm --prefix ingressosZ run lint
npm --prefix ingressosZ run typecheck
npm --prefix ingressosZ run build
npm --prefix ingressosZ run test
```

## Documentacao relacionada

- [../docs/PROJECT.md](../docs/PROJECT.md)
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- [../docs/OPERATIONS.md](../docs/OPERATIONS.md)
- [../docs/SECURITY.md](../docs/SECURITY.md)
