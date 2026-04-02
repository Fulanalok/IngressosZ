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

- **Profissionalismo na Entrega**: Geração de ingressos em PDF e e-mails transacionais em HTML premium.
- **Dashboard de Gestão**: Painel do organizador com métricas de vendas e checkout simplificado.
- **Validação Offline/Segura**: Aperfeiçoamento da validação de QR Code assinado.

## 🚩 Pendências e Próximos Passos (Abril 2026)

### Alta Prioridade (Bugs de Produção)
- [ ] **Configurar MP_ACCESS_TOKEN**: As funções de pagamento estão retornando Erro 500 em produção por falta de Secret.
  - Comando: `firebase functions:secrets:set MP_ACCESS_TOKEN`
  - Após configurar, redeploy: `firebase deploy --only functions`
- [ ] **Login (auth/invalid-credential)**: Validar credenciais no Firebase Console.
- [ ] **Redirecionamento de Sucesso**: Configurar `WEB_BASE_URL` nas Functions para que o Mercado Pago retorne para o domínio correto.
  - Comando: `firebase functions:config:set app.web_base_url="https://ingressosz.web.app"`

### Infraestrutura / Dev
- [x] **CORS para desenvolvimento local**: `functions/src/index.ts` atualizado para aceitar qualquer origem `localhost:*` (fix: Vite pode iniciar em portas diferentes de 5173).

### UI/UX & Funcionalidades
- [ ] **Dashboard do Organizador**: Aplicar o novo tema Premium Blue nas páginas administrativas.
- [ ] **Checkout PIX**: Validar a exibição do QR Code Base64 no modal após a correção da Function.
- [ ] **Emails Transacionais**: Implementar templates HTML azulados para confirmação de compra.

## ✅ Concluído

### Qualidade de Código
- [x] **Limpeza de arquivos `.js` duplicados**: Removidos 72 artefatos de compilação TS de `src/`. Protegido com `src/**/*.js` no `.gitignore`.
- [x] **Testes de componentes críticos**: 53+ testes implementados com Vitest + Testing Library cobrindo:
  - `EventCard` — renderização, datas, navegação, estados de loading/erro
  - `Navbar` — visibilidade de links por role (user/organizer/validator), logout
  - `AttendeeList` — listagem, validação de ingresso, reembolso com confirmação
  - `TicketPurchase` — seleção de tipo, PIX, cartão, exibição de QR Code
  - `ValidatorPage` — scanner, histórico, badges de status, controle de acesso
  - `AdminPage` — CRUD de eventos, inventário, modal de criação

## 🛠️ Diretrizes de Desenvolvimento

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

### Comandos Úteis

- `npm run dev`: Iniciar o frontend localmente.
- `npm test`: Executar suite de testes.
- `firebase deploy --only hosting`: Deploy do frontend.
- `firebase deploy --only functions`: Deploy do backend.

---

_Este documento é vivo e deve ser atualizado conforme o projeto evolui._
