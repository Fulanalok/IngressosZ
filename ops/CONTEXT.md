# ops/ - Operacoes e Deploy

## Ambiente Atual

- **Firebase project:** `<your-firebase-project-id>`
- **Hosting principal:** `https://ingressosz.web.app`
- **Functions region:** `southamerica-east1`
- **Backend runtime:** Node.js 24
- **Pagamentos:** Mercado Pago Checkout/Pix

## Deploy

### Frontend

```bash
npm --prefix ingressosZ run build
firebase deploy --only hosting
```

### Functions

```bash
npm --prefix functions run lint
npm --prefix functions run build
firebase deploy --only functions
```

Deploy seletivo:

```bash
firebase deploy --only functions:receiveWebhook
firebase deploy --only functions:createPaymentPreference
firebase deploy --only functions:createPixPayment
firebase deploy --only functions:refundPayment
```

### Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

`firestore.rules` inclui validacao de:

- `paymentSessions.paymentMethod`: apenas `checkout` ou `pix`.
- `paymentSessions.userId`: deve ser igual a `request.auth.uid`.
- `paymentSessions.userEmail`: deve bater com o email autenticado quando o token
  possui email.
- `tickets` e `purchases`: escrita direta pelo cliente bloqueada.

## Secrets e Params

Secrets:

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN
firebase functions:secrets:set MP_WEBHOOK_SECRET
firebase functions:secrets:set JWT_SECRET
firebase functions:secrets:set SMTP_EMAIL
firebase functions:secrets:set SMTP_PASSWORD
firebase functions:secrets:set RECAPTCHA_V2_SECRET
```

Params em `functions/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
WEB_BASE_URL=https://ingressosz.web.app
SENTRY_DSN=
```

## Mercado Pago

Webhook:

- Function: `receiveWebhook`
- Evento: `Payments`
- Seguranca: assinatura HMAC com `MP_WEBHOOK_SECRET`
- Pos-deploy: copiar a URL publica gerada pelo Firebase e cadastrar no painel do
  Mercado Pago.

Validacao manual minima:

1. Criar evento barato.
2. Comprar via Checkout.
3. Comprar via Pix.
4. Conferir `paymentSessions.status`.
5. Conferir `purchases.status`.
6. Conferir `tickets` emitidos.
7. Validar QR Code com usuario `validator`, `organizer` ou `admin`.
8. Conferir e-mail transacional.

## Testes

```bash
npm --prefix ingressosZ run lint
npm --prefix ingressosZ run build
npm --prefix ingressosZ run test -- --run
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions run test
```

O teste E2E do webhook roda completo quando Firestore/Auth emulators estao
ativos. Sem emuladores, ele fica pendente.

## Logs

```bash
firebase functions:log --only receiveWebhook
firebase functions:log --only createPaymentPreference
firebase functions:log --only createPixPayment
firebase functions:log --only refundPayment
```

Console:

- Firebase: `https://console.firebase.google.com/project/<your-firebase-project-id>`
- Cloud Logs: projeto `<your-firebase-project-id>`

## Checklist Pre-Deploy

- [ ] `firebase use` aponta para `<your-firebase-project-id>`.
- [ ] `.env.local` do frontend contem Firebase, Mercado Pago, reCAPTCHA,
  App Check e Sentry quando usado.
- [ ] `functions/.env` contem SMTP, `WEB_BASE_URL` e `SENTRY_DSN`.
- [ ] Secrets obrigatorios configurados.
- [ ] Lint, build e testes passam.
- [ ] Firestore Rules e Storage Rules revisadas.
- [ ] Webhook Mercado Pago cadastrado com URL atual.

## Checklist Pos-Deploy

- [ ] Abrir `https://ingressosz.web.app`.
- [ ] Login/cadastro funcionam sem erro de reCAPTCHA por dominio.
- [ ] Checkout cria `paymentSessions` com `paymentMethod: "checkout"`.
- [ ] Pix cria `paymentSessions` com `paymentMethod: "pix"`.
- [ ] Webhook atualiza sessao, compra e tickets.
- [ ] Reembolso/admin funciona para compra elegivel.
- [ ] Validador le e invalida QR Code corretamente.
- [ ] Sentry recebe erro de teste controlado.

## Rollback

Nao ha rollback automatico. Para voltar:

```bash
git checkout <commit-anterior>
npm --prefix ingressosZ run build
npm --prefix functions run build
firebase deploy --only hosting,functions,firestore:rules
```
