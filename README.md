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

*   **Autenticação e Gestão de Usuários:**
    *   Login, Cadastro e Perfil de usuário.
    *   Sistema de permissões (administradores e usuários).
*   **Gestão de Eventos (Admin):**
    *   Criação, edição e visualização de eventos.
*   **Vitrine e Compra de Ingressos (Usuário):**
    *   Listagem de eventos disponíveis.
    *   Detalhes do evento (data, local, etc.).
    *   Fluxo de compra integrado com Mercado Pago (Checkout Pro).
*   **Meus Ingressos:**
    *   Visualização dos ingressos adquiridos pelo usuário.
    *   Geração de QR Code para cada ingresso.
*   **Validação de Ingressos:**
    *   Página de validação com scanner de QR Code.
    *   Feedback em tempo real sobre a validade do ingresso.
*   **Modo Escuro (Dark Mode):**
    *   Suporte a tema claro e escuro para melhor experiência do usuário.
