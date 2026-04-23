# ops/ - Operações e Deploy

Documentação de deploy, monitoramento e operações do IngressosZ.

## Deploy

### Frontend (Hosting)

```bash
# Build otimizado
cd ingressosZ
npm run build

# Deploy para produção
firebase deploy --only hosting

# Deploy com preview (staging)
firebase hosting:channel:deploy staging
```

**URL de produção**: `https://ingressosz.com` (configurado em `.firebaserc` e `firebase.json`)

---

### Backend (Functions)

```bash
# Build TypeScript
cd functions
npm run build

# Deploy todas as functions
firebase deploy --only functions

# Deploy seletivo (mais rápido)
firebase deploy --only functions:receiveWebhook,functions:createPreference

# Deploy com secrets atualizados
firebase functions:config:set mercadopago.access_token="NEW_TOKEN"
firebase deploy --only functions
```

**Region**: `southamerica-east1` (São Paulo) — configurado em `functions/src/index.ts`

---

### Firestore Rules

```bash
# Deploy regras de segurança
firebase deploy --only firestore:rules

# Testar regras localmente (emulator)
firebase emulators:start --only firestore
```

**Arquivo**: `firestore.rules`

**Principais regras**:
- `events`: Leitura pública, escrita apenas admin
- `tickets`: Leitura apenas dono ou admin, escrita apenas via Functions
- `purchases`: Leitura apenas dono ou admin

---

### Storage Rules

```bash
# Deploy regras de Storage
firebase deploy --only storage

# Arquivo: storage.rules
```

**Principais regras**:
- Upload de imagens de eventos: apenas admin
- Download público (imagens de eventos)

---

## Monitoramento

### Firebase Console

**URL**: https://console.firebase.google.com/project/<your-firebase-project-id>

#### Performance Monitoring

- **Métricas**: Page load, API latency, Firestore queries
- **Acesso**: Firebase Console → Performance

#### Crashlytics (Sentry)

- **Frontend**: Integrado via `@sentry/react`
- **PII stripping**: Configurado para remover dados sensíveis (emails, CPFs)
- **Acesso**: https://sentry.io/organizations/ingressosz/

#### Functions Logs

```bash
# Ver logs em tempo real
firebase functions:log

# Filtrar por function específica
firebase functions:log --only receiveWebhook

# Ver logs no console
# https://console.cloud.google.com/logs (projeto: <your-firebase-project-id>)
```

---

## Ambientes

### Produção

- **Frontend**: `https://ingressosz.com`
- **Firestore**: `<your-firebase-project-id>` (default database)
- **Functions**: `southamerica-east1`
- **Mercado Pago**: Credenciais de produção (`MP_ACCESS_TOKEN`)

### Desenvolvimento

- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Emulators**: Firebase Emulator Suite
  ```bash
  firebase emulators:start
  ```
  - Auth: `localhost:9099`
  - Firestore: `localhost:8080`
  - Functions: `localhost:5001`
  - Hosting: `localhost:5000`

**Configuração**: `firebase.json` → `emulators`

---

## CI/CD

### Workflow Atual (Manual)

1. **Desenvolvimento local**: `npm run dev` + Firebase Emulators
2. **Testes**: `npm test` (286 testes passando)
3. **Build**: `npm run build` (Vite)
4. **Deploy**: `firebase deploy --only hosting,functions`

### GitHub Actions (Futuro)

Pipeline sugerido:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 24
      - run: cd ingressosZ && npm ci && npm test && npm run build
      - run: cd functions && npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
```

---

## Backup e Recuperação

### Firestore Backup

**Automatizado via Firebase**:
- Backups diários automáticos (últimos 30 dias)
- Acesso: Firebase Console → Firestore → Backups

**Manual**:
```bash
# Exportar coleção específica
firebase firestore:export gs://ingressosz-backup/events
```

### Recuperação de Disaster

1. **Frontend**: Re-deploy via `firebase deploy --only hosting`
2. **Functions**: Re-deploy via `firebase deploy --only functions`
3. **Firestore**: Restore de backup via Console
4. **Mercado Pago Webhook**: Re-configurar URL no dashboard MP

---

## Configuração de Domínio

### DNS (Cloudflare/GoDaddy)

```
A     ingressosz.com          199.36.158.100
A     www.ingressosz.com      199.36.158.100
```

### Firebase Hosting

```bash
# Adicionar domínio customizado
firebase hosting:channel:create production
firebase hosting:sites:create ingressosz
```

**SSL**: Automático via Firebase Hosting (Let's Encrypt)

---

## Checklist de Deploy

### Pré-Deploy

- [ ] Testes passando (`npm test`)
- [ ] Build sem erros (`npm run build`)
- [ ] Secrets configurados (`firebase functions:config:get`)
- [ ] Firestore rules atualizadas
- [ ] Webhook URL configurada no Mercado Pago

### Pós-Deploy

- [ ] Verificar URL de produção (`https://ingressosz.com`)
- [ ] Testar fluxo de compra end-to-end (staging primeiro)
- [ ] Verificar logs de Functions (`firebase functions:log`)
- [ ] Verificar Sentry (sem crashes críticos)
- [ ] Confirmar webhook recebendo notificações MP

---

## Rollback

### Frontend

```bash
# Listar versões anteriores
firebase hosting:channel:list

# Rollback para versão anterior
firebase hosting:rollback
```

### Functions

```bash
# Não há rollback automático — re-deploy versão anterior
git checkout <commit-anterior>
firebase deploy --only functions
```

---

## Custos Estimados (Firebase)

### Firestore

- **Reads**: ~10k/dia → $0.06/dia → ~$2/mês
- **Writes**: ~2k/dia → $0.06/dia → ~$2/mês
- **Storage**: ~500MB → $0.10/mês

### Functions

- **Invocations**: ~5k/dia → Incluído no free tier
- **Compute time**: ~100GB-s/mês → $0.40/mês

### Hosting

- **Bandwidth**: ~10GB/mês → Incluído no free tier
- **Storage**: ~500MB → Incluído no free tier

**Total estimado**: ~$5/mês (Spark Plan → Blaze Plan)

---

## Contatos de Emergência

- **Mercado Pago Support**: https://www.mercadopago.com.br/developers/pt/support
- **Firebase Support**: https://firebase.google.com/support
- **Sentry Support**: https://sentry.io/support

---

**Última atualização**: 2026-04-23
