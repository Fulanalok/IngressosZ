# IngressosZ - Visao do Projeto

IngressosZ e uma plataforma de ingressos digitais para eventos pequenos e
medios. O projeto cobre descoberta de eventos, compra online, emissao de
ingressos com QR Code e validacao presencial.

O foco atual e demonstrar uma solucao completa, simples de operar e com boa
base de seguranca para portfolio. Antes de venda publica ampla, ainda faltam
validacoes reais de pagamento, webhook, e-mail, QR Code, reembolso, App Check e
revisao legal.

## Demo

- Site publicado: https://<your-project>.web.app
- Repositorio: https://github.com/Fulanalok/IngressosZ

## Principais recursos

- Listagem publica de eventos com filtros.
- Compra de ingressos via Mercado Pago Checkout Pro.
- Fluxo Pix com QR Code.
- Criacao de `paymentSessions` para rastrear o estado de compra.
- Webhook Mercado Pago com validacao de assinatura HMAC.
- Emissao de tickets digitais com QR Code JWT assinado.
- Area "Meus ingressos" para o comprador.
- Validador de QR Code para entrada do evento.
- Painel admin para eventos, roles, vendas e reembolsos.
- E-mails transacionais de confirmacao.
- Regras Firestore e Storage separando leitura publica, escrita protegida e
  operacoes exclusivas de backend.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Estado/dados | TanStack Query, Firebase SDK |
| Backend | Firebase Functions v2, Node.js 24, TypeScript |
| Banco | Cloud Firestore |
| Arquivos | Firebase Storage |
| Auth | Firebase Authentication |
| Pagamentos | Mercado Pago Checkout Pro e Pix |
| QR Code | JWT assinado, `qrcode`, `qr-scanner` |
| Observabilidade | Sentry frontend/backend |
| Testes | Vitest, Testing Library, Cypress, Mocha |

## Status para portfolio

Pronto para apresentacao controlada no LinkedIn:

- README e documentacao organizados.
- Site publico disponivel.
- Fluxo tecnico documentado.
- Arquitetura de pagamento e QR Code explicada.
- Checklist separa o que esta pronto para portfolio do que ainda falta para
  uso comercial real.

## Escopo nao prometido

Para evitar overclaiming no portfolio, estes pontos devem ser apresentados como
pendencias antes de producao comercial:

- Testes reais completos com cartao e Pix.
- Confirmacao do webhook no painel Mercado Pago.
- Validacao real de e-mail transacional.
- App Check com enforcement ativo e monitorado.
- Revisao juridica de termos, privacidade, reembolso e LGPD.
- Alertas de custo, quota e erros em producao.
