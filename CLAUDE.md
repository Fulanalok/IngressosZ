# IngressosZ - Documentação e Visão do Projeto

Este arquivo serve como guia de referência para desenvolvedores e IAs que trabalham no IngressosZ. Ele detalha a filosofia, a direção do projeto e as diretrizes técnicas para garantir consistência e eficiência.

## 🚀 Visão Geral

O **IngressosZ** é uma plataforma dedicada de venda e validação de ingressos, projetada para ser utilizada por uma **única empresa** (single-company). O objetivo é oferecer uma experiência premium, segura e extremamente simples tanto para o organizador quanto para o cliente final.

## 🧠 Filosofia do Projeto

- **Simplicidade Dedicada**: O sistema não é um marketplace multi-empresa. Ele é otimizado para os eventos de uma única entidade, o que simplifica a lógica de permissões e a navegação.
- **Eficiência de Custo (Low Firestore Footprint)**: A arquitetura deve priorizar o baixo consumo de recursos do Firebase.
  - Use `getDocs` para dados estáticos ou que mudam pouco (ex: "Meus Ingressos").
  - Use `onSnapshot` criteriosamente (ex: Lista de eventos e Dashboard do Admin) para manter a UX em tempo real onde realmente importa.
- **Interface Responsiva e Premium**: Design mobile-first, com foco em usabilidade em qualquer dispositivo. A experiência no celular deve ser tão fluida quanto em um app nativo.

- **Cor Principal**: Azul Monocromático (Premium Blue).
- **Tipografia**: **Outfit** (Google Fonts).
- **Estética**: Glassmorphism (`glass-card`), bordas arredondadas (`rounded-xl` / `rounded-2xl`), sombras suaves e textos com gradiente (`blue-gradient-text`).
- **Diretriz**: Utilizar a paleta de azuis definida em `index.css` para criar profundidade e um visual de SaaS moderno. Evite cores vibrantes fora da escala de azul, exceto para alertas críticos.

## 🧭 Roadmap e Futuro

O que queremos que o IngressosZ se torne:

- **Profissionalismo na Entrega**: Geração de ingressos em PDF e e-mails transacionais em HTML premium. ✅ Concluído.
- **Dashboard de Gestão**: Painel do organizador com métricas de vendas em tempo real. ✅ Concluído.
- **Validação Offline/Segura**: Aperfeiçoamento da validação de QR Code assinado.

## 🚩 Pendências e Próximos Passos (Abril 2026)

### Alta Prioridade — Validação em Produção

- [ ] **Testar fluxo de pagamento end-to-end**: MP_ACCESS_TOKEN configurado, Functions deployadas com `getFirestore()`. Precisa validar compra com cartão e PIX em produção.
- [ ] **Configurar Webhook no Mercado Pago**: A URL `receiveWebhook` precisa ser registrada no painel do MP para que pagamentos aprovados gerem ingressos automaticamente.
  - URL: `https://<region>-<your-project>.cloudfunctions.net/receiveWebhook`
- [ ] **Login (auth/invalid-credential)**: Validar credenciais de usuário admin no Firebase Console.

### Infraestrutura / Dev

- [x] **CORS para desenvolvimento local**: Regex aceita qualquer `localhost:*`.
- [x] **WEB_BASE_URL**: Configurado em `functions/.env.<your-firebase-project-id>`.
- [x] **Firebase Admin SDK v13**: Migrado de `admin.firestore()` para `getFirestore()`.

### UI/UX & Funcionalidades

- [ ] **Checkout PIX**: Validar QR Code Base64 no modal após pagamento aprovado via webhook.
- [ ] **PWA icon**: `pwa-192.png` ausente no build — erro no console (não crítico).
- [ ] **App Check**: Habilitar em produção (Auth, Firestore, Functions, Storage) para segurança adicional.

## ✅ Concluído

### Funcionalidades Principais

- [x] **UI Premium Blue completa**: Home, Eventos, Compra, Meus Ingressos, Validador, Admin.
- [x] **Checkout Mercado Pago**: Preferência gerada no backend (callable + endpoint público).
- [x] **Webhook com verificação HMAC**: `receiveWebhook` valida assinatura do MP.
- [x] **Emissão de tickets com QR Code assinado**: JWT + Firestore.
- [x] **Validador presencial**: Endpoint HTTP autenticado + UI com scanner.
- [x] **Painel Admin**: CRUD de eventos, inventário por tipo, modal com aviso de formulário não salvo.
- [x] **Dashboard do Organizador**: Métricas em tempo real (receita, ingressos, check-ins, gráficos).
- [x] **E-mails transacionais Premium Blue**: Template HTML azulado via SMTP.
- [x] **PDF de ingresso redesenhado**: QR Code azul, estética de ticket, Blob URL (sem popup blocker).
- [x] **Proteção duplo clique no checkout**: Gate por `paymentStatus === "processing"`.
- [x] **Aviso de formulário não salvo**: `isDirty` state no EventForm + confirmação ao fechar.
- [x] **Páginas legais**: Termos de Uso (`/termos`) e Política de Privacidade (`/privacidade`) com LGPD.
- [x] **Upload e otimização de imagens**: Storage + Cloud Function `optimizeImage`.
- [x] **Observabilidade**: Sentry (frontend e backend).

### Qualidade de Código

- [x] **Limpeza de arquivos `.js` duplicados**: Removidos 72 artefatos de compilação TS de `src/`.
- [x] **286 testes passando**: Vitest + Testing Library cobrindo todos os componentes críticos.
  - `EventCard`, `Navbar`, `AttendeeList`, `TicketPurchase`, `ValidatorPage`, `AdminPage`
  - `AdminDashboard`, `SetAdminRole`, `ScannerSection`, `ValidationResult`, `ValidatorForm`
- [x] **Firebase Admin SDK v13**: `admin.firestore()` → `getFirestore()` em todas as Functions.
- [x] **Dependências atualizadas**: Minor/patch de todos os pacotes (tailwindcss 4.2, firebase 12.11, vite 7.3, etc.).

## 🛠️ Diretrizes de Desenvolvimento

Use o Claude Sonet para: implementação de código, perguntas gerai, análise de dado e resumo de documentos.
Use o Claude Opus para: decisões complexas de arquitetura, escrita mais refinada e diagnóstico critico de bugs.
Use o Claude Haiku para: respostas rápidas, demandas do dia a dia e tarefas simples.

### Stack Técnica

- **Frontend**: React 19, Vite 7, TypeScript, Tailwind CSS v4.
- **Roteamento**: React Router v7.
- **Dados**: TanStack Query v5 + Firebase Firestore.
- **Backend**: Firebase Functions v2 (Node.js 24).

### Padrões de Código

- **Lógica e UI**: Mantenha a lógica complexa de dados em custom hooks ou serviços. Componentes devem se focar em renderização e UI.
- **Estilização**: Use apenas Tailwind CSS v4. Evite CSS inline ou bibliotecas de componentes pesadas.
- **Tipagem**: TypeScript rigoroso. Evite `any`.
- **Segurança**: Regras do Firestore e Storage devem ser restritivas. Validação de tickets deve ser feita via HTTPS autenticado nas Functions.
- **Admin SDK**: Sempre usar `getFirestore()` de `firebase-admin/firestore`, não `admin.firestore()`.

### Comandos Úteis

- `npm run dev`: Iniciar o frontend localmente.
- `npm test`: Executar suite de testes (286 passing).
- `firebase deploy --only hosting`: Deploy do frontend.
- `firebase deploy --only functions`: Deploy do backend.
- `firebase functions:log`: Ver logs de runtime em produção.

---

_Este documento é vivo e deve ser atualizado conforme o projeto evolui._

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
