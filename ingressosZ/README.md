# IngressosZ - Plataforma de Venda de Ingressos

## 📖 Sobre o Projeto

O IngressosZ é uma plataforma web para a venda de ingressos online. A aplicação é construída com um frontend em React e um backend utilizando Firebase Cloud Functions.

## ✨ Features

*   Autenticação de usuários.
*   Listagem de eventos.
*   Compra de ingressos com checkout de pagamento (Mercado Pago).
*   Visualização de ingressos comprados em "Meus Ingressos".
*   Validação de ingressos por QR code.
*   Painel de administração para gerenciamento de eventos.

## 🛠️ Tecnologias Utilizadas

### Frontend (`/ingressosZ`)

*   **Framework:** [React](https://reactjs.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Roteamento:** [React Router](https://reactrouter.com/)
*   **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
*   **Componentes:** [Radix UI](https://www.radix-ui.com/)
*   **Cliente Firebase:** [Firebase](https://firebase.google.com/)
*   **Testes:** [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/)
*   **Linting:** [ESLint](https://eslint.org/)

### Backend (`/functions`)

*   **Plataforma:** [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
*   **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
*   **Banco de Dados:** [Cloud Firestore](https://firebase.google.com/docs/firestore)
*   **Autenticação:** [Firebase Authentication](https://firebase.google.com/docs/auth)

## 🚀 Começando

### Pré-requisitos

*   [Node.js](https://nodejs.org/) (versão 20 ou superior)
*   [Firebase CLI](https://firebase.google.com/docs/cli)

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd <NOME_DA_PASTA_DO_PROJETO>
    ```

2.  **Configure o Frontend:**
    ```bash
    cd ingressosZ
    npm install
    cp .env.example .env.local
    ```
    *   Preencha as variáveis de ambiente em `.env.local` com as configurações do seu projeto Firebase.

3.  **Configure o Backend:**
    ```bash
    cd ../functions
    npm install
    ```

### Rodando a Aplicação

1.  **Inicie o Frontend:**
    ```bash
    cd ../ingressosZ
    npm run dev
    ```
    *   A aplicação estará disponível em `http://localhost:5173`.

2.  **Inicie o Backend (com emuladores):**
    ```bash
    cd ../functions
    npm run serve
    ```
    *   Os emuladores do Firebase serão iniciados, permitindo o desenvolvimento local do backend.

## 📂 Estrutura do Projeto

```
.
├── functions/              # Código do Backend (Firebase Cloud Functions)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── ingressosZ/             # Código do Frontend (React)
    ├── public/
    ├── src/
    │   ├── components/     # Componentes React
    │   ├── hooks/          # Hooks customizados
    │   ├── pages/          # Páginas da aplicação
    │   ├── services/       # Módulos de serviço (chamadas de API)
    │   └── ...
    ├── package.json
    └── vite.config.ts
```

## 📜 Scripts Disponíveis

### Frontend (`/ingressosZ`)

*   `npm run dev`: Inicia o servidor de desenvolvimento.
*   `npm run build`: Gera a build de produção.
*   `npm run test`: Executa os testes.
*   `npm run lint`: Executa o linter.

### Backend (`/functions`)

*   `npm run build`: Compila o código TypeScript.
*   `npm run serve`: Inicia os emuladores do Firebase.
*   `npm run deploy`: Faz o deploy das functions para o Firebase.
*   `npm run logs`: Exibe os logs das functions.

## ✅ Testes

Para rodar os testes do frontend, execute o seguinte comando no diretório `/ingressosZ`:

```bash
npm test
```

## ☁️ Deploy

### Frontend

O deploy do frontend é feito para o Firebase Hosting.

```bash
cd ingressosZ
npm run build
firebase deploy --only hosting
```

### Backend

O deploy do backend é feito para o Firebase Cloud Functions.

```bash
cd functions
npm run build
firebase deploy --only functions
```
