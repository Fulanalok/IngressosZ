# 🟢 Configuração do Mercado Pago - Guia Completo

## 📋 Visão Geral

O Mercado Pago agora é o método de pagamento **principal** do IngressosZ, oferecendo suporte nativo a **PIX**, **cartão de crédito** e **boleto bancário**.

---

## 🔑 1. Obter Credenciais

### Acesse: https://www.mercadopago.com.br/developers/panel/credentials

1. **Faça login** na sua conta Mercado Pago
2. Vá para **"Suas integrações" > "Credenciais"**
3. Escolha entre:
   - 🧪 **Test** (para desenvolvimento)
   - 💰 **Production** (para produção)

### ⚠️ Você precisa do **Access Token**

```
TEST-XXXX-XXXX-XXXX-XXXX  (para testes)
APP-XXXX-XXXX-XXXX-XXXX   (para produção)
```

---

## ⚙️ 2. Configurar Backend

### Edite `functions/.env`:

```bash
# ============================================
# MERCADO PAGO (MÉTODO PRINCIPAL)
# ============================================
MERCADOPAGO_ACCESS_TOKEN=TEST-XXXX-XXXX-XXXX-XXXX

# URL do webhook (opcional - deixe vazio para desenvolvimento local)
MP_WEBHOOK_URL=
```

---

## 💳 3. Métodos de Pagamento Suportados

O Mercado Pago Checkout Pro oferece automaticamente:

| Método | Disponível | Velocidade |
|--------|-----------|-----------|
| 💚 **PIX** | ✅ Sim | Instantâneo |
| 💳 **Cartão de Crédito** | ✅ Sim | Instantâneo |
| 📄 **Boleto** | ✅ Sim | 1-3 dias úteis |
| 💰 **Saldo MP** | ✅ Sim | Instantâneo |

---

## 💰 4. Preços Server-Authoritative

Os preços são controlados **100% no backend** (server-authoritative) para segurança máxima:

```typescript
// Backend: functions/src/index.ts
const PRICE_BY_TYPE: Record<string, number> = {
  standard: 50,   // R$ 50,00
  vip: 150,       // R$ 150,00
  premium: 300,   // R$ 300,00
};
```

✅ **Vantagens:**
- Cliente não pode manipular preços
- Atualização centralizada
- Melhor auditoria

---

## 🔔 5. Configurar Webhook (Notificações)

### Durante Desenvolvimento Local:

1. O webhook está configurado para usar ngrok ou o emulador Firebase
2. A URL é construída automaticamente: `http://localhost:5001/ingressosz/us-central1/mercadoPagoWebhook`

### Em Producao:

#### Acesse: https://www.mercadopago.com.br/developers/panel/notifications/webhooks

1. Clique em **"Criar notificação"**
2. **URL de notificação:**
   ```
   https://us-central1-[SEU_PROJETO].cloudfunctions.net/mercadoPagoWebhook
   ```
3. **Eventos:** Selecione `payments` (pagamentos)
4. Clique em **"Criar"**

#### Configure no `.env` de produção:

```bash
MP_WEBHOOK_URL=https://us-central1-SEU_PROJETO.cloudfunctions.net/mercadoPagoWebhook
```

---

## 🧪 6. Testar com Cartoes de Teste

### Acesse: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards

### Cartões Principais:

| Cenário | Cartão | CVV | Vencimento |
|---------|--------|-----|-----------|
| ✅ **Aprovado** | 5031 4332 1540 6351 | 123 | 11/25 |
| ⏳ **Pendente** | 5031 7557 3453 0604 | 123 | 11/25 |
| ❌ **Recusado - Fundos insuficientes** | 5031 4318 4062 0000 | 123 | 11/25 |
| ❌ **Recusado - Outro motivo** | 5031 4935 7990 0039 | 123 | 11/25 |

**Dicas para testes:**
- **Nome:** Qualquer nome (ex: APRO, CONT, etc.)
- **CPF:** Qualquer CPF válido
- **Email:** test@test.com

### Testar PIX:

1. Selecione PIX no checkout
2. Escaneie o QR Code com o app Mercado Pago
3. OU copie o código PIX
4. Em **modo teste**, o pagamento é simulado automaticamente

---

## 🏗️ 7. Arquitetura do Fluxo

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ 1. mercadoPagoCreatePreference({ eventId, ticketType, quantity })
       │    + Firebase ID Token
       ▼
┌─────────────────────┐
│  Cloud Function     │
│  Backend            │
│                     │
│  1. Valida token    │
│  2. Define preço    │
│  3. Cria order      │
│  4. Cria preference │
└──────┬──────────────┘
       │ 2. { preferenceId, init_point }
       ▼
┌─────────────┐
│   Frontend  │──── 3. Redireciona para ────▶ Mercado Pago Checkout Pro
└─────────────┘

       ┌────────────────┐
       │ Usuário paga   │
       │ (PIX/Cartão)   │
       └────────┬───────┘
                │
                │ 4. POST notification (IPN)
                ▼
       ┌──────────────────┐
       │  mercadoPagoWebhook │
       │  (Cloud Function)│
       └────────┬─────────┘
                │
                │ 5. Cria ingresso(s)
                ▼
       ┌──────────────┐
       │  Firestore   │
       │  "tickets"   │
       └──────────────┘
```

---

## ✅ 8. Checklist de Configuração

### Desenvolvimento
- [ ] Obtive `MERCADOPAGO_ACCESS_TOKEN` (TEST)
- [ ] Configurei em `functions/.env`
- [ ] Rodei `npm run serve` no backend
- [ ] Rodei `npm run dev` no frontend
- [ ] Testei compra com cartão aprovado
- [ ] Testei PIX (simulação)

### Producao
- [ ] Obtive `MERCADOPAGO_ACCESS_TOKEN` (PRODUCTION)
- [ ] Configurei secrets no Firebase
- [ ] Fiz deploy das Functions
- [ ] Criei webhook no painel MP
- [ ] Configurei `MP_WEBHOOK_URL`
- [ ] Testei pagamento real (pequeno valor)
- [ ] Verifiquei criação de ingressos

---

## 🔐 9. Segurança

### ✅ Implementado:
- Autenticação Firebase em todos os endpoints
- Preços server-authoritative (não aceita preço do cliente)
- Validação de notificações IPN
- CORS configurado
- Secrets em variáveis de ambiente

### ⚠️ Recomendações:
- Use Firebase Secret Manager em produção
- Rotacione tokens periodicamente
- Monitore logs de pagamento
- Configure alertas de fraude no painel MP

---

## 📊 10. Monitorar Pagamentos (Mercado Pago)

### Painel Mercado Pago:

1. **Atividade:** https://www.mercadopago.com.br/activities
   - Veja todos os pagamentos
   - Status (aprovado, pendente, recusado)
   - Detalhes do comprador

2. **Relatórios:** https://www.mercadopago.com.br/balance/reports
   - Exportar transações
   - Análise de vendas
   - Comissões e taxas

3. **Notificações:** Painel de desenvolvedores
   - Status de webhooks
   - Reenviar notificações
   - Debug de problemas

---

---

## 🚀 12. Comandos Rápidos

```powershell
# Configurar
cd functions
Copy-Item .env.example .env
# Edite .env e adicione MERCADOPAGO_ACCESS_TOKEN

# Rodar backend
npm install
npm run serve

# Rodar frontend (novo terminal)
cd ..\ingressosZ
npm run dev

# Testar
# 1. Acesse http://localhost:5173
# 2. Compre um ingresso
# 3. Use cartão 5031 4332 1540 6351
# 4. ✅ Aprovado!
```

---

## 🐛 13. Troubleshooting

### ❌ "MERCADOPAGO_ACCESS_TOKEN ausente"
→ Configure `MERCADOPAGO_ACCESS_TOKEN` em `functions/.env`

### ❌ Webhook não funciona
→ Verifique se a URL está correta no painel MP
→ Em dev, certifique-se de que o emulador está rodando

### ❌ Pagamento não cria ingresso
→ Confira logs do webhook: `firebase functions:log`
→ Verifique se o `external_reference` está correto

### ❌ "Payment not found"
→ Aguarde alguns segundos (IPN pode demorar)
→ Verifique se está usando credenciais de TEST em modo teste

---

## 📞 14. Suporte

- 📚 **Documentação:** https://www.mercadopago.com.br/developers/pt/docs
- 💬 **Suporte:** Painel MP > Ajuda
- 🤝 **Comunidade:** https://www.mercadopago.com.br/developers/pt/community

---

## 🎉 Pronto!

Agora você tem o Mercado Pago configurado e funcionando perfeitamente no IngressosZ!

**Próximo passo:** Teste uma compra com cartão de teste ou PIX simulado! 🚀

---

**Desenvolvido com ❤️ para o mercado brasileiro**
