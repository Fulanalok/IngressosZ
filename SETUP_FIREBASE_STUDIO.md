# 🔥 Setup Firebase Studio (Emulador) - IngressosZ

## 📋 Checklist Pré-Setup

### ✅ Verificar se você tem:

```powershell
# 1. Node.js 22+
node --version  # Deve retornar v22.x.x

# 2. Firebase CLI
firebase --version  # Deve retornar 13.x.x ou superior

# 3. Git (para versionar)
git --version
```

Se não tiver Firebase CLI:
```powershell
npm install -g firebase-tools
```

---

## 🚀 Passo 1: Login no Firebase

```powershell
firebase login
```

Isso abrirá seu navegador para autenticação com sua conta Google.

---

## 🔧 Passo 2: Verificar Configuração do Projeto

### A) Verificar .firebaserc

```powershell
cat .firebaserc
```

**Deve conter:**
```json
{
  "projects": {
    "default": "SEU_PROJECT_ID_AQUI"
  }
}
```

Se não estiver correto, edite e coloque o ID do seu projeto Firebase.

### B) Verificar firebase.json

```powershell
cat firebase.json
```

Deve ter configurações de:
- ✅ Firestore
- ✅ Functions
- ✅ Emulators
- ✅ Hosting (opcional)

---

## 📦 Passo 3: Instalar Dependências

### Backend (Functions)

```powershell
cd functions
npm install
cd ..
```

### Frontend

```powershell
cd ingressosZ
npm install
cd ..
```

---

## ⚙️ Passo 4: Configurar Variáveis de Ambiente

### A) Backend (.env das Functions)

```powershell
cd functions
Copy-Item .env.example .env
notepad .env
```

**Preencha:**
```env
# Mercado Pago (use TEST para desenvolvimento)
MERCADOPAGO_ACCESS_TOKEN=TEST-seu-token-aqui

# CORS (permite localhost)
ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Webhook (deixe vazio por enquanto)
MP_WEBHOOK_URL=
```

**Como obter o token do Mercado Pago:**
1. Acesse: https://www.mercadopago.com.br/developers/panel/credentials
2. Copie o **Access Token de TESTE**
3. Cole em `MERCADOPAGO_ACCESS_TOKEN`

### B) Frontend (.env.local)

```powershell
cd ../ingressosZ
Copy-Item .env.example .env.local
notepad .env.local
```

**Preencha com suas credenciais do Firebase:**
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Como obter as credenciais:**
1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto
3. Clique no ícone de engrenagem ⚙️ > Configurações do projeto
4. Role até "Seus aplicativos"
5. Se não tiver app web, clique em "Adicionar app" > Web
6. Copie as configurações

---

## 🎮 Passo 5: Iniciar Firebase Emulator (Studio)

### Em um terminal:

```powershell
# Volte para a raiz do projeto
cd ..

# Inicie o emulador
firebase emulators:start
```

**O que será iniciado:**
- 🔥 **Firestore** → http://localhost:8080
- ⚡ **Functions** → http://localhost:5001
- 🎨 **Emulator UI (Studio)** → http://localhost:4000
- 🔐 **Auth** → http://localhost:9099

### ✅ Verificar se está funcionando:

Abra o navegador em: **http://localhost:4000**

Você deve ver o **Firebase Emulator Suite** (Studio) com:
- Firestore Database (vazio)
- Authentication (sem usuários)
- Functions (2 functions: mercadoPagoCreatePreference, mercadoPagoWebhook)

---

## 🌐 Passo 6: Iniciar Frontend

### Em OUTRO terminal (mantenha o emulador rodando):

```powershell
cd ingressosZ
npm run dev
```

Acesse: **http://localhost:5173**

---

## 🧪 Passo 7: Testar o Sistema

### 1. Criar Conta

1. Acesse http://localhost:5173
2. Clique em "Cadastrar"
3. Crie uma conta com email/senha
4. ✅ Verifique no Firebase Studio (Auth) se o usuário foi criado

### 2. Criar Eventos de Teste

Execute no console do navegador (F12):

```javascript
// Isso criará eventos de teste no Firestore
// (implemente no DevPanel ou rode direto no console)
```

Ou use o **DevPanel** (se disponível no seu projeto).

### 3. Testar Compra (Modo Dev)

1. Acesse "Eventos"
2. Selecione um evento
3. Clique em "Comprar Ingresso"
4. Escolha o tipo (standard/vip/premium)
5. ✅ Em modo dev, se o Mercado Pago falhar, tickets são criados automaticamente

### 4. Verificar no Firebase Studio

- Vá em **Firestore**
- Verifique as collections:
  - `orders` → deve ter um pedido
  - `tickets` → deve ter os ingressos criados

---

## 🔍 O Que Verificar no Firebase Studio

### ✅ Collections do Firestore

#### 1. **events**
```javascript
{
  title: "Nome do Evento",
  description: "Descrição",
  date: Timestamp,
  location: "Local",
  imageUrl: "URL",
  organizerId: "userId",
  ticketTypes: {
    standard: { price: 50, available: 100 },
    vip: { price: 150, available: 50 },
    premium: { price: 300, available: 20 }
  }
}
```

#### 2. **orders**
```javascript
{
  userId: "user123",
  userEmail: "user@example.com",
  eventId: "event123",
  ticketType: "standard",
  quantity: 2,
  status: "pending" | "approved" | "rejected",
  provider: "mercadopago",
  preferenceId: "MP-pref-id",
  createdAt: Timestamp
}
```

#### 3. **tickets**
```javascript
{
  userId: "user123",
  eventId: "event123",
  ticketType: "standard",
  quantity: 1,
  purchaseDate: Timestamp,
  paymentId: "MP-payment-id",
  provider: "mercadopago",
  status: "active" | "used" | "cancelled",
  qrCode: "TICKET-1234567890-abc123",
  price: 50
}
```

### ✅ Usuários no Authentication

Deve aparecer os usuários cadastrados com:
- Email
- UID
- Data de criação

### ✅ Functions Logs

No Firebase Studio, vá em **Logs** e verifique:
- Chamadas às functions
- Erros (se houver)
- Status codes (200, 400, etc)

---

## 🐛 Troubleshooting

### Problema 1: "Functions not found"

```powershell
cd functions
npm run build
```

### Problema 2: "EADDRINUSE" (porta em uso)

Mude as portas em `firebase.json`:
```json
"emulators": {
  "functions": {
    "port": 5002  // Mude de 5001 para 5002
  }
}
```

### Problema 3: Frontend não conecta ao Firestore

Verifique `firebaseConfig.ts` e adicione:
```typescript
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### Problema 4: "MERCADOPAGO_ACCESS_TOKEN is not defined"

Verifique se o arquivo `functions/.env` existe e tem o token correto.

---

## 📝 O Que Falta Verificar

### ✅ Checklist Completo

- [ ] Firebase CLI instalado e logado
- [ ] Projeto Firebase configurado corretamente
- [ ] `.firebaserc` com o ID do projeto correto
- [ ] `functions/.env` configurado com token do Mercado Pago
- [ ] `ingressosZ/.env.local` configurado com credenciais Firebase
- [ ] Dependencies instaladas (functions + frontend)
- [ ] Emulator rodando (porta 4000)
- [ ] Frontend rodando (porta 5173)
- [ ] Usuário criado no Auth
- [ ] Eventos criados no Firestore
- [ ] Compra testada e tickets criados
- [ ] QR codes gerados corretamente

---

## 🚀 Próximos Passos

Após verificar tudo localmente:

### 1. Deploy para Produção

```powershell
# Build do frontend
cd ingressosZ
npm run build

# Deploy completo
cd ..
firebase deploy
```

### 2. Configurar Webhook do Mercado Pago

1. Deploy das functions primeiro
2. Obtenha a URL: `https://us-central1-SEU_PROJETO.cloudfunctions.net/mercadoPagoWebhook`
3. Configure no painel do Mercado Pago
4. Atualize `functions/.env` com `MP_WEBHOOK_URL`
5. Deploy novamente

### 3. Trocar Credenciais para Produção

- Mercado Pago: Token de PRODUÇÃO
- Firebase: Já configurado automaticamente

---

## 📚 Documentação Útil

- Firebase Emulator: https://firebase.google.com/docs/emulator-suite
- Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs
- React + Vite: https://vitejs.dev/guide/

---

## 🎉 Resultado Esperado

Após seguir todos os passos:

✅ Firebase Studio rodando em http://localhost:4000
✅ Frontend rodando em http://localhost:5173
✅ Sistema de compra funcionando
✅ Tickets criados no Firestore
✅ QR codes únicos gerados
✅ Autenticação funcionando

Pronto! Agora você pode desenvolver e testar localmente antes de fazer deploy! 🚀
