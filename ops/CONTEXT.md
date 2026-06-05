# ops/ - Operacoes e Deploy

Atualizado em 2026-06-05. Base Git: `1b897e1 style: format displayed dates without hyphens`.

## Ambiente Atual

- Firebase project: `<your-firebase-project-id>`
- Hosting principal confirmado via Firebase CLI: `https://<your-project>.web.app`
- Dominio proprio/curto ainda nao confirmado.
- Functions region: `southamerica-east1`
- Backend runtime: Node.js 24
- Pagamentos: Mercado Pago Checkout Pro e Pix
- Functions implantadas em producao em 2026-06-01 e redeployadas em
  2026-06-02 com `WEB_BASE_URL` oficial.
- Firestore Rules, Storage Rules e Hosting publicados em 2026-06-02.
- Hosting republicado em 2026-06-05 apos ajustes visuais e formatacao de
  datas; URL respondeu HTTP 200 apos o deploy.
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

Nota operacional: em 2026-06-02 o dotenv local de projeto
`functions/.env.<your-firebase-project-id>` foi realinhado para
`WEB_BASE_URL=https://<your-project>.web.app`, e o redeploy das
Functions confirmou o carregamento desse arquivo.

## Deploy

Deploy completo recomendado pela raiz do repositorio:

```bash
npx firebase-tools deploy --only firestore:rules,storage,functions,hosting --project <your-firebase-project-id>
```

Deploy separado:

```bash
npx firebase-tools deploy --only firestore:rules --project <your-firebase-project-id>
npx firebase-tools deploy --only storage --project <your-firebase-project-id>
npm --prefix functions run lint
npm --prefix functions run build
npx firebase-tools deploy --only functions --project <your-firebase-project-id>
npm --prefix ingressosZ run build
npx firebase-tools deploy --only hosting --project <your-firebase-project-id>
```

Deploy seletivo de Functions:

```bash
npx firebase-tools deploy --only functions:receiveWebhook --project <your-firebase-project-id>
npx firebase-tools deploy --only functions:createPaymentPreference --project <your-firebase-project-id>
npx firebase-tools deploy --only functions:createPixPayment --project <your-firebase-project-id>
npx firebase-tools deploy --only functions:refundPayment --project <your-firebase-project-id>
npx firebase-tools deploy --only functions:validateTicket --project <your-firebase-project-id>
```

Observacao: executar Firebase CLI a partir da raiz. O par legado
`ingressosZ/.firebaserc` + `ingressosZ/firebase.json` foi removido; o deploy
oficial usa somente o `firebase.json` da raiz.

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

- [x] `npx firebase-tools use` aponta para `<your-firebase-project-id>` ou
  deploy usa `--project <your-firebase-project-id>`.
- [ ] `ingressosZ/.env.local` contem Firebase, Mercado Pago, reCAPTCHA, App
  Check e Sentry quando usado.
- [x] `functions/.env.<your-firebase-project-id>` contem SMTP,
  `WEB_BASE_URL` oficial e `SENTRY_DSN`.
- [x] Secrets obrigatorios configurados para deploy das Functions.
- [x] Lint, typecheck, build e testes passaram em 2026-06-01.
- [x] Firestore Rules e Storage Rules publicadas em 2026-06-02.
- [x] Hosting publicado em 2026-06-05 com visual escuro simplificado e datas
  sem hifens.
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
npx firebase-tools deploy --only hosting,functions,firestore:rules --project <your-firebase-project-id>
```
