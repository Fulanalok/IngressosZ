# IngressosZ

IngressosZ e uma plataforma single-company para criacao de eventos, venda de
ingressos digitais, emissao de QR Codes e validacao presencial.

O projeto usa Firebase como base operacional e Mercado Pago para Checkout/Pix.
A prioridade e manter um fluxo simples, seguro e barato de operar.

## Status Atual

- UI Premium Blue para Home, Eventos, Ingressos e fluxo de compra.
- Checkout Mercado Pago com `paymentSessions`.
- `paymentSessions.paymentMethod` identifica `checkout` ou `pix`.
- Webhook Mercado Pago com assinatura HMAC via `MP_WEBHOOK_SECRET`.
- Emissao de tickets com QR Code JWT assinado.
- Validador com endpoint HTTP autenticado.
- Painel admin para eventos, roles e reembolsos.
- Upload e otimizacao de imagens no Storage.
- E-mails transacionais de confirmacao.
- Observabilidade com Sentry.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind v4.
- Dados: TanStack Query v5.
- Backend: Firebase Functions v2, Node.js 24.
- Banco: Firestore.
- Storage: Firebase Storage.
- Auth: Firebase Authentication.
- Pagamentos: Mercado Pago Checkout Pro e Pix.
- Monitoramento: Sentry.

## Estrutura

```text
.
|-- ingressosZ/              # Frontend React/Vite
|-- functions/               # Firebase Functions
|-- firestore.rules          # Regras Firestore
|-- firestore.indexes.json   # Indices Firestore
|-- storage.rules            # Regras Storage
|-- firebase.json            # Hosting, Functions e emuladores
|-- planning/CONTEXT.md      # Roadmap operacional
|-- architecture/CONTEXT.md  # Arquitetura atual
|-- ops/CONTEXT.md           # Deploy e operacoes
`-- functions/API.md         # Contratos backend
```

## Fluxo de Pagamento

1. Usuario autenticado escolhe evento, tipo de ingresso e quantidade.
2. Frontend cria `paymentSessions/{id}` no Firestore com:
   - `eventId`
   - `userId`
   - `userEmail`
   - `ticketType`
   - `quantity`
   - `unitPrice`
   - `totalAmount`
   - `status: "pending"`
   - `provider: "mercadopago"`
   - `paymentMethod: "checkout"` ou `"pix"`
3. Frontend chama `createPaymentPreference` ou `createPixPayment`.
4. Mercado Pago processa o pagamento.
5. Mercado Pago chama `receiveWebhook`.
6. Backend valida HMAC, consulta a API do Mercado Pago, atualiza a sessao,
   cria `purchases`, decrementa estoque, gera `tickets` e envia e-mail.

## Regras de Seguranca

- `events`: leitura publica; escrita controlada por owner/organizer/admin.
- `paymentSessions`: criacao pelo usuario autenticado; `paymentMethod` limitado
  a `checkout` ou `pix`.
- `tickets`: leitura pelo dono/admin; escrita direta pelo cliente bloqueada.
- `purchases`: sem acesso direto do cliente.
- `users`: role protegida contra alteracao comum.

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

## Variaveis do Frontend

Crie `ingressosZ/.env.local` usando `ingressosZ/.env.example` como base.

Principais variaveis:

```env
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_MEASUREMENT_ID="..."
VITE_FUNCTIONS_REGION="southamerica-east1"
VITE_API_URL=""
VITE_MERCADOPAGO_PUBLIC_KEY="..."
VITE_RECAPTCHA_V2_SITE_KEY="..."
VITE_APPCHECK_RECAPTCHA_ENTERPRISE_KEY="..."
VITE_APPCHECK_DEBUG_TOKEN="false"
VITE_USE_EMULATORS="false"
VITE_FUNCTIONS_PORT="5001"
VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT="5001"
VITE_FIREBASE_EMULATOR_AUTH_PORT="9099"
VITE_FIREBASE_EMULATOR_FIRESTORE_PORT="8086"
VITE_FIREBASE_EMULATOR_STORAGE_PORT="9199"
VITE_SENTRY_DSN=""
```

## Secrets e Params das Functions

Secrets obrigatorios:

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
WEB_BASE_URL=https://<your-project>.web.app
SENTRY_DSN=
```

## Testes

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

O teste E2E do webhook roda completo quando Firestore/Auth emulators estao
ativos. Sem emuladores, ele fica pendente.

## Deploy

```bash
firebase use
firebase deploy --only firestore:rules,storage,functions,hosting
```

Apos o deploy, cadastre a URL publica da Function `receiveWebhook` no painel do
Mercado Pago e habilite o evento `Payments`.

## Checklist de Producao

- [ ] `firebase use` aponta para o projeto correto.
- [ ] Frontend `.env.local` contem Firebase, Mercado Pago, reCAPTCHA e App
  Check.
- [ ] Functions secrets configurados.
- [ ] `WEB_BASE_URL` aponta para a URL publica real.
- [ ] Dominios autorizados no Firebase Auth.
- [ ] Dominios autorizados no reCAPTCHA v2.
- [ ] Dominios autorizados no reCAPTCHA Enterprise/App Check.
- [ ] Webhook Mercado Pago cadastrado e testado.
- [ ] Compra real de baixo valor testada em Checkout e Pix.
- [ ] QR Code validado com role `validator`, `organizer` ou `admin`.
- [ ] Reembolso/admin testado em compra elegivel.

## Documentacao Relacionada

- [functions/API.md](functions/API.md)
- [architecture/CONTEXT.md](architecture/CONTEXT.md)
- [planning/CONTEXT.md](planning/CONTEXT.md)
- [ops/CONTEXT.md](ops/CONTEXT.md)
- [ingressosZ/README.md](ingressosZ/README.md)
