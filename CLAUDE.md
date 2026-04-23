# IngressosZ - Project Documentation and Vision

This file serves as a reference guide for developers and AIs working on IngressosZ. It details the philosophy, project direction, and technical guidelines to ensure consistency and efficiency.

## 🚀 Overview

**IngressosZ** is a dedicated ticket sales and validation platform, designed to be used by a **single company** (single-company). The goal is to offer a premium, secure, and extremely simple experience for both the organizer and the end customer.

## 📂 Workspaces & Routing Table

This project is organized into **workspaces** — distinct areas of work with their own CONTEXT.md files. When Claude receives a task, it should:

1. **Identify the workspace** using the table below
2. **Read the relevant CONTEXT.md** before starting work
3. **Follow the conventions** defined in that workspace

### Workspace Map

| Workspace | Location | Purpose | CONTEXT.md |
|-----------|----------|---------|------------|
| **Planning** | `planning/` | Roadmap, pending tasks, long-term vision | `planning/CONTEXT.md` |
| **Specs** | `specs/` | Technical specifications, schemas, API contracts | `specs/CONTEXT.md` |
| **Architecture** | `architecture/` | Design decisions, patterns, system structure | `architecture/CONTEXT.md` |
| **Frontend** | `ingressosZ/src/` | React components, hooks, services | `ingressosZ/src/CONTEXT.md` |
| **Components** | `ingressosZ/src/components/` | UI components (admin, event, ticket, etc) | `ingressosZ/src/components/CONTEXT.md` |
| **Services** | `ingressosZ/src/services/` | Firebase & API integrations | `ingressosZ/src/services/CONTEXT.md` |
| **Hooks** | `ingressosZ/src/hooks/` | Custom React hooks | `ingressosZ/src/hooks/CONTEXT.md` |
| **Backend** | `functions/` | Firebase Functions (serverless backend) | `functions/CONTEXT.md` |
| **Operations** | `ops/` | Deploy, monitoring, CI/CD | `ops/CONTEXT.md` |

### Routing Table: Task Type → Workspace

| Task Type | Read First | Then Read (if needed) |
|-----------|------------|----------------------|
| "Plan feature X" | `planning/CONTEXT.md` | `specs/CONTEXT.md`, `architecture/CONTEXT.md` |
| "Explain payment flow" | `specs/CONTEXT.md` | `functions/CONTEXT.md` |
| "Add new component" | `ingressosZ/src/components/CONTEXT.md` | `ingressosZ/src/CONTEXT.md` |
| "Create custom hook" | `ingressosZ/src/hooks/CONTEXT.md` | `ingressosZ/src/CONTEXT.md` |
| "Fix Firebase Function bug" | `functions/CONTEXT.md` | `specs/CONTEXT.md` |
| "Integrate new API" | `ingressosZ/src/services/CONTEXT.md` | `specs/CONTEXT.md` |
| "Deploy to production" | `ops/CONTEXT.md` | `functions/CONTEXT.md` |
| "Review architecture decision" | `architecture/CONTEXT.md` | `specs/CONTEXT.md` |
| "Update roadmap" | `planning/CONTEXT.md` | — |

### File Naming & Organization

When creating new files:

- **Components**: PascalCase (`EventCard.tsx`) → `ingressosZ/src/components/{domain}/`
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`) → `ingressosZ/src/hooks/{domain}/`
- **Services**: camelCase (`firestore.ts`) → `ingressosZ/src/services/{category}/`
- **Functions**: camelCase (`createPreference.ts`) → `functions/src/{category}/`
- **Types**: PascalCase (`Event.ts`) → `ingressosZ/src/types/`
- **Utils**: camelCase (`formatCurrency.ts`) → `ingressosZ/src/utils/`
- **Context docs**: `CONTEXT.md` (always uppercase) → workspace root

**IMPORTANT**: The CONTEXT.md files are **living documents**. If Claude encounters something not covered in a CONTEXT.md, or finds outdated information, it should note this to the user and suggest updates.

## 🧠 Project Philosophy

- **Dedicated Simplicity**: The system is not a multi-company marketplace. It is optimized for the events of a single entity, which simplifies permission logic and navigation.
- **Cost Efficiency (Low Firestore Footprint)**: The architecture must prioritize low consumption of Firebase resources.
  - Use `getDocs` for static data or data that changes little (e.g., "My Tickets").
  - Use `onSnapshot` judiciously (e.g., Event list and Admin Dashboard) to keep UX real-time where it really matters.
- **Responsive and Premium Interface**: Mobile-first design, focusing on usability on any device. The mobile experience should be as fluid as a native app.

- **Primary Color**: Monochromatic Blue (Premium Blue).
- **Typography**: **Outfit** (Google Fonts).
- **Aesthetics**: Glassmorphism (`glass-card`), rounded borders (`rounded-xl` / `rounded-2xl`), soft shadows, and text with gradients (`blue-gradient-text`).
- **Guideline**: Use the blue palette defined in `index.css` to create depth and a modern SaaS look. Avoid vibrant colors outside the blue scale, except for critical alerts.

## 🧭 Roadmap and Future

What we want IngressosZ to become:

- **Offline/Secure Validation**: Improvement of signed QR Code validation.

## 🚩 Pending Tasks and Next Steps (April 2026)

### High Priority — Production Validation

- [ ] **Test end-to-end payment flow**: MP_ACCESS_TOKEN configured, Functions deployed with `getFirestore()`. Need to validate purchase with credit card and PIX in production.
- [ ] **Configure Webhook in Mercado Pago**: The `receiveWebhook` URL needs to be registered in the MP dashboard so that approved payments generate tickets automatically.
  - URL: `https://<region>-<your-project>.cloudfunctions.net/receiveWebhook`
- [ ] **Login (auth/invalid-credential)**: Validate admin user credentials in the Firebase Console.

### UI/UX & Features

- [ ] **PIX Checkout**: Validate Base64 QR Code in the modal after payment is approved via webhook.
- [ ] **PWA icon**: `pwa-192.png` missing in build — console error (non-critical).
- [ ] **App Check**: Enable in production (Auth, Firestore, Functions, Storage) for additional security.

## 🛠️ Development Guidelines

Always tell me before you do something what Agent Model I should use for the work and why.

Use Claude Sonnet for: code implementation, general questions, data analysis, and document summarization.
Use Claude Opus for: complex architecture decisions, more refined writing, and critical bug diagnostics.
Use Claude Haiku for: quick answers, day-to-day demands, and simple tasks.

### Tech Stack

- **Frontend**: React 19, Vite 7, TypeScript, Tailwind CSS v4.
- **Routing**: React Router v7.
- **Data**: TanStack Query v5 + Firebase Firestore.
- **Backend**: Firebase Functions v2 (Node.js 24).

### Component Architecture (`src/components/`)

- `admin/` — Exclusive screens and modals for the administrative panel
- `common/` — Generic and utility components
- `dev/` — Tools visible only in local environment (development)
- `event/` — Everything related to Event display and manipulation
- `layout/` — Global visual structure (Navbar, etc.)
- `qr/` — QR Code generation and reading (production)
- `ticket/` — Ticket display
- `ui/` — Generic base components (Buttons, Inputs, Cards, etc.)
- `validator/` — Ticket validation flow at the entrance

### Project Architecture

📁 src/components/
├── 📁 admin/ # Exclusive screens and modals for the administrative panel
│ ├── AdminDashboard.tsx
│ ├── AttendeeList.tsx
│ └── SetAdminRole.tsx
│
├── 📁 common/ # Generic and utility components
│ ├── GlobalErrorFallback.tsx
│ └── SEO.tsx
│
├── 📁 dev/ # Tools visible only in local environment (development)
│ ├── CameraTest.tsx
│ ├── DevPanel.tsx
│ ├── FirebaseDebug.tsx
│ ├── QRGenerator.tsx
│ └── QRTestDisplay.tsx
│
├── 📁 event/ # Everything related to Event display and manipulation
│ ├── EventCard.tsx
│ ├── EventCardSkeleton.tsx
│ ├── EventDetailSkeleton.tsx
│ ├── EventHeader.tsx
│ ├── EventInfo.tsx
│ ├── ShareButtons.tsx
│ └── TicketPurchase.tsx
│
├── 📁 layout/ # Global visual structure
│ ├── Navbar.tsx
│ └── ThemeToggle.tsx
│
├── 📁 qr/ # QR Code generation and reading (production)
│ ├── QRCodeDisplay.tsx
│ └── QRScanner.tsx
│
├── 📁 ticket/ # Ticket display
│ ├── Ticket.tsx
│ └── TicketSkeleton.tsx
│
├── 📁 ui/ # Generic base components (Buttons, Inputs, Cards, etc.)
│ ├── button.tsx
│ ├── card.tsx
│ ├── input.tsx
│ └── skeleton.tsx
│
└── 📁 validator/ # Ticket validation flow at the entrance
├── ScannerSection.tsx
├── ValidationResult.tsx
└── ValidatorForm.tsx

### Code Standards

- **Logic and UI**: Keep complex data logic in custom hooks or services. Components should focus on rendering and UI.
- **Styling**: Use only Tailwind CSS v4. Avoid inline CSS or heavy component libraries.
- **Typing**: Strict TypeScript. Avoid `any`.
- **Security**: Firestore and Storage rules must be restrictive. Ticket validation must be done via authenticated HTTPS in Functions.
- **Admin SDK**: Always use `getFirestore()` from `firebase-admin/firestore`, not `admin.firestore()`.

### Useful Commands

- `npm run dev`: Start the frontend locally.
- `npm test`: Run test suite (286 passing).
- `firebase deploy --only hosting`: Frontend deploy.
- `firebase deploy --only functions`: Backend deploy.
- `firebase functions:log`: View runtime logs in production.

---

_This document is alive and should be updated as the project evolves._

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools and NEVER use Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Never fall back to Grep/Glob/Read

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
