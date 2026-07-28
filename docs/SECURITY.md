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
- `paymentWebhookEvents`: leitura e escrita negadas a usuario, organizer e admin
  no cliente; somente Functions/Admin SDK acessam.
- `purchases`: sem acesso direto pelo cliente.
- `tickets`: leitura pelo dono/admin; escrita direta bloqueada.
- `users`: dados proprios permitidos, mas `role` protegido.
- `authorization`: fonte autoritativa separada, sem acesso pelo cliente.

## Roles e tokens antigos

Todo acesso privilegiado compara `role`, `admin` e `roleVersion` do token com
`authorization/{uid}`. O documento precisa existir e estar `active`. Versao
ausente/antiga/futura, role divergente, flag admin contraditoria e estados
`applying/error` sao negados.

A primeira transacao de uma alteracao incrementa a versao e muda o estado para
`applying` antes de chamar Firebase Auth. Isso invalida imediatamente tokens
antigos tanto nas Functions quanto nas Firestore e Storage Rules. Claims nao
relacionadas sao preservadas e refresh tokens sao revogados antes da ativacao.

`users/{uid}.role` nunca concede privilegio; permanece somente como espelho de
exibicao.

## Pagamentos

- O cliente solicita ao backend uma intencao rastreavel em `paymentSessions`.
- A emissao de tickets acontece apenas apos webhook aprovado.
- O webhook `receiveWebhook` valida assinatura HMAC com `MP_WEBHOOK_SECRET`.
- O backend consulta o pagamento no Mercado Pago antes de consolidar compra.
- `paymentSessions` e a unica autoridade de usuario, evento, quantidade e valores;
  metadata atual ou legado serve somente para localizar a sessao.
- Compra, estoque, tickets, sessao e trava idempotente sao confirmados na mesma
  transacao, sem estado antecipado `processing`.
- Oversell, duplicidade e incompatibilidades sao terminais e auditaveis como
  `refund_required_*`; o reembolso automatico permanece fora deste fluxo.
- `paymentWebhookEvents` contem somente resultados terminais. Pending, rejected
  e outros estados nao aprovados retornam `ignored_not_approved` sem escrita.
- A reconciliacao de compras legadas valida evento, usuario e sessao antes de
  reparar o estado, sem repetir efeitos financeiros ou emissao.

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

## Seguranca da manutencao de sessoes

- A consulta paginada encontra somente sessoes `pending` vencidas em estados de
  provider elegiveis; a decisao usa uma nova leitura dentro da transacao para
  nao sobrescrever uma aprovacao concorrente.
- `providerState: created` e excluido da expiracao, e aprovacoes validas tardias
  ficam marcadas com `approvedAfterInitiationExpiry` para auditoria.
- Os logs estruturados usam IDs, estados, motivos e contadores, sem e-mail ou
  outros dados pessoais. As Firestore Rules continuam negando escrita dessas
  sessoes pelo cliente.
- A manutencao nao cancela pagamentos no provedor nem aciona reembolso.

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
