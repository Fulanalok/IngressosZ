# 🖥️ Frontend React — IngressosZ

## 🚀 Como rodar

```powershell
cd ingressosZ
npm install
npm run dev
```

- Acesse `http://localhost:5173`
- Faça login e teste uma compra

## 🔧 Variáveis de ambiente

- Copie `./.env.example` para `./.env.local` (ou `./.env`)
- Configure URLs da API se necessário

## 📂 Estrutura relevante

```
ingressosZ/
├── src/
│   ├── hooks/useMercadoPagoCheckout.ts    # Fluxo de checkout
│   ├── pages/EventDetailPage.tsx          # Página do evento (compra)
│   ├── pages/PaymentSuccess.tsx           # Sucesso
│   ├── pages/PaymentCanceled.tsx          # Cancelado
│   ├── pages/MyTicketsPage.tsx            # Meus ingressos
│   └── services/                          # Chamadas ao backend
└── vite.config.ts
```

## 🧪 Testes rápidos

- Use cartões de teste (ver `docs/payment-providers/MERCADOPAGO_SETUP.md`)
- Em dev, o webhook pode ser simulado via Emulator

## 🔗 Links úteis

- `INDEX_DOCS.md` — índice da documentação
- `docs/payment-providers/MERCADOPAGO_SETUP.md` — setup de pagamentos
- `QUICK_START.md` — início rápido