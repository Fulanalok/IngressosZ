# planning/ - Roadmap e Pendencias

Estado atualizado em 2026-05-23, apos o commit remoto
`6c1b73e Fix payment session rules and admin refunds`.

## Status Tecnico Atual

- [x] Functions usam `getFirestore()` e API moderna `defineSecret` /
  `defineString`.
- [x] Checkout cria `paymentSessions` antes de chamar Mercado Pago.
- [x] `paymentSessions.paymentMethod` documenta o tipo do fluxo:
  `checkout` ou `pix`.
- [x] Firestore Rules validam `paymentSessions`, email autenticado e
  `paymentMethod`.
- [x] Webhook valida assinatura HMAC com `MP_WEBHOOK_SECRET`.
- [x] Teste E2E do webhook simula assinatura Mercado Pago.
- [x] Reembolso/admin foi reforcado no backend.
- [x] QR Codes usam JWT assinado com secret server-side.

## Alta Prioridade Antes de Publico

- [ ] **Fluxo de pagamento end-to-end em producao:** comprar com cartao e Pix,
  confirmar webhook, ticket, e-mail e validacao QR.
- [ ] **Webhook Mercado Pago:** confirmar URL real de `receiveWebhook` no painel
  Mercado Pago e eventos `Payments`.
- [ ] **App Check/reCAPTCHA:** confirmar dominios liberados nas duas chaves:
  reCAPTCHA v2 e reCAPTCHA Enterprise/App Check.
- [ ] **Usuario admin real:** confirmar claims `admin: true` e `role: "admin"`
  no Firebase Auth.
- [ ] **Deploy completo:** `hosting`, `functions`, `firestore:rules` e
  `storage`.

## Secrets Obrigatorios

Configure via `firebase functions:secrets:set`:

| Secret | Finalidade |
| --- | --- |
| `MP_ACCESS_TOKEN` | Token de producao do Mercado Pago |
| `MP_WEBHOOK_SECRET` | Assinatura HMAC do webhook Mercado Pago |
| `JWT_SECRET` | Assinatura dos QR Codes JWT |
| `SMTP_EMAIL` | Remetente dos e-mails |
| `SMTP_PASSWORD` | Senha/app password do remetente |
| `RECAPTCHA_V2_SECRET` | Validacao do reCAPTCHA v2 |

## Params das Functions

Configure em `functions/.env` ou pelo prompt do Firebase deploy:

| Param | Default recomendado | Finalidade |
| --- | --- | --- |
| `SENTRY_DSN` | vazio ou DSN Sentry | Monitoramento backend |
| `WEB_BASE_URL` | `https://ingressosz.web.app` | URLs em e-mails/back URLs |
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
- Sentry opcional: `VITE_SENTRY_DSN`

## Ordem Recomendada

1. Confirmar projeto Firebase ativo com `firebase use`.
2. Configurar/confirmar secrets:
   `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `JWT_SECRET`, `SMTP_EMAIL`,
   `SMTP_PASSWORD`, `RECAPTCHA_V2_SECRET`.
3. Confirmar `functions/.env`: `WEB_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`,
   `SENTRY_DSN`.
4. Confirmar `ingressosZ/.env.local` com chaves Firebase, Mercado Pago,
   reCAPTCHA e App Check.
5. Rodar qualidade local:
   `npm --prefix ingressosZ run lint`, `npm --prefix ingressosZ run build`,
   `npm --prefix functions run lint`, `npm --prefix functions run build`,
   `npm --prefix functions run test`.
6. Deploy:
   `firebase deploy --only firestore:rules,storage,functions,hosting`.
7. Registrar/validar URL de `receiveWebhook` no painel Mercado Pago.
8. Fazer compra controlada de baixo valor com Checkout e Pix.
9. Validar:
   `paymentSessions.status`, `purchases.status`, `tickets`, e-mail e QR Code.

## Criterios de Aceite para Publicacao

- Compra aprovada gera tickets apenas uma vez.
- Estoque global e por tipo e decrementado corretamente.
- Oversell cria estado de falha/reembolso rastreavel.
- Usuario sem role nao acessa admin/validador.
- Webhook sem assinatura valida e rejeitado.
- Sentry recebe erros de frontend/backend.
- Regras Firestore impedem escrita direta em `tickets` e `purchases`.
