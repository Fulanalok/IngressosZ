# IngressosZ - Plataforma Completa para Eventos e Ingressos

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)
![Tests](https://img.shields.io/badge/Tests-100%25_Passing-brightgreen)

**IngressosZ** é uma plataforma robusta para venda, gerenciamento e validação de ingressos para eventos, construída com uma arquitetura moderna serverless usando Firebase e um frontend reativo com React e Vite.

---

## 🏛️ Arquitetura e Filosofia

O projeto é dividido em dois pacotes principais (Monorepo):

*   **[`/ingressosZ`](./ingressosZ/README.md) (Frontend):** SPA em React 19 + Vite 7 + TypeScript. Interface do usuário, vitrine, gestão e validação.
*   **[`/functions`](./functions/API.md) (Backend):** Firebase Cloud Functions v2 (Node.js 20). Lógica de negócios, pagamentos e segurança.

A filosofia é manter uma separação clara de responsabilidades, garantindo escalabilidade e Developer Experience (DX).

---

## ✨ Funcionalidades Implementadas

### 👤 Usuários e Autenticação
- **Login/Cadastro**: Autenticação segura via Firebase Auth.
- **RBAC (Controle de Acesso)**: Papéis `user`, `validator` e `admin` bem definidos.
- **Segurança**: Regras de Firestore estritas para proteção de dados.

### 📅 Gestão de Eventos
- **Vitrine**: Busca, filtros e scroll infinito.
- **Admin**: CRUD completo de eventos com upload de imagens.
- **SEO**: Meta tags dinâmicas (JSON-LD) para melhor indexação.

### 🎟️ Compra e Gestão
- **Pagamento**: Integração transparente com Mercado Pago (Checkout Pro).
- **Carteira Digital**: Visualização de ingressos comprados.
- **QR Code Seguro**: Assinatura JWT para prevenção de fraudes.

### 📱 Validação (App)
- **Scanner**: Leitura rápida via câmera (`qr-scanner`).
- **Offline-First**: Validação de autenticidade mesmo sem internet.

---

## 🚀 Guia de Instalação Rápida

### Pré-requisitos
- Node.js 20+
- Java JDK (para Emuladores Firebase)
- Firebase CLI (`npm i -g firebase-tools`)

### 1. Instalação
```bash
# Instala dependências do Frontend e Backend simultaneamente
npm run install:all
```

### 2. Configuração
1.  Vá para `cd ingressosZ`.
2.  Copie `.env.example` para `.env.local`.
3.  Preencha com suas chaves do Firebase Console.

### 3. Execução (Ambiente Completo)
```bash
# Na raiz do projeto:
npm run dev
```
Isso iniciará:
*   Frontend: `http://localhost:5173`
*   Emuladores (Auth, DB, Functions): `http://localhost:4000`

---

## 🔐 Segurança e Secrets (Backend)

Para que o backend funcione corretamente (pagamentos, validação segura, emails), você precisa configurar os segredos do Firebase Functions.

1.  Vá para `cd functions`.
2.  Copie `.env.example` para `.env` (apenas desenvolvimento local) ou configure via Firebase CLI:
    ```bash
    firebase functions:secrets:set MP_ACCESS_TOKEN
    firebase functions:secrets:set MP_WEBHOOK_SECRET
    firebase functions:secrets:set JWT_SECRET
    firebase functions:secrets:set SMTP_EMAIL
    firebase functions:secrets:set SMTP_PASSWORD
    ```

**Segurança Implementada:**
*   **Assinatura de Webhook (HMAC-SHA256):** Verifica se as notificações de pagamento realmente vieram do Mercado Pago.
*   **JWT nos Ingressos:** QR Codes agora contêm tokens JWT assinados digitalmente, prevenindo falsificação e permitindo validação offline.
*   **Proteção contra Overselling:** Validação de estoque atômica antes e depois do pagamento.
*   **RBAC Robusto:** Regras de Firestore garantem que usuários só acessem o que devem.

---

## 🧪 Qualidade de Código

| Tipo | Comando | Descrição |
| :--- | :--- | :--- |
| **Unitários** | `cd ingressosZ && npm run test` | Testa componentes e hooks (Vitest). |
| **E2E** | `cd ingressosZ && npm run cypress:open` | Testa fluxos de usuário reais. |
| **Backend** | `cd functions && npm run test` | Testa lógica de negócios (Mocha). |
| **Lint** | `cd ingressosZ && npm run lint` | Verifica estilo de código. |

---

## ❓ Troubleshooting

### Erro: "Java not found" ao rodar emuladores
Certifique-se de que o JDK está instalado e a variável `JAVA_HOME` está configurada corretamente no seu sistema.

### Erro: Permissão negada no Firestore
Verifique se você está logado no Frontend. As regras de segurança (`firestore.rules`) bloqueiam leituras anônimas para a maioria das coleções. Use o **Painel Dev** (flutuante na tela) para simular diferentes papéis de usuário.

### Erro: Portas em uso (EADDRINUSE)
Se os emuladores falharem ao iniciar, pode haver processos presos.
*   Windows: `taskkill /F /IM java.exe` (Cuidado: fecha todos os processos Java).
*   Linux/Mac: `lsof -i :8080` e `kill -9 <PID>`.

---

## 📂 Estrutura do Projeto
```
/
├── functions/              # Backend (Cloud Functions)
│   ├── src/index.ts        # Entrypoint
│   └── API.md              # Documentação da API
├── ingressosZ/             # Frontend (React + Vite)
│   ├── src/                # Código Fonte React
│   └── README.md           # Documentação específica do Frontend
├── firestore.rules         # Regras de segurança globais
├── firebase.json           # Configuração dos Emuladores
└── README.md               # Este arquivo
```

---

Feito com ❤️ por Lucas Vilhena & Trae AI.
