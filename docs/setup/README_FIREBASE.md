# 🔧 Configuração do Firebase Authentication

## ❌ Problema Identificado

O erro `auth/configuration-not-found` indica que há problemas na configuração do Firebase Authentication.

## 🛠️ Soluções

### 1. Verificar no Firebase Console

Acesse: https://console.firebase.google.com/project/ingressosz

#### ✅ Authentication

1. No menu lateral, clique em **Authentication**
2. Vá para a aba **Sign-in method**
3. Habilite **Email/Password**:
   - Clique em "Email/Password"
   - Ative "Enable"
   - Clique em "Save"

#### ✅ Domínios Autorizados

1. Ainda em **Authentication > Settings**
2. Na seção **Authorized domains**
3. Certifique-se que estes domínios estão listados:
   - `localhost`
   - `127.0.0.1`
   - `ingressosz.firebaseapp.com`

### 2. Verificar as Configurações do Projeto

1. No Firebase Console, vá em **Project Settings** (ícone de engrenagem)
2. Na aba **General**, verifique se:
   - Project ID: `ingressosz`
   - Web API Key está presente

### 3. Verificar as Regras do Firestore

No menu **Firestore Database > Rules**, certifique-se que as regras permitem operações:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura/escrita para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Teste o Debug

Acesse a homepage da aplicação e verifique as informações do componente Firebase Debug.

### 5. Se o problema persistir

Tente recriar a configuração:

1. Baixe novamente a configuração do Firebase Console
2. Substitua o conteúdo de `firebaseConfig.ts`

## 🚀 Após configurar

1. Reinicie o servidor de desenvolvimento: `npm run dev`
2. Teste criar uma nova conta
3. Verifique se o erro foi resolvido

## 📞 Precisa de ajuda?

Se o erro persistir, compartilhe:

1. Screenshot das configurações do Firebase Authentication
2. Saída do componente Firebase Debug
3. Logs do console do navegador
