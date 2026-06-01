# ops/ - Operacoes e Deploy

Atualizado em 2026-06-01. Base Git: `9fb60de chore: reduce firebase cost surface`.

## Ambiente Atual

- Firebase project: `<your-firebase-project-id>`
- Hosting principal confirmado via Firebase CLI: `https://<your-project>.web.app`
- Dominio proprio/curto ainda nao confirmado.
- Functions region: `southamerica-east1`
- Backend runtime: Node.js 24
- Pagamentos: Mercado Pago Checkout Pro e Pix
- Functions implantadas em producao em 2026-06-01.
- Cloud SQL/Data Connect removidos para reduzir custo.
- Secret Manager `SMTP_EMAIL` removido; `SMTP_EMAIL` agora e param/env comum.
- Checklist operacional: `planning/CHECKLIST_FINALIZACAO.md`

## Setup Local

```bash
npm install
npm run install:all
```

Frontend:

```bash
npm --prefix ingressosZ run dev
```

Functions/emuladores:

```bash
firebase emulators:start
```

## Qualidade

Frontend:

```bash
npm --prefix ingressosZ run lint
npm --prefix ingressosZ run typecheck
npm --prefix ingressosZ run build
npm --prefix ingressosZ run test
```

Backend:

```bash
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions run test
```

Teste com emulador Firestore:

```bash
npm run test:emulator
```

O teste E2E do webhook roda completo quando Firestore/Auth emulators estao
ativos. Sem emuladores, ele pode ficar pendente.

## Secrets e Params

Secrets:

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN
firebase functions:secrets:set MP_WEBHOOK_SECRET
firebase functions:secrets:set JWT_SECRET
firebase functions:secrets:set SMTP_PASSWORD
firebase functions:secrets:set RECAPTCHA_V2_SECRET
```

Params em `functions/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_EMAIL=seu-email@exemplo.com
WEB_BASE_URL=https://<your-project>.web.app
SENTRY_DSN=
```

Nota operacional: em 2026-06-01 o deploy das Functions foi concluido, mas o
dotenv local usado no deploy ainda continha `WEB_BASE_URL=https://ingressosz.web.app`.
Antes do proximo teste real, alinhar para
`https://<your-project>.web.app` e redeployar Functions.

## Deploy

Deploy completo recomendado:

```bash
firebase deploy --only firestore:rules,storage,functions,hosting
```

Deploy separado:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
npm --prefix functions run lint
npm --prefix functions run build
firebase deploy --only functions
npm --prefix ingressosZ run build
firebase deploy --only hosting
```

Deploy seletivo de Functions:

```bash
firebase deploy --only functions:receiveWebhook
firebase deploy --only functions:createPaymentPreference
firebase deploy --only functions:createPixPayment
firebase deploy --only functions:refundPayment
firebase deploy --only functions:validateTicket
```

## Mercado Pago

Webhook:

- Function: `receiveWebhook`
- URL atual: `https://<your-webhook-url>`
- Evento: `Payments`
- Seguranca: assinatura HMAC com `MP_WEBHOOK_SECRET`
- Pos-deploy: copiar a URL publica gerada pelo Firebase e cadastrar no painel
  do Mercado Pago.

Validacao manual minima:

1. Criar evento barato.
2. Comprar via Checkout/cartao.
3. Comprar via Pix.
4. Conferir `paymentSessions.status`.
5. Conferir `purchases.status`.
6. Conferir `tickets` emitidos.
7. Validar QR Code com role `validator`, `organizer` ou `admin`.
8. Conferir e-mail transacional.
9. Testar reembolso/admin em compra elegivel.

## Logs

```bash
firebase functions:log --only receiveWebhook
firebase functions:log --only createPaymentPreference
firebase functions:log --only createPixPayment
firebase functions:log --only refundPayment
firebase functions:log --only validateTicket
```

Consoles:

- Firebase: `https://console.firebase.google.com/project/<your-firebase-project-id>`
- Cloud Logs: projeto `<your-firebase-project-id>`

## Checklist Pre-Deploy

- [x] `firebase use` aponta para `<your-firebase-project-id>` ou deploy usa
  `--project <your-firebase-project-id>`.
- [ ] `ingressosZ/.env.local` contem Firebase, Mercado Pago, reCAPTCHA, App
  Check e Sentry quando usado.
- [ ] `functions/.env` contem SMTP, `WEB_BASE_URL` oficial e `SENTRY_DSN`.
- [x] Secrets obrigatorios configurados para deploy das Functions.
- [x] Lint, typecheck, build e testes passaram em 2026-06-01.
- [ ] Firestore Rules e Storage Rules revisadas.
- [x] URL atual do webhook Mercado Pago registrada.

## Checklist Pos-Deploy

- [ ] Abrir `https://<your-project>.web.app`.
- [ ] Login/cadastro funcionam sem erro de reCAPTCHA por dominio.
- [ ] Checkout cria `paymentSessions` com `paymentMethod: "checkout"`.
- [ ] Pix cria `paymentSessions` com `paymentMethod: "pix"`.
- [ ] Webhook atualiza sessao, compra e tickets.
- [ ] E-mail transacional e enviado.
- [ ] Reembolso/admin funciona para compra elegivel.
- [ ] Validador le e invalida QR Code corretamente.
- [ ] Sentry recebe erro de teste controlado, se habilitado.

## Rollback

Nao ha rollback automatico. Para voltar:

```bash
git checkout <commit-anterior>
npm --prefix ingressosZ run build
npm --prefix functions run build
firebase deploy --only hosting,functions,firestore:rules
```
