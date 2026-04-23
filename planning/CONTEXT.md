# Planning - Planejamento IngressosZ

Documentação de planejamento estratégico, roadmap e próximos passos.

## Roadmap Atual (Q2 2026)

### Alta Prioridade - Validação em Produção

- [ ] **Fluxo de pagamento end-to-end**: Testar MP_ACCESS_TOKEN configurado, Functions com `getFirestore()`. Validar compra com cartão e PIX em produção.
- [ ] **Webhook Mercado Pago**: Registrar URL `receiveWebhook` no dashboard MP para gerar tickets automaticamente após aprovação.
  - URL: `https://<region>-<your-project>.cloudfunctions.net/receiveWebhook`
- [ ] **Login (auth/invalid-credential)**: Validar credenciais de usuário admin no Firebase Console.

### UI/UX & Features

- [ ] **PIX Checkout**: Validar QR Code Base64 no modal após aprovação via webhook.
- [x] **PWA icon**: Corrigido — manifest.json criado, vite-plugin-pwa@0.21.2 instalado com --legacy-peer-deps
- [ ] **App Check**: Habilitar em produção (Auth, Firestore, Functions, Storage) para segurança adicional.

---

## Plano de Execução: Tasks de Alta Prioridade

### Diagnóstico (2026-04-23)

- `getFirestore()` usado corretamente em todo o código (nenhum `admin.firestore()`)
- Secrets usam API moderna `defineSecret`/`defineString` (não `functions.config()`)
- O valor legado `app.web_base_url` em `functions.config()` pode ser ignorado
- QR Codes usam JWT assinado (não HMAC), com expiração baseada na data do evento

### Secrets obrigatórios (via `firebase functions:secrets:set`)

| Secret | Finalidade | Status |
|--------|-----------|--------|
| `MP_ACCESS_TOKEN` | Token de produção do Mercado Pago | [ ] Pendente |
| `MP_WEBHOOK_SECRET` | Chave de assinatura do webhook MP | [ ] Pendente |
| `JWT_SECRET` | Assinar QR Codes dos tickets (JWT) | [ ] Pendente |
| `SMTP_EMAIL` | Email remetente (confirmação de compra) | [ ] Pendente |
| `SMTP_PASSWORD` | Senha do email remetente | [ ] Pendente |
| `RECAPTCHA_V2_SECRET` | Validação reCAPTCHA | [ ] Pendente |

### Params de ambiente (`functions/.env`)

| Param | Default | Nota |
|-------|---------|------|
| `SENTRY_DSN` | — | Monitoramento de erros |
| `WEB_BASE_URL` | `https://ingressosz.web.app` | URLs em emails e back_urls do MP |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | `465` | Porta SMTP |

---

### Task 1: Fluxo de Pagamento E2E

**Workspace**: `functions/` + `ops/`

#### Passo 1 — Configurar secrets

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN
# Colar token de produção do Mercado Pago

firebase functions:secrets:set JWT_SECRET
# Gerar chave forte: openssl rand -hex 32
```

#### Passo 2 — Criar `functions/.env`

```env
SENTRY_DSN=https://seu-dsn@sentry.io/xxx
WEB_BASE_URL=https://<your-project>.web.app
```

#### Passo 3 — Deploy

```bash
cd functions && npm run build && firebase deploy --only functions
```

#### Passo 4 — Testar compra real

1. Criar evento de teste (preço R$1)
2. Comprar via checkout MP (cartão)
3. Monitorar logs: `firebase functions:log --only createPaymentPreference`

#### Passo 5 — Verificar resultado

No Firebase Console:
- `purchases/` → `status: "approved"`
- `tickets/` → `qrCode` com JWT assinado
- Email de confirmação recebido

---

### Task 2: Webhook Mercado Pago

**Workspace**: `ops/` (configuração externa)

#### Passo 1 — Configurar webhook secret

```bash
firebase functions:secrets:set MP_WEBHOOK_SECRET
# Colar a chave de webhook gerada no dashboard MP
```

**CRÍTICO**: Sem `MP_WEBHOOK_SECRET`, o webhook rejeita TUDO com 403.
Referência: `functions/src/index.ts:1260-1267`

```typescript
if (!webhookSecret) {
  logger.error("MP_WEBHOOK_SECRET não configurado. Rejeitando webhook por segurança.");
  response.status(403).send("Forbidden");
  return;
}
```

#### Passo 2 — Registrar URL no dashboard Mercado Pago

1. Acessar [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Suas integrações → selecionar aplicação
3. Menu lateral → Webhooks → Configurar notificações
4. URL: `https://<region>-<your-project>.cloudfunctions.net/receiveWebhook`
5. Eventos: **Payments**
6. Salvar e copiar a chave secreta gerada → usar no Passo 1

#### Passo 3 — Testar

- Usar botão "Enviar notificação de teste" no dashboard MP
- Monitorar: `firebase functions:log --only receiveWebhook`

---

### Task 3: Login Admin

**Workspace**: `ops/` (Firebase Console)

#### Opção A — Cloud Shell (primeira vez, sem admin existente)

No Firebase Console → Cloud Shell:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

const user = await admin.auth().getUserByEmail('seu@email.com');
await admin.auth().setCustomUserClaims(user.uid, { admin: true, role: 'admin' });
console.log('Admin configurado:', user.uid);
```

#### Opção B — Se `auth/invalid-credential` persistir

Verificar no Firebase Console → Authentication → Sign-in method:
- Email/Password está **habilitado**?
- O usuário **existe** na aba Users?
- Se não existir, criar manualmente e repetir Opção A

#### Validação

Após login, o token JWT do usuário terá `admin: true`, liberando acesso ao painel admin.

---

### Ordem de Execução Recomendada

```
1. firebase functions:secrets:set MP_ACCESS_TOKEN      ← Token produção MP
2. firebase functions:secrets:set MP_WEBHOOK_SECRET    ← Chave webhook MP
3. firebase functions:secrets:set JWT_SECRET           ← openssl rand -hex 32
4. Criar functions/.env com WEB_BASE_URL e SENTRY_DSN
5. firebase deploy --only functions
6. Registrar webhook URL no dashboard MP
7. Configurar admin no Firebase Auth (Cloud Shell)
8. Testar compra real (R$1)
```

---

## Visão de Longo Prazo

### Offline/Secure Validation
- Melhoria na validação de QR Code assinado offline.

### Otimizações
- Continuar reduzindo consumo de Firestore (já otimizado com `getDocs` para tickets).

## Decisões de Planejamento

- **Abordagem single-company**: Não será marketplace, simplifica lógica de permissões.
- **Mobile-first**: Experiência mobile deve ser fluida como app nativo.
- **Low-cost Firebase**: Priorizar `getDocs` sobre `onSnapshot` onde possível.

---

**Última atualização**: 2026-04-23
