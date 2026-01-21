# 🚀 IngressosZ - Quick Start (Mercado Pago + Firebase)

## ⚡ Início Rápido (3 minutos)

### 1️⃣ Pré-requisitos
- Node.js 22+
- Firebase CLI (`npm i -g firebase-tools`)
- Conta Mercado Pago (Access Token de TESTE)

### 2️⃣ Configure as variáveis de ambiente

```powershell
# Backend
cd functions
Copy-Item .env.example .env
# Edite functions/.env e adicione:
# MERCADOPAGO_ACCESS_TOKEN=TEST-XXXX-XXXX-XXXX-XXXX
# MP_WEBHOOK_URL=https://SEU_ENDPOINT_PUBLICO/mercadoPagoWebhook (após deploy)

# Frontend
cd ../ingressosZ
Copy-Item .env.example .env.local
# Edite ingressosZ/.env.local com suas credenciais Firebase
```

### 3️⃣ Instale e rode

```powershell
# Backend
cd functions
npm install
npm run build
npm run serve

# Frontend (novo terminal)
cd ingressosZ
npm install
npm run dev
```

✅ Emulator UI: `http://localhost:4000`
✅ App: `http://localhost:5173`

### 4️⃣ Teste o fluxo
- Acesse `http://localhost:5173`
- Faça login
- Abra um evento e clique em comprar
- Você será redirecionado para o Checkout Pro do Mercado Pago
- Após pagar, veja a página de sucesso

Observação: o webhook local exige um endpoint público (ex.: ngrok) para funcionar. Em ambiente de desenvolvimento, foque no fluxo de criação de preferência e redirecionamento.

---

## 🔑 Links úteis

### Mercado Pago
- Dashboard Developers: https://www.mercadopago.com.br/developers
- Credenciais: https://www.mercadopago.com.br/developers/panel/credentials
- Documentação: https://www.mercadopago.com.br/developers/pt/docs
- Webhooks: https://www.mercadopago.com.br/developers/panel/webhooks

### Firebase
- Console: https://console.firebase.google.com
- Projeto: https://console.firebase.google.com/project/ingressosz
- Emulator Suite: https://firebase.google.com/docs/emulator-suite

---

## 📂 Estrutura mínima

```
IngressosZ/
├── functions/
│   ├── .env.example
│   ├── .env
│   └── src/index.ts        # createPreference + mercadoPagoWebhook
├── ingressosZ/
│   ├── .env.example
│   ├── .env.local
│   └── src/hooks/useMercadoPagoCheckout.ts
└── INDEX_DOCS.md
```

---

## ✅ Checklist rápido
- [ ] Instalou Node.js 22+
- [ ] Instalou Firebase CLI
- [ ] Configurou `functions/.env` com `MERCADOPAGO_ACCESS_TOKEN`
- [ ] Rodou backend (`npm run serve`)
- [ ] Rodou frontend (`npm run dev`)
- [ ] Testou compra com Checkout Pro

---

🎉 Pronto! Você tem um fluxo completo com Mercado Pago em desenvolvimento.