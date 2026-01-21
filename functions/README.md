# IngressosZ - Cloud Functions (Backend)

Backend serverless do IngressosZ usando Firebase Cloud Functions e Mercado Pago.

## 📋 Pré-requisitos

- Node.js 22+
- Firebase CLI: `npm install -g firebase-tools`
- Conta Firebase (plano Blaze para produção)
- Conta Mercado Pago

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Rodar localmente
npm run serve

# Deploy
npm run deploy
```

## ⚙️ Configuração

Edite `functions/.env`:

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxx
ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Obtenha as credenciais em: https://www.mercadopago.com.br/developers/panel/credentials

## 📡 Endpoints

### POST `/mercadoPagoCreatePreference`

Cria preferência de pagamento.

**Headers:** `Authorization: Bearer <FIREBASE_ID_TOKEN>`

**Body:**
```json
{
  "eventId": "event123",
  "ticketType": "standard",
  "quantity": 2,
  "userId": "user456",
  "userEmail": "user@example.com"
}
```

**Preços:**
- standard: R$ 50
- vip: R$ 150
- premium: R$ 300

### POST `/mercadoPagoWebhook`

Recebe notificações do Mercado Pago.

## 🧪 Testes

Use cartões de teste: https://www.mercadopago.com.br/developers/pt/docs/sdks-library/client-side/test-cards

## 📚 Documentação

- Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs
- Firebase Functions: https://firebase.google.com/docs/functions

