
# IngressosZ - Plataforma Completa para Eventos e Ingressos

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)

**IngressosZ** é uma plataforma robusta para venda, gerenciamento e validação de ingressos para eventos, construída com uma arquitetura moderna serverless usando Firebase e um frontend reativo com React e Vite.

---

## 🏛️ Arquitetura e Filosofia

O projeto é dividido em dois pacotes principais:

*   **`/ingressosZ` (Frontend):** Uma Single Page Application (SPA) construída em React, responsável por toda a interface do usuário, desde a vitrine de eventos até o painel de validação.
*   **`/functions` (Backend):** Um conjunto de Cloud Functions (Node.js) que orquestram a lógica de negócio, como o processamento de pagamentos via webhooks e a gestão de dados seguros.

A filosofia é manter uma separação clara de responsabilidades, garantindo que o projeto seja escalável, manutenível e agradável de se trabalhar (Developer Experience).

---

## ✨ Funcionalidades Implementadas

### 👤 Usuários e Autenticação
- **Login/Cadastro**: Autenticação segura por E-mail/Senha com Firebase Auth.
- **Gerenciamento de Perfil**: Visualização de dados do usuário.
- **Controle de Acesso (RBAC)**:
  - `user`: Usuário padrão (compra ingressos).
  - `validator`: Permissão para validar QR Codes.
  - `admin`: Acesso total ao sistema para gerenciamento.

### 📅 Gestão de Eventos
- **Listagem de Eventos**: Vitrine com busca, filtros e skeletons de carregamento.
- **Detalhes do Evento**: Página dedicada com informações completas e seleção de ingressos.
- **CRUD de Eventos**: Painel para administradores criarem, editarem e excluírem eventos.
- **Upload de Imagens**: Integração com Firebase Storage para as capas dos eventos.

### 🎟️ Compra e Gestão de Ingressos
- **Checkout Transparente**: Integração com Mercado Pago (com Webhooks para confirmação automática).
- **Meus Ingressos**: Carteira digital com todos os ingressos comprados.
- **QR Code Seguro**: Geração de QR Codes únicos com token JWT para prevenir fraudes e uso offline.
- **Status do Ingresso**: Visualização em tempo real (Válido, Usado, Cancelado).

### 📱 Validação de Ingressos (App do Validador)
- **Leitor de QR Code**: Validação rápida usando a câmera do dispositivo.
- **Validação Offline-First**: Checagem de autenticidade do QR Code mesmo sem conexão, graças ao token JWT.
- **Prevenção de Fraudes**:
  - Verificação da assinatura digital do token.
  - Bloqueio de ingressos já utilizados (requer conexão).
  - Logs de auditoria (quem validou e quando).

### 🛠️ Ferramentas de Desenvolvimento
- **Painel Dev**: Um painel flutuante na UI para trocar de papel (role) rapidamente, agilizando testes de permissão.
- **Emuladores Locais**: Configuração completa para rodar Auth, Firestore, Functions e Storage localmente, permitindo desenvolvimento 100% offline.

---

## 🚀 Guia de Instalação e Execução Local

Siga estes passos para configurar e rodar o ambiente de desenvolvimento completo na sua máquina.

### Pré-requisitos
- **Node.js**: Versão 20 ou superior.
- **Java Development Kit (JDK)**: Essencial para rodar os Emuladores do Firebase. Verifique com `java -version`.
- **Firebase CLI**: Execute `npm install -g firebase-tools` para instalar globalmente.

### Passo 1: Instalação das Dependências

O projeto possui um script para instalar as dependências do frontend e do backend de uma só vez.

```bash
# Na raiz do projeto, execute:
npm run install:all
```

### Passo 2: Configuração das Variáveis de Ambiente

As chaves do Firebase para o frontend precisam ser configuradas.

1.  Navegue até a pasta do frontend: `cd ingressosZ`
2.  Copie o arquivo de exemplo: `cp .env.example .env.local`
3.  Abra o arquivo `.env.local` e preencha com as credenciais do seu projeto Firebase (você pode encontrá-las no console do Firebase, nas configurações do seu projeto web).

### Passo 3: Iniciando o Ambiente de Desenvolvimento Completo

O comando `npm run dev` na raiz do projeto foi configurado para iniciar o frontend e os emuladores do Firebase simultaneamente.

```bash
# Na raiz do projeto, execute:
npm run dev
```

Após executar o comando, os seguintes serviços estarão disponíveis:
- **Frontend (Vite)**: `http://localhost:5173`
- **UI dos Emuladores Firebase**: `http://localhost:4000`
- **Endpoint das Cloud Functions (local)**: `http://127.0.0.1:5001/...`

> **Dica:** Use a UI dos Emuladores (`localhost:4000`) para visualizar e manipular os dados no Firestore, checar usuários no Auth e ver logs das Functions.

---

## ✅ Testes e Qualidade de Código

Garantir a confiabilidade é crucial. O projeto possui múltiplas camadas de testes.

### Testes Unitários e de Integração (Vitest)
Testam componentes, hooks e serviços de forma isolada.

```bash
# Dentro da pasta /ingressosZ
npm run test
```

### Testes End-to-End (Cypress)
Simulam a jornada real do usuário no navegador para os fluxos mais críticos.

```bash
# Dentro da pasta /ingressosZ
npm run cypress:open
```

### Testes de Regras de Segurança (Firebase)
Validam que as regras do Firestore (`firestore.rules`) estão protegendo os dados corretamente. Estes testes rodam junto com os testes unitários.

```bash
# Dentro da pasta /ingressosZ
npm run test
```

---

## ☁️ Deploy

### Backend (Cloud Functions)
```bash
cd functions
npm run deploy
```

### Frontend (Firebase Hosting)
```bash
cd ingressosZ
npm run build
firebase deploy --only hosting
```

---

## 📂 Estrutura de Pastas
```
/
├── functions/              # Backend (Cloud Functions)
│   ├── src/index.ts        # Entrypoint das Functions (Webhooks, Triggers)
│   └── ...
├── ingressosZ/             # Frontend (React + Vite)
│   ├── cypress/            # Testes End-to-End
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── hooks/          # Lógica de estado e custom hooks
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── services/       # Comunicação com Firebase/API
│   │   ├── test/           # Testes de regras de segurança
│   │   └── ...
│   └── ...
├── firestore.rules         # Regras de segurança do Banco de Dados
├── storage.rules           # Regras de segurança do Armazenamento
└── firebase.json           # Configuração do Firebase (incluindo Emuladores)
```

---

Feito com ❤️ por Lucas Vilhena & Trae AI.
