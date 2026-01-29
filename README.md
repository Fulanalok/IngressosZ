# IngressosZ - Plataforma de Eventos e Ingressos

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)

O **IngressosZ** é uma plataforma completa para venda, gerenciamento e validação de ingressos para eventos. O sistema utiliza uma arquitetura moderna serverless com Firebase e um frontend reativo com React.

## 🚀 Funcionalidades Implementadas

### 👤 Usuários e Autenticação
- **Login/Cadastro**: Autenticação via Email/Senha com Firebase Auth.
- **Gestão de Perfil**: Visualização de dados do usuário.
- **Controle de Acesso (RBAC)**:
  - `user`: Usuário padrão (compra ingressos).
  - `validator`: Permissão para validar QR Codes.
  - `organizer`: Permissão para criar e gerenciar eventos.
  - `admin`: Acesso total ao sistema.

### 📅 Gestão de Eventos
- **Listagem de Eventos**: Visualização em grid com filtros por busca, categoria e data.
- **Detalhes do Evento**: Página dedicada com informações, mapa (descritivo) e seleção de ingressos.
- **CRUD de Eventos**: Criação, edição e exclusão de eventos (para Organizadores/Admins).
- **Upload de Imagens**: Integração com Firebase Storage para capas de eventos.

### 🎟️ Compra e Gestão de Ingressos
- **Checkout Transparente**: Integração com Mercado Pago (Webhooks implementados para aprovação automática).
- **Meus Ingressos**: Carteira digital com todos os ingressos comprados.
- **QR Code Seguro**: Geração de QR Codes únicos com token de segurança anti-fraude.
- **Status do Ingresso**: Visualização em tempo real (Válido, Usado, Cancelado).

### 📱 Validação de Ingressos (App do Validador)
- **Scanner de QR Code**: Leitura via câmera do dispositivo.
- **Validação Offline-First**: Verificação rápida de autenticidade.
- **Prevenção de Fraudes**:
  - Verificação de assinatura digital do token.
  - Bloqueio de ingressos já utilizados.
  - Logs de auditoria (quem validou e quando).

### 🛠️ Ferramentas de Desenvolvimento
- **DevPanel**: Painel flutuante para troca rápida de papéis (virar Admin/Validador com um clique).
- **Emuladores Locais**: Configuração robusta para rodar Auth, Firestore, Functions e Storage localmente.
- **Skeletons UI**: Carregamento fluido com skeletons em todas as páginas principais.

---

## 🚧 O Que Falta (Roadmap)

Abaixo estão as funcionalidades planejadas ou necessárias para levar o projeto à produção:

### 🔴 Crítico (Prioridade Alta)
1.  **Serviço de Email**:
    - [ ] Enviar confirmação de compra com os ingressos em anexo (PDF ou Link).
    - [ ] Enviar notificações de eventos cancelados/alterados.
2.  **Segurança de Produção**:
    - [ ] Configurar segredos do Mercado Pago no Firebase Secret Manager (atualmente em `.env`).
    - [ ] Revisar regras de segurança do Firestore para produção (já existem regras básicas).
3.  **URLs de Produção**:
    - [ ] Configurar Webhooks do Mercado Pago para apontar para a URL real do Firebase Functions em produção.

### 🟡 Melhorias (Prioridade Média)
4.  **Relatórios Avançados**:
    - [ ] Dashboard para organizadores verem vendas diárias e receita total.
    - [ ] Exportação de lista de participantes (Guest List).
5.  **Gestão de Mídia**:
    - [ ] Implementar exclusão automática de imagens antigas ao deletar eventos.
    - [ ] Otimização/Compressão de imagens no upload.
6.  **UX/UI**:
    - [ ] Paginação infinita na lista de eventos (atualmente carrega todos).
    - [ ] Filtros avançados (preço, localização geográfica).

### 🟢 Futuro (Baixa Prioridade)
7.  **Social**:
    - [ ] Compartilhamento de eventos.
    - [ ] Sistema de avaliações e comentários.
8.  **App Nativo**:
    - [ ] Converter o validador para PWA instalável ou App React Native.

---

## 💻 Tecnologias

### Frontend (`/ingressosZ`)
- **Core**: React 18, Vite, TypeScript.
- **Estilos**: Tailwind CSS, shadcn/ui.
- **Estado/Data Fetching**: React Query (TanStack Query).
- **Rotas**: React Router DOM v6.
- **Testes**: Vitest, React Testing Library.

### Backend (`/functions`)
- **Core**: Firebase Cloud Functions (Node.js 20).
- **Banco de Dados**: Cloud Firestore (NoSQL).
- **Arquivos**: Cloud Storage.
- **Pagamentos**: SDK Mercado Pago.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js 20+
- Java (para emuladores Firebase)
- Firebase CLI (`npm install -g firebase-tools`)

### Instalação Rápida

1.  **Instalar Dependências (Raiz, Front e Back)**
    ```bash
    npm run install:all
    ```

2.  **Configurar Variáveis**
    - Copie `.env.example` para `ingressosZ/.env.local` e preencha as chaves do Firebase.

3.  **Iniciar Ambiente de Desenvolvimento**
    ```bash
    npm run dev
    ```
    - **Frontend**: `http://localhost:5173`
    - **Emuladores**: `http://localhost:4000`
    - **API Local**: `http://127.0.0.1:5001/...`

---

## 📂 Estrutura de Pastas

```
/
├── functions/              # Backend (Cloud Functions)
│   ├── src/
│   │   ├── index.ts        # Entrypoint (Webhooks, Triggers)
│   │   └── ...
├── ingressosZ/             # Frontend (React)
│   ├── src/
│   │   ├── components/     # Componentes Reutilizáveis (UI, Eventos, Tickets)
│   │   ├── hooks/          # Lógica customizada (useAuth, useEvents)
│   │   ├── pages/          # Rotas da aplicação
│   │   ├── services/       # Comunicação com Firebase/API
│   │   └── ...
├── firestore.rules         # Regras de segurança do Banco
├── storage.rules           # Regras de segurança de Arquivos
└── firebase.json           # Configuração dos Emuladores
```

---

Feito com ❤️ por Lucas Vilhena & Trae AI.
