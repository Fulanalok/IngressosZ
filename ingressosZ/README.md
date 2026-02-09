# IngressosZ - Frontend

Este é o frontend da plataforma IngressosZ, uma Single Page Application (SPA) moderna construída para oferecer uma experiência de usuário fluida na compra, gestão e validação de ingressos.

## 🛠️ Tech Stack

*   **Core:** [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/)
*   **Linguagem:** TypeScript 5.8
*   **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **Gerenciamento de Estado:**
    *   **Server State:** [TanStack Query v5](https://tanstack.com/query/latest) (Cache, Revalidação, Scroll Infinito)
    *   **Global State:** React Context API (Auth, Theme)
*   **Roteamento:** [React Router v7](https://reactrouter.com/)
*   **Testes:** Vitest + Testing Library + Cypress
*   **Outras Libs Importantes:**
    *   `react-helmet-async`: SEO dinâmico
    *   `sonner`: Notificações toast
    *   `qr-scanner`: Leitura de QR Codes via câmera
    *   `qrcode`: Geração de QR Codes
    *   `react-error-boundary`: Tratamento de erros de UI

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

| Script | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite. |
| `npm run build` | Compila o projeto para produção. |
| `npm run test` | Executa os testes unitários e de integração (Vitest). |
| `npm run qa` | Roda lint, typecheck e testes (Check completo). |
| `npm run cypress:open` | Abre o Cypress para testes E2E. |
| `npm run preview` | Visualiza o build de produção localmente. |

## 🧪 Padrões de Teste

1.  **Unitários/Integração (Vitest):** Focados em testar hooks (`useAuth`, `useEvents`) e serviços (`firestore.ts`) isoladamente. Componentes complexos são testados simulando interação do usuário (`fireEvent`).
2.  **End-to-End (Cypress):** Testam fluxos críticos como Login, Cadastro e Compra de Ingressos, garantindo que o sistema funcione como um todo.

## 🎨 Design System & UI

Utilizamos componentes encapsulados em `src/components/ui`, construídos com Tailwind CSS. Isso garante consistência visual e facilita a manutenção. O tema (Claro/Escuro) é gerenciado via `ThemeContext` e persistido no LocalStorage.
