# IngressosZ

IngressosZ e uma plataforma de ingressos digitais para eventos pequenos e
medios. O projeto cobre descoberta de eventos, checkout, Pix, webhook de
pagamento, emissao de tickets com QR Code e validacao presencial.

O objetivo atual e servir como projeto de portfolio com um fluxo realista de
produto, backend e seguranca. Para uso comercial amplo, ainda ha validacoes
operacionais e legais mapeadas na documentacao.

## Destaques

- Frontend React/Vite publicado no Firebase Hosting.
- Backend serverless com Firebase Functions v2.
- Checkout Pro e Pix via Mercado Pago.
- Webhook Mercado Pago com validacao HMAC e fulfillment idempotente.
- `paymentSessions` como fonte confiavel dos dados da compra.
- `paymentWebhookEvents/{paymentId}` como trava terminal de idempotencia.
- Tickets digitais com QR Code JWT assinado.
- Validador presencial com controle de role.
- Painel admin para eventos, roles, vendas e reembolsos.
- Firestore Rules e Storage Rules para proteger escrita sensivel.
- Documentacao separando portfolio/demo de pendencias de producao comercial.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Estado/dados | TanStack Query, Firebase SDK |
| Backend | Firebase Functions v2, Node.js 24, TypeScript |
| Banco | Cloud Firestore |
| Storage | Firebase Storage |
| Auth | Firebase Authentication |
| Pagamentos | Mercado Pago Checkout Pro e Pix |
| Observabilidade | Sentry |
| Testes | Vitest, Testing Library, Cypress, Mocha |

## Arquitetura resumida

```mermaid
flowchart LR
  A["Usuario"] --> B["React/Vite"]
  B --> C["Firebase Auth"]
  B --> D["Firestore"]
  B --> E["Functions v2"]
  E --> F["Mercado Pago"]
  F --> G["receiveWebhook"]
  G --> D
  G --> H["Tickets + QR JWT"]
  I["Validador"] --> E
```

Fluxo principal:

1. Usuario escolhe evento e quantidade.
2. Frontend solicita `paymentSessions/{id}` a uma callable autenticada.
3. Frontend envia somente o ID da sessao para Checkout ou Pix.
4. Mercado Pago confirma via webhook; metadata apenas localiza a sessao.
5. Backend valida a assinatura e o pagamento contra a `paymentSession`.
6. Uma transacao atomica registra o webhook, consolida compra, estoque e tickets.
7. QR Code e validado por usuario com role permitida.

O webhook nao usa `status: processing`: falhas anteriores ao commit podem ser
repetidas, enquanto resultados terminais ficam em `paymentWebhookEvents`. Estados
`refund_required_*` registram necessidade de compensacao; nao executam reembolso
automatico no Mercado Pago.

## Estrutura do repositorio

```text
.
|-- docs/                    # Documentacao publica para GitHub/portfolio
|-- ingressosZ/              # Frontend React/Vite
|-- functions/               # Firebase Functions
|-- architecture/            # Contexto tecnico interno
|-- ops/                     # Contexto operacional interno
|-- planning/                # Checklist e roadmap
|-- firestore.rules          # Regras Firestore
|-- storage.rules            # Regras Storage
|-- firebase.json            # Hosting, Functions e emuladores
`-- package.json             # Scripts do monorepo
```
## Documentacao

- [docs/README.md](docs/README.md) - indice da documentacao.
- [docs/PROJECT.md](docs/PROJECT.md) - visao de produto e escopo.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - arquitetura e fluxo tecnico.
- [docs/OPERATIONS.md](docs/OPERATIONS.md) - setup, qualidade e deploy.
- [docs/SECURITY.md](docs/SECURITY.md) - seguranca e pendencias.
- [docs/PUBLIC_RELEASE_SECURITY.md](docs/PUBLIC_RELEASE_SECURITY.md) -
  checklist para publicacao segura do repositorio.
- [docs/LINKEDIN.md](docs/LINKEDIN.md) - guia para apresentar o projeto.
- [functions/API.md](functions/API.md) - contratos e Functions backend.
- [planning/CHECKLIST_FINALIZACAO.md](planning/CHECKLIST_FINALIZACAO.md) -
  checklist operacional detalhado.
