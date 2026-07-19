# Seguranca

Este documento resume as decisoes de seguranca do IngressosZ e o que ainda
precisa ser validado antes de uso comercial amplo.

## Modelo de acesso

Roles atuais:

| Role | Permissao esperada |
| --- | --- |
| `user` | Compra ingressos e acessa os proprios tickets. |
| `validator` | Valida QR Codes na entrada do evento. |
| `organizer` | Gerencia eventos e pode validar ingressos. |
| `admin` | Acesso administrativo amplo. |

## Firestore

- `events`: leitura publica; escrita restrita a owner, organizer ou admin.
- `paymentSessions`: escrita negada ao cliente; criacao exclusiva por Function
  autenticada e validada no backend.
- `purchases`: sem acesso direto pelo cliente.
- `tickets`: leitura pelo dono/admin; escrita direta bloqueada.
- `users`: dados proprios permitidos, mas `role` protegido.

## Pagamentos

- O cliente solicita ao backend uma intencao rastreavel em `paymentSessions`.
- A emissao de tickets acontece apenas apos webhook aprovado.
- O webhook `receiveWebhook` valida assinatura HMAC com `MP_WEBHOOK_SECRET`.
- O backend consulta o pagamento no Mercado Pago antes de consolidar compra.
- Estoque e emissao sao tratados no backend para reduzir risco de manipulacao
  pelo cliente.

## QR Code

- Tickets usam QR Code baseado em JWT assinado com `JWT_SECRET`.
- `validateTicket` exige usuario autenticado.
- Roles permitidas para validacao: `validator`, `organizer` e `admin`.
- O backend marca o ticket como usado para bloquear reuso.

## App Check e reCAPTCHA

- Fluxos sensiveis usam App Check em producao.
- reCAPTCHA v2 participa de fluxos publicos que precisam de protecao contra
  abuso.
- Antes de publico amplo, validar dominios autorizados e enforcement.

## Observabilidade

- Sentry pode ser usado no frontend e backend.
- Logs das Functions devem ser acompanhados nos fluxos de pagamento, webhook,
  QR Code e reembolso.
- Recomenda-se configurar alertas de custo, quota, 401/403, 429 e 5xx.

## Pendencias de seguranca antes de vender ao publico

- [ ] Confirmar secrets reais em ambiente de producao.
- [ ] Confirmar dominios autorizados em Firebase Auth.
- [ ] Confirmar dominios do reCAPTCHA v2.
- [ ] Confirmar App Check/reCAPTCHA Enterprise.
- [ ] Ativar enforcement com monitoramento.
- [ ] Testar webhook com assinatura real do Mercado Pago.
- [ ] Testar compra aprovada, recusada e Pix.
- [ ] Testar reembolso e auditoria.
- [ ] Revisar Termos de Uso e Politica de Privacidade.
- [ ] Criar rotina de resposta a incidentes LGPD.

## Boas praticas para manter

- Nao versionar `.env.local`, secrets ou tokens.
- Evitar `npm audit fix --force` sem revisar breaking changes.
- Rodar lint, typecheck, build e testes antes de deploy.
- Fazer deploy pela raiz do repositorio usando `firebase.json` oficial.
- Separar status de portfolio do status de producao comercial.
