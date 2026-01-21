# 📚 IngressosZ - Índice de Documentação

> Método de pagamento principal: Mercado Pago.

## 🚀 Para Começar
- README.md — Visão geral do projeto
- QUICK_START.md — Setup rápido (Mercado Pago + Firebase)
- docs/setup/README_FIREBASE.md — Configuração Firebase

## 💳 Pagamentos (Mercado Pago)
- docs/payment-providers/MERCADOPAGO_SETUP.md — Configuração completa (credenciais, webhooks, testes)
- functions/README.md — Endpoints do backend (createPreference, webhook)

## 🎫 Ingressos & QR Code
- docs/TICKETS_SYSTEM_COMPLETED.md — Documentação do sistema de ingressos
- docs/guides/GUIA_TESTE_QR.md — Como testar leitura de QR Code
- docs/guides/SOLUÇÃO_CAMERA.md — Troubleshooting de câmera

## 📱 Planejamento
- docs/WEB_COMPLETION_PLAN.md — Plano de conclusão da versão web
- docs/guides/MOBILE_STRATEGY.md — Estratégia mobile

## 🗂️ Estrutura de Pastas
```
IngressosZ/
├── functions/                # Backend (Cloud Functions)
│   ├── src/index.ts          # Endpoints Mercado Pago
│   ├── .env.example          # Template env backend
│   └── README.md             # Doc Cloud Functions
├── ingressosZ/               # Frontend (React + Vite)
│   ├── src/hooks/useMercadoPagoCheckout.ts  # Hook principal
│   ├── src/pages/PaymentSuccess.tsx         # Sucesso
│   ├── src/pages/PaymentCanceled.tsx        # Cancelado
│   └── .env.example          # Template env frontend
└── docs/                     # Documentação organizada
```

## 📊 Status do Projeto
| Módulo | Status | Doc Principal |
|--------|--------|---------------|
| 💳 Pagamentos Mercado Pago | ✅ Completo | MERCADOPAGO_SETUP.md |
| 🎫 Sistema de Tickets | ✅ Completo | TICKETS_SYSTEM_COMPLETED.md |
| 📱 QR Code Scanner | ✅ Completo | GUIA_TESTE_QR.md |
| 🔐 Autenticação | ✅ Completo | README_FIREBASE.md |
| 🎨 Frontend React | ✅ Completo | README.md |
| ☁️ Cloud Functions | ✅ Completo | functions/README.md |
| 📊 Dashboard Admin | ⏳ Pendente | WEB_COMPLETION_PLAN.md |
| 📱 App Mobile Nativo | ⏳ Futuro | MOBILE_STRATEGY.md |

## 🔍 Links Rápidos
- Variáveis de ambiente: `functions/.env.example` e `ingressosZ/.env.example`
- Docs Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs
- Docs Firebase: https://firebase.google.com/docs

---

🎉 Tudo pronto para pagar com Mercado Pago e validar ingressos!
