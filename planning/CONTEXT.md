# planning/ - Roadmap e Pendencias

Atualizado em 2026-06-02. Base Git: `31a2d6a docs: refresh release checklist and cost status`.

Este arquivo resume o roadmap. O acompanhamento operacional detalhado fica em
`planning/CHECKLIST_FINALIZACAO.md`.

## Status Tecnico Atual

- [x] Repositorio limpo de configs locais/agentes e artefatos gerados.
- [x] Functions usam `getFirestore()` e API moderna `defineSecret` /
  `defineString`.
- [x] Backend modularizado em `functions/src/endpoints/`.
- [x] Checkout cria `paymentSessions` antes de chamar Mercado Pago.
- [x] Pix cria `paymentSessions` antes de chamar Mercado Pago.
- [x] `paymentSessions.paymentMethod` identifica `checkout` ou `pix`.
- [x] Firestore Rules validam `paymentSessions`, email autenticado e
  `paymentMethod`.
- [x] Webhook valida assinatura HMAC com `MP_WEBHOOK_SECRET`.
- [x] Teste E2E do webhook simula assinatura Mercado Pago.
- [x] Reembolso/admin foi reforcado no backend.
- [x] QR Codes usam JWT assinado com `JWT_SECRET`.
- [x] Roles atuais: `user`, `validator`, `organizer`, `admin`.
- [x] Rotas protegidas usam `RequireAuth` e `RequireRole`.
- [x] Rodada local de lint, typecheck, build e testes passou antes do ultimo
  push confirmado no GitHub.
- [x] Cloud SQL/Data Connect removidos para reduzir custo.
- [x] `SMTP_EMAIL` removido do Secret Manager e migrado para param/env comum.
- [x] Functions implantadas em producao em 2026-06-01.
- [x] `WEB_BASE_URL` realinhado no dotenv local das Functions e Functions
  redeployadas em 2026-06-02.
- [x] Firestore Rules, Storage Rules e Hosting publicados em 2026-06-02.

## Alta Prioridade Antes de Publico

- [ ] Conferir ambiente Firebase de producao.
- [ ] Confirmar valores reais dos secrets das Functions.
- [ ] Configurar/confirmar `ingressosZ/.env.local`.
- [ ] Confirmar dominios do Firebase Auth, reCAPTCHA v2 e App Check.
- [x] Rodar qualidade local completa em 2026-06-01.
- [x] Executar deploy final de `functions`, `firestore:rules`, `storage` e
  `hosting`.
- [ ] Cadastrar URL real de `receiveWebhook` no Mercado Pago com evento
  `Payments`: `https://<your-webhook-url>`.
- [ ] Testar compra real controlada via Checkout/cartao.
- [ ] Testar compra real controlada via Pix.
- [ ] Validar ticket, e-mail, QR Code e reembolso/admin em producao.

## Secrets Obrigatorios

Configure via `firebase functions:secrets:set`.

| Secret | Finalidade |
| --- | --- |
| `MP_ACCESS_TOKEN` | Token de producao do Mercado Pago |
| `MP_WEBHOOK_SECRET` | Assinatura HMAC do webhook Mercado Pago |
| `JWT_SECRET` | Assinatura dos QR Codes JWT |
| `SMTP_PASSWORD` | Senha/app password do remetente |
| `RECAPTCHA_V2_SECRET` | Validacao do reCAPTCHA v2 |

## Params das Functions

Configure em `functions/.env` ou pelo prompt do Firebase deploy.

| Param | Default recomendado | Finalidade |
| --- | --- | --- |
| `SENTRY_DSN` | vazio ou DSN Sentry | Monitoramento backend |
| `WEB_BASE_URL` | `https://<your-project>.web.app` | URLs em e-mails/back URLs |
| `SMTP_EMAIL` | vazio | Remetente dos e-mails |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | `465` | Porta SMTP TLS |

## Variaveis Frontend

Referencia completa em `ingressosZ/.env.example`.

Obrigatorias para producao:

- Firebase Web App: `VITE_FIREBASE_*`
- Mercado Pago: `VITE_MERCADOPAGO_PUBLIC_KEY`
- reCAPTCHA v2: `VITE_RECAPTCHA_V2_SITE_KEY`
- App Check: `VITE_APPCHECK_RECAPTCHA_ENTERPRISE_KEY`
- Regiao Functions: `VITE_FUNCTIONS_REGION=southamerica-east1`
- `VITE_USE_EMULATORS=false`
- Sentry opcional: `VITE_SENTRY_DSN`

## Ordem Recomendada

1. Marcar itens em `planning/CHECKLIST_FINALIZACAO.md`.
2. Confirmar projeto Firebase ativo com `firebase use`.
3. Configurar/confirmar secrets:
   `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `JWT_SECRET`, `SMTP_PASSWORD`,
   `RECAPTCHA_V2_SECRET`.
4. Confirmar `functions/.env`: `WEB_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_EMAIL`, `SENTRY_DSN`.
5. Confirmar `ingressosZ/.env.local`.
6. Conferir que `WEB_BASE_URL` segue apontando para o Hosting oficial.
7. Rodar qualidade local:
   `npm --prefix ingressosZ run lint`,
   `npm --prefix ingressosZ run typecheck`,
   `npm --prefix ingressosZ run build`,
   `npm --prefix ingressosZ run test`,
   `npm --prefix functions run lint`,
   `npm --prefix functions run build`,
   `npm --prefix functions run test`.
8. Fazer deploy quando houver nova alteracao:
   `firebase deploy --only firestore:rules,storage,functions,hosting`.
9. Registrar URL de `receiveWebhook` no Mercado Pago.
10. Fazer compra controlada de baixo valor com Checkout e Pix.
11. Validar `paymentSessions`, `purchases`, `tickets`, e-mail, QR Code,
    reembolso/admin, logs e Sentry.

## Criterios de Aceite para Publicacao

- Compra aprovada gera tickets apenas uma vez.
- Estoque global e por tipo e decrementado corretamente.
- Oversell cria estado de falha/reembolso rastreavel.
- Usuario sem role nao acessa admin/validador.
- Webhook sem assinatura valida e rejeitado.
- Sentry recebe erros de frontend/backend, se habilitado.
- Regras Firestore impedem escrita direta em `tickets` e `purchases`.
- Checklist final esta marcado nos itens criticos.
