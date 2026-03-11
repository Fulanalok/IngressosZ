# IngressosZ - Frontend

Este é o frontend da plataforma IngressosZ, uma Single Page Application (SPA) moderna construída para oferecer uma experiência de usuário fluida na compra, gestão e validação de ingressos.

## 🛠️ Tech Stack

- **Core:** [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/)
- **Linguagem:** TypeScript 5.8
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Gerenciamento de Estado:**
  - **Server State:** [TanStack Query v5](https://tanstack.com/query/latest) (Cache, Revalidação, Scroll Infinito)
  - **Global State:** React Context API (Auth, Theme)
- **Roteamento:** [React Router v7](https://reactrouter.com/)
- **Testes:** Vitest + Testing Library + Cypress
- **Outras Libs Importantes:**
  - `@dr.pogodin/react-helmet`: SEO dinâmico via Helmet
  - `sonner`: Notificações toast
  - `qr-scanner`: Leitura de QR Codes via câmera
  - `qrcode`: Geração de QR Codes

## 📂 Estrutura de Pastas

```
src/
├── components/         # Componentes React reutilizáveis
│   ├── common/         # Componentes genéricos (SEO, ErrorFallback)
│   ├── ui/             # Design System (Button, Card, Input)
│   ├── validator/      # Componentes específicos do validador
│   └── ...
├── context/            # Contextos globais (Auth, Theme)
├── hooks/              # Custom Hooks (Lógica de negócios e Data Fetching)
├── pages/              # Páginas da aplicação (Roteamento)
├── services/           # Camada de integração com Firebase e APIs
├── lib/                # Utilitários gerais
├── types/              # Definições de tipos TypeScript globais
└── test/               # Utilitários de teste e setup
```

## 🚀 Scripts Disponíveis

| Script                 | Descrição                                             |
| :--------------------- | :---------------------------------------------------- |
| `npm run dev`          | Inicia o servidor de desenvolvimento Vite.            |
| `npm run build`        | Compila o projeto para produção.                      |
| `npm run test`         | Executa os testes unitários e de integração (Vitest). |
| `npm run qa`           | Roda lint, typecheck e testes (Check completo).       |
| `npm run cypress:open` | Abre o Cypress para testes E2E.                       |
| `npm run preview`      | Visualiza o build de produção localmente.             |

## 🧪 Padrões de Teste

1.  **Unitários/Integração (Vitest):** Focados em testar hooks (`useAuth`, `useEvents`) e serviços (`firestore.ts`) isoladamente. Componentes complexos são testados simulando interação do usuário (`fireEvent`).
2.  **End-to-End (Cypress):** Testam fluxos críticos como Login, Cadastro e Compra de Ingressos, garantindo que o sistema funcione como um todo.

## 🎨 Design System & UI

Utilizamos componentes encapsulados em `src/components/ui`, construídos com Tailwind CSS. Isso garante consistência visual e facilita a manutenção. O tema (Claro/Escuro) é gerenciado via `ThemeContext` e persistido no LocalStorage.

## 🔌 Integração com Firebase Functions

O frontend se comunica com o backend em `/functions` ou via `VITE_API_URL` para operações críticas:

- **Criação de preferência de pagamento**

  - Implementado no hook [useMercadoPagoCheckout.ts](src/hooks/useMercadoPagoCheckout.ts).
  - Usa a função callable `createPaymentPreference` do Firebase Functions.
  - Se necessário (legado), faz fallback para `${VITE_API_URL}/create-preference`.
  - O ID da preferência retornado é usado para inicializar o fluxo de checkout do Mercado Pago no frontend.

- **Validação de ingressos (Página do Validador)**

  - Implementado no hook [useTicketValidator.ts](src/hooks/validator/useTicketValidator.ts), consumido em [ValidatorPage.tsx](src/pages/ValidatorPage.tsx).
  - Envia o conteúdo do QR Code para a função HTTP `validateTicket` em `/functions/validateTicket`.
  - Inclui o ID Token atual do usuário no header `Authorization: Bearer <ID_TOKEN>`.
  - A resposta retorna dados do evento e do ingresso (status, e-mail do portador, etc.) para exibir o resultado na tela.

- **Admin (definir usuário como admin)**

  - Implementado em [SetAdminRole.tsx](src/components/admin/SetAdminRole.tsx) usando `httpsCallable` para a função `setAdminRole`.

- **Webhook de pagamento**
  - A função `receiveWebhook` é chamada diretamente pelo Mercado Pago (não pelo frontend).
  - Após o processamento no backend, o frontend passa a enxergar os ingressos gerados via coleções do Firestore (serviços em `src/services/firestore.ts` e hooks de tickets).

De forma geral, componentes de UI usam hooks em `src/hooks/` e estes, por sua vez, usam serviços em `src/services/` para isolar detalhes de rede/integração do restante da aplicação.

## ✅ Validação ponta a ponta (produção)

1. Faça uma compra real pelo fluxo do app para que o webhook gere ingressos no Firestore.
2. Acesse **Meus Ingressos** e clique em **Ver Ingresso (QR Code)**.
3. Copie o texto exibido abaixo do QR (é o `qrCode` assinado usado no backend).
4. Vá para **/validador**, cole o código e valide.

O endpoint `/functions/validateTicket` exige usuário autenticado e envia `Authorization: Bearer <ID_TOKEN>`. Se o mesmo QR for validado novamente, a API retorna "Ingresso já utilizado".
