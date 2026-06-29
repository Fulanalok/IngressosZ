# Operacao, Setup e Deploy

Este documento resume como rodar, testar e publicar o IngressosZ.

## Requisitos

- Node.js compativel com o projeto.
- npm.
- Firebase CLI ou `npx firebase-tools`.
- Acesso ao projeto Firebase `<your-firebase-project-id>` para deploy real.

## Setup local

Na raiz:

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

## Variaveis do frontend

Crie `ingressosZ/.env.local` a partir de `ingressosZ/.env.example`.

Campos importantes:

```env
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FUNCTIONS_REGION="southamerica-east1"
VITE_MERCADOPAGO_PUBLIC_KEY="..."
VITE_RECAPTCHA_V2_SITE_KEY="..."
VITE_APPCHECK_RECAPTCHA_ENTERPRISE_KEY="..."
VITE_USE_EMULATORS="false"
```

## Secrets e params das Functions

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

## Qualidade local

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

Status 2026-06-29:

- `npm.cmd --prefix ingressosZ run qa` passou com 288 testes passing e
  18 skipped.
- `npm.cmd --prefix functions run lint`, `build` e `test` passaram; backend
  ficou com 9 testes passing e 1 pending.
- ESLint aplica `complexity` maxima 10. No backend, os handlers legados
  criticos mantem excecoes pontuais ate uma refatoracao pos-lancamento.

Suite raiz com emulador Firestore:

```bash
npm run test:emulator
```

## Deploy

Deploy completo recomendado pela raiz:

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

## Mercado Pago

Webhook atual:

```text
https://<your-webhook-url>
```

Configurar no painel Mercado Pago:

- Evento: `Payments`.
- Segredo: mesmo valor de `MP_WEBHOOK_SECRET`.
- Ambiente: producao ou sandbox consistente com as credenciais usadas.

## Checklist antes de apresentar no LinkedIn

- [ ] `git status` sem alteracoes inesperadas.
- [ ] README abre bem no GitHub.
- [ ] Site publico carrega sem tela branca.
- [ ] Pagina de eventos exibe cards com imagem.
- [ ] Rotas principais abrem: home, eventos, login, meus ingressos.
- [ ] Descricao do post deixa claro que e portfolio/demo controlada.

## Checklist antes de uso comercial amplo

- [ ] Mercado Pago webhook configurado e validado.
- [ ] Compra real barata testada via Checkout/cartao.
- [ ] Compra real barata testada via Pix.
- [ ] E-mail transacional recebido.
- [ ] QR Code validado com role correta.
- [ ] Reuso de QR Code bloqueado.
- [ ] Reembolso/admin testado.
- [ ] Dominios autorizados em Firebase Auth, reCAPTCHA e App Check.
- [ ] App Check enforcement ativo e monitorado.
- [ ] Termos, privacidade e regras de reembolso revisados.
