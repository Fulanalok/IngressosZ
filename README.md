# IngressosZ - Plataforma Completa para Eventos e Ingressos

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)
![Tests](https://img.shields.io/badge/Tests-100%25_Passing-brightgreen)

**IngressosZ** é uma plataforma completa para venda, gerenciamento e validação de ingressos, com frontend em React + Vite e backend serverless em Firebase Functions.

## 📦 Estrutura do projeto

- **[`/ingressosZ`](./ingressosZ/README.md)**: SPA em React 19 + Vite + TypeScript.
- **`/functions`**: Firebase Cloud Functions v2 (Node.js 24).

## ✨ O que o projeto entrega

- Autenticação, cadastro e perfil de usuário.
- Gestão de eventos (admin).
- Compra integrada com Mercado Pago (Checkout Pro).
- Geração de ingressos e QR Code.
- Validação de ingressos via QR (página de validador).
- Modo escuro.

## ✅ Requisitos

- Node.js 24 para o backend (`/functions`, ver `engines`).
- Firebase CLI configurado no ambiente local.

## ⚙️ Configuração rápida

### 1) Frontend

```bash
cd ingressosZ
npm install
npm run dev
```

### 2) Backend

```bash
cd functions
npm install
npm run lint
```

## 🔐 Variáveis e secrets

### Frontend (`/ingressosZ`)

As variáveis de ambiente usadas pelo frontend são:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_MERCADOPAGO_PUBLIC_KEY`
- `VITE_FUNCTIONS_REGION` (padrão `southamerica-east1`)
- `VITE_FUNCTIONS_PORT` (dev, padrão `5001`)
- `VITE_API_URL` (fallback legado)

### Backend (`/functions`)

Secrets/Params do Firebase Functions:

- Secrets:
  - `MP_ACCESS_TOKEN`
  - `MP_WEBHOOK_SECRET`
  - `JWT_SECRET`
  - `SMTP_EMAIL`
  - `SMTP_PASSWORD`
- Strings:
  - `SMTP_HOST` (default `smtp.gmail.com`)
  - `SMTP_PORT` (default `465`)
  - `WEB_BASE_URL` (ex.: `https://ingressosz.com`)

Exemplo via CLI:

```bash
cd functions
firebase functions:secrets:set MP_ACCESS_TOKEN
firebase functions:secrets:set MP_WEBHOOK_SECRET
firebase functions:secrets:set JWT_SECRET
firebase functions:secrets:set SMTP_EMAIL
firebase functions:secrets:set SMTP_PASSWORD
firebase functions:config:set params.WEB_BASE_URL="https://seu-dominio.com"
```

## 🧪 Execução local

### Frontend

```bash
cd ingressosZ
npm run dev
```

### Functions (emulador)

```bash
cd functions
npm run serve
```

O frontend faz proxy para `/functions` usando `VITE_FIREBASE_PROJECT_ID` e `VITE_FUNCTIONS_REGION`.

## 🚀 Deploy do backend

```bash
cd functions
firebase deploy --only functions
```

Depois do deploy, pegue a URL da função `receiveWebhook` no console do Firebase e configure no painel do Mercado Pago.

## 🔁 Fluxos principais

### Checkout e Webhook

1. O frontend chama `createPaymentPreference` (callable).
2. O Mercado Pago envia o webhook para `receiveWebhook`.
3. O backend:
   - valida assinatura HMAC,
   - cria `purchases`,
   - gera `tickets` com `qrCode` assinado.

### Validação de ingressos

1. Em **Meus Ingressos**, copie o `qrCode` exibido abaixo do QR.
2. Em **/validador**, cole o código e valide.
3. O endpoint `/functions/validateTicket` exige `Authorization: Bearer <ID_TOKEN>`.

## 🧭 Referências úteis

- Frontend: [README.md](./ingressosZ/README.md)
- Backend: pasta `/functions` com scripts em `package.json`
