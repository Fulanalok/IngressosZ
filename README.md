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

## ⚙️ Configuração e Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/ingressos-z.git
cd ingressos-z
```

### 2. Instale as dependências

**Frontend:**
```bash
cd ingressosZ
npm install
```

**Backend:**
```bash
cd functions
npm install
```

### 3. Variáveis e secrets

#### Frontend (`/ingressosZ`)

Crie um arquivo `.env` na raiz da pasta `ingressosZ` e adicione as seguintes variáveis com as chaves do seu projeto Firebase:

```env
VITE_FIREBASE_API_KEY="sua_api_key"
VITE_FIREBASE_AUTH_DOMAIN="seu_auth_domain"
VITE_FIREBASE_PROJECT_ID="seu_project_id"
VITE_FIREBASE_STORAGE_BUCKET="seu_storage_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="seu_messaging_sender_id"
VITE_FIREBASE_APP_ID="seu_app_id"
VITE_FIREBASE_MEASUREMENT_ID="seu_measurement_id"
VITE_MERCADOPAGO_PUBLIC_KEY="sua_chave_publica_do_mercado_pago"
VITE_FUNCTIONS_REGION="southamerica-east1" # (padrão)
VITE_FUNCTIONS_PORT="5001" # (padrão para dev)
VITE_API_URL="" # (fallback legado)
```
*Você pode encontrar os valores do Firebase no console do Firebase, nas configurações do seu projeto.*


#### Backend (`/functions`)

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
O app estará disponível em `http://localhost:5173`.


### Functions (emulador)

```bash
cd functions
npm run serve
```
O frontend faz proxy para `/functions` usando `VITE_FIREBASE_PROJECT_ID` e `VITE_FUNCTIONS_REGION`.

## 🧪 Rodando os Testes

Para garantir a qualidade e a estabilidade do código, execute os testes unitários e de integração.

*   **Para rodar os testes do Frontend:**
    *   A partir da pasta `/ingressosZ`:
    ```bash
    npm test
    ```

*   **Para rodar os testes do Backend:**
    *   A partir da pasta `/functions`:
    ```bash
    npm test
    ```

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
 