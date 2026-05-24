# CLAUDE.md - IngressosZ

IngressosZ e uma plataforma single-company para venda, emissao e validacao de
ingressos digitais.

## Como Navegar o Projeto

Use os arquivos de contexto por area:

| Area | Caminho |
| --- | --- |
| Visao geral | `README.md` |
| Frontend | `ingressosZ/README.md`, `ingressosZ/src/CONTEXT.md` |
| Backend/API | `functions/API.md`, `functions/CONTEXT.md` |
| Arquitetura | `architecture/CONTEXT.md` |
| Operacoes/deploy | `ops/CONTEXT.md` |
| Roadmap | `planning/CONTEXT.md` |
| Componentes | `ingressosZ/src/components/CONTEXT.md` |
| Hooks | `ingressosZ/src/hooks/CONTEXT.md` |
| Services | `ingressosZ/src/services/CONTEXT.md` |

## Estado Atual

- Checkout Mercado Pago e Pix usam `paymentSessions`.
- `paymentSessions.paymentMethod` aceita `checkout` ou `pix`.
- Firestore Rules validam usuario, email e metodo de pagamento.
- Webhook Mercado Pago valida HMAC com `MP_WEBHOOK_SECRET`.
- Tickets usam QR Code JWT assinado por `JWT_SECRET`.
- `tickets` e `purchases` nao aceitam escrita direta do cliente.
- Admin/organizer/validator/user sao as roles atuais.
- Fluxo de reembolso/admin foi reforcado no backend.

## Pendencias de Producao

- Testar compra real de baixo valor via Checkout.
- Testar compra real via Pix.
- Confirmar webhook `receiveWebhook` no dashboard Mercado Pago.
- Confirmar `MP_WEBHOOK_SECRET` no Secret Manager.
- Confirmar App Check e reCAPTCHA com os dominios reais.
- Confirmar admin real com claims `admin: true` e `role: "admin"`.
- Validar e-mail transacional.
- Validar QR Code com role `validator`, `organizer` ou `admin`.

## Padroes de Codigo

- Frontend em `ingressosZ/src`.
- Functions em `functions/src`.
- Componentes em PascalCase.
- Hooks com prefixo `use`.
- Services em camelCase.
- Tipos compartilhados em `ingressosZ/src/types`.
- Backend deve usar `getFirestore()` de `firebase-admin/firestore`.
- Evitar escrita direta em Firestore quando a operacao pertence ao backend.

## Comandos Uteis

Frontend:

```bash
npm --prefix ingressosZ run lint
npm --prefix ingressosZ run build
npm --prefix ingressosZ run test -- --run
```

Backend:

```bash
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions run test
```

Deploy:

```bash
firebase deploy --only firestore:rules,storage,functions,hosting
```

## Variaveis e Secrets

Frontend:

- `VITE_FIREBASE_*`
- `VITE_MERCADOPAGO_PUBLIC_KEY`
- `VITE_RECAPTCHA_V2_SITE_KEY`
- `VITE_APPCHECK_RECAPTCHA_ENTERPRISE_KEY`
- `VITE_FUNCTIONS_REGION`
- `VITE_SENTRY_DSN`

Functions secrets:

- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `JWT_SECRET`
- `SMTP_EMAIL`
- `SMTP_PASSWORD`
- `RECAPTCHA_V2_SECRET`

Functions params:

- `SMTP_HOST`
- `SMTP_PORT`
- `WEB_BASE_URL`
- `SENTRY_DSN`

## Fluxo de Pagamento

1. Frontend cria `paymentSessions`.
2. Frontend chama Checkout ou Pix.
3. Mercado Pago chama `receiveWebhook`.
4. Backend valida HMAC e consulta o pagamento.
5. Backend atualiza sessao, compra, estoque e tickets.
6. Frontend le tickets gerados pelo Firestore.

## MCP Tools: code-review-graph

Este projeto possui grafo de conhecimento. Antes de explorar codigo com busca
textual, tente usar as ferramentas do `code-review-graph`:

- `detect_changes`
- `get_review_context`
- `get_impact_radius`
- `get_affected_flows`
- `query_graph`
- `semantic_search_nodes`
- `get_architecture_overview`

Se o grafo nao trouxer resultado ou estourar timeout, use `rg`/leitura direta.
