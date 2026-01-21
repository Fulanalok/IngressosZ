# ✅ Checklist - Setup IngressosZ para Firebase Studio

## 🎯 Objetivo
Configurar o projeto localmente com Firebase Emulator para testar antes de fazer deploy.

---

## 📝 Checklist de Verificação

### 1️⃣ Pré-requisitos Instalados

- [ ] **Node.js 18+** instalado
  ```powershell
  node --version  # Deve mostrar v18.x.x ou superior
  ```

- [ ] **Firebase CLI** instalado
  ```powershell
  firebase --version  # Deve mostrar 13.x.x ou superior
  ```
  
  ❌ Se não tiver:
  ```powershell
  npm install -g firebase-tools
  ```

- [ ] **Git** instalado (já verificado ✅)

---

### 2️⃣ Autenticação Firebase

- [ ] **Login no Firebase CLI**
  ```powershell
  firebase login
  ```
  
  ✅ Deve abrir navegador e fazer login com sua conta Google

- [ ] **Verificar projeto configurado**
  ```powershell
  firebase projects:list
  ```
  
  ✅ Deve mostrar o projeto "ingressosz"

---

### 3️⃣ Configuração do Mercado Pago

- [ ] **Criar conta de desenvolvedor no Mercado Pago**
  - Acesse: https://www.mercadopago.com.br/developers

- [ ] **Obter Access Token de TESTE**
  - Vá em: https://www.mercadopago.com.br/developers/panel/credentials
  - Copie o **Access Token de TESTE** (não o de produção!)

- [ ] **Configurar functions/.env**
  ```powershell
  cd functions
  notepad .env
  ```
  
  Cole:
  ```env
  MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890-seu-token-aqui
  ALLOWED_ORIGINS=http://localhost:5173
  FRONTEND_URL=http://localhost:5173
  ```

---

### 4️⃣ Configuração do Firebase (Frontend)

- [ ] **Criar projeto no Firebase Console** (se ainda não tiver)
  - Acesse: https://console.firebase.google.com
  - Use o projeto "ingressosz" ou crie um novo

- [ ] **Obter credenciais do Firebase**
  1. Acesse seu projeto no Firebase Console
  2. Clique em ⚙️ (Configurações do projeto)
  3. Role até "Seus aplicativos"
  4. Se não tiver app Web, clique em **"Adicionar app"** → **Web**
  5. Dê um nome (ex: "IngressosZ Web")
  6. **NÃO marque** "Configurar o Firebase Hosting"
  7. Clique em **"Registrar app"**
  8. Copie as configurações

- [ ] **Configurar ingressosZ/.env.local**
  ```powershell
  cd ingressosZ
  notepad .env.local
  ```
  
  Cole (substitua pelos seus valores):
  ```env
  VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
  VITE_FIREBASE_AUTH_DOMAIN=ingressosz.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=ingressosz
  VITE_FIREBASE_STORAGE_BUCKET=ingressosz.appspot.com
  VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
  VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
  ```

---

### 5️⃣ Instalação de Dependências

- [ ] **Backend (Functions)**
  ```powershell
  cd functions
  npm install
  ```
  
  ✅ Deve instalar: firebase-admin, firebase-functions, mercadopago, etc.

- [ ] **Frontend**
  ```powershell
  cd ../ingressosZ
  npm install
  ```
  
  ✅ Deve instalar: react, vite, tailwindcss, firebase, etc.

---

### 6️⃣ Compilação

- [ ] **Compilar Functions**
  ```powershell
  cd ../functions
  npm run build
  ```
  
  ✅ Deve criar pasta `lib/` com arquivos .js

- [ ] **Testar build do Frontend**
  ```powershell
  cd ../ingressosZ
  npm run build
  ```
  
  ✅ Deve criar pasta `dist/`

---

### 7️⃣ Iniciar Ambiente Local

#### Terminal 1: Firebase Emulator

- [ ] **Iniciar emulador**
  ```powershell
  cd c:/Users/LucasVilhena/atividades/IngressosZ-main/IngressosZ-main
  firebase emulators:start
  ```
  
  ✅ Deve mostrar:
  ```
  ┌─────────────┬────────────────┬─────────────────────────────┐
  │ Emulator    │ Host:Port      │ View in Emulator UI         │
  ├─────────────┼────────────────┼─────────────────────────────┤
  │ Auth        │ localhost:9099 │ http://localhost:4000/auth  │
  │ Functions   │ localhost:5001 │ http://localhost:4000/...   │
  │ Firestore   │ localhost:8080 │ http://localhost:4000/...   │
  └─────────────┴────────────────┴─────────────────────────────┘
  ```

- [ ] **Verificar Emulator UI**
  - Abra: http://localhost:4000
  - ✅ Deve mostrar Firebase Emulator Suite

#### Terminal 2: Frontend

- [ ] **Iniciar dev server**
  ```powershell
  cd c:/Users/LucasVilhena/atividades/IngressosZ-main/IngressosZ-main/ingressosZ
  npm run dev
  ```
  
  ✅ Deve mostrar:
  ```
  VITE v7.x.x ready in XXX ms
  ➜ Local:   http://localhost:5173/
  ```

---

### 8️⃣ Teste do Sistema

- [ ] **Acessar aplicação**
  - Abra: http://localhost:5173

- [ ] **Criar conta de teste**
  1. Clique em "Cadastrar"
  2. Use: teste@example.com / senha123
  3. ✅ Verificar no Emulator UI (Auth) se usuário foi criado

- [ ] **Criar eventos de teste** (opcional)
  - Use o DevPanel (se disponível)
  - Ou crie manualmente no Firestore Emulator

- [ ] **Testar compra**
  1. Selecione um evento
  2. Clique em "Comprar Ingresso"
  3. Escolha tipo (standard/vip/premium)
  4. ✅ Em modo dev, tickets são criados automaticamente

- [ ] **Verificar no Firestore Emulator**
  - Abra: http://localhost:4000/firestore
  - ✅ Deve ter collections: `events`, `orders`, `tickets`

---

### 9️⃣ Deploy para Produção (quando pronto)

- [ ] **Build do frontend**
  ```powershell
  cd ingressosZ
  npm run build
  ```

- [ ] **Deploy completo**
  ```powershell
  cd ..
  firebase deploy
  ```
  
  ✅ Isso vai fazer deploy de:
  - Functions
  - Firestore Rules
  - Hosting (frontend)

- [ ] **Trocar para credenciais de PRODUÇÃO**
  - Mercado Pago: Token de produção
  - Configurar webhook: https://us-central1-ingressosz.cloudfunctions.net/mercadoPagoWebhook

---

## 🚨 Problemas Comuns

### ❌ "EADDRINUSE" - Porta em uso

**Solução:**
```powershell
# Ver o que está usando a porta
netstat -ano | findstr :5001

# Matar o processo (substitua PID)
taskkill /F /PID 12345
```

### ❌ Functions não aparecem no Emulator

**Solução:**
```powershell
cd functions
npm run build
firebase emulators:start
```

### ❌ Frontend não conecta ao Firestore

**Verifique:** `ingressosZ/src/firebaseConfig.ts`

Deve ter:
```typescript
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### ❌ "MERCADOPAGO_ACCESS_TOKEN is not defined"

**Solução:**
- Verifique se `functions/.env` existe
- Verifique se o token está correto
- Reinicie o emulator

---

## 📊 Estado Final Esperado

### ✅ O que deve estar rodando:

1. **Firebase Emulator Suite** → http://localhost:4000
   - Auth: 9099
   - Functions: 5001
   - Firestore: 8080

2. **Frontend (Vite)** → http://localhost:5173

3. **2 Cloud Functions disponíveis:**
   - `mercadoPagoCreatePreference`
   - `mercadoPagoWebhook`

### ✅ O que deve existir no Firestore:

- `events` → Eventos criados
- `orders` → Pedidos dos usuários
- `tickets` → Ingressos emitidos (com QR codes)

### ✅ O que deve funcionar:

- ✅ Cadastro/Login de usuários
- ✅ Listagem de eventos
- ✅ Compra de ingressos (Mercado Pago ou dev mode)
- ✅ Geração de QR codes únicos
- ✅ Validação de ingressos (ValidatorPage)

---

## 🎉 Resultado Final

Se tudo estiver ✅:

**Você tem um sistema completo de venda de ingressos rodando localmente!**

- 🎫 Venda de ingressos com Mercado Pago
- 📱 QR codes únicos para validação
- 🔐 Autenticação segura
- 💳 3 tipos de ingresso (standard, vip, premium)
- 📊 Dashboard de validação

**Pronto para testar e desenvolver antes de fazer deploy! 🚀**

---

## 📚 Documentação Completa

- **SETUP_FIREBASE_STUDIO.md** → Guia detalhado passo a passo
- **README.md** → Visão geral do projeto
- **functions/README.md** → Documentação das Cloud Functions
- **docs/payment-providers/MERCADOPAGO_SETUP.md** → Configuração e testes de pagamentos (Mercado Pago)
- **QUICK_START.md** → Setup rápido (backend + frontend)

---

## 🆘 Precisa de Ajuda?

Se encontrar algum problema, verifique:

1. Logs do emulator no terminal
2. Console do navegador (F12)
3. Logs do Emulator UI (tab "Logs")

**Boa sorte! 🍀**
