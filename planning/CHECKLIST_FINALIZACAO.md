# Checklist de Finalizacao - IngressosZ

Atualizado em 2026-06-08.

Este arquivo fica dividido em duas partes:

- **Plano de finalizacao**: o que ainda falta e como fazer.
- **Historico do que ja foi feito**: itens tecnicos ja fechados, para consulta.

## Status Atual

- [x] Codigo, documentacao base e CI estao organizados no GitHub.
- [x] Branch `main` esta alinhada com `origin/main`.
- [x] URL Firebase Hosting atual adotada como default:
  `https://<your-project>.web.app`.
- [x] Functions implantadas em `southamerica-east1` em 2026-06-01.
- [x] Lint, build e testes frontend/backend passaram em 2026-06-01.
- [x] Cloud SQL/Data Connect removidos para reduzir custo.
- [x] `SMTP_EMAIL` removido do Secret Manager e migrado para param/env.
- [x] `WEB_BASE_URL` local das Functions realinhado para a URL oficial do
  Hosting e Functions redeployadas em 2026-06-02.
- [x] Firestore Rules, Storage Rules e Hosting publicados em 2026-06-02.
- [x] Hosting republicado em 2026-06-05 com ajustes visuais e datas exibidas
  como `DD/MM/YYYY`, sem hifens.
- [x] Projeto pronto para apresentacao no LinkedIn como portfolio em
  2026-06-08.
- [ ] Mercado Pago, App Check, dominios e testes reais de compra/QR/e-mail/
  reembolso ainda faltam.

## Pronto para LinkedIn

- [x] Site publicado e acessivel:
  `https://<your-project>.web.app`.
- [x] Repositorio com README raiz explicando stack, fluxo de pagamento,
  seguranca, setup, testes e deploy.
- [x] Visual publico simplificado para apresentacao: fundo preto, sem
  gradientes/degrades, sem vidro-morfismo, sem animacoes de scroll e sem blocos
  promocionais desnecessarios.
- [x] Footer publico enxuto com copyright e links legais.
- [x] Datas exibidas sem hifens, em formato brasileiro.
- [x] Hosting publicado apos os ultimos ajustes visuais.
- [x] Escopo comercial real separado deste status: os testes reais de
  pagamento, webhook, e-mail, QR Code, reembolso, App Check e revisao legal
  continuam pendentes antes de vender ao publico.

## Plano de Finalizacao

### 1. Conferir Firebase de Producao

- [x] Confirmar projeto ativo no Firebase CLI.

Como fazer:

```bash
npx firebase-tools use
```

Resultado esperado: projeto `<your-firebase-project-id>`.

Status 2026-06-01: projeto usado nos deploys e consultas via CLI.

- [ ] Conferir no Firebase Console se estes produtos estao ativos:
  Auth, Firestore, Storage, Functions e Hosting.

Como fazer:

1. Abrir `https://console.firebase.google.com/project/<your-firebase-project-id>`.
2. Entrar em cada produto no menu lateral.
3. Confirmar que nao ha tela de "comecar" ou setup pendente.

- [ ] Conferir dominios autorizados no Firebase Auth.

Como fazer:

1. Firebase Console > Authentication > Settings > Authorized domains.
2. Confirmar `<your-project>.web.app`.
3. Adicionar dominio proprio depois, se existir.

### 2. Configurar Secrets das Functions

- [x] Secrets obrigatorios configurados o suficiente para deploy das Functions.

Como fazer:

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN
firebase functions:secrets:set MP_WEBHOOK_SECRET
firebase functions:secrets:set JWT_SECRET
firebase functions:secrets:set SMTP_PASSWORD
firebase functions:secrets:set RECAPTCHA_V2_SECRET
```

O que preencher:

- `MP_ACCESS_TOKEN`: token de producao do Mercado Pago.
- `MP_WEBHOOK_SECRET`: segredo configurado no painel do Mercado Pago.
- `JWT_SECRET`: valor longo, aleatorio e exclusivo de producao.
- `SMTP_PASSWORD`: app password ou senha propria do provedor SMTP.
- `RECAPTCHA_V2_SECRET`: secret key do reCAPTCHA v2.

- [ ] Conferir valores reais dos secrets no console/CLI antes do teste real de
  pagamento e e-mail.

- [x] Corrigir params das Functions e redeployar.

Como fazer:

Criar/conferir `functions/.env` local sem versionar secrets:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_EMAIL=seu-email@exemplo.com
WEB_BASE_URL=https://<your-project>.web.app
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0
```

Observacao: se outro provedor de e-mail for usado, ajustar `SMTP_HOST` e
`SMTP_PORT`. `SMTP_EMAIL` e param/env comum, nao Secret Manager.

Status 2026-06-02: `functions/.env.<your-firebase-project-id>` criado e
realinhado com `WEB_BASE_URL=https://<your-project>.web.app`.
Firebase CLI confirmou carregamento desse dotenv no redeploy das Functions.

- [x] Remover o secret antigo `SMTP_EMAIL` do Secret Manager.
  - 2026-06-01: versoes `SMTP_EMAIL@1` a `SMTP_EMAIL@5` destruidas; consulta
    posterior retornou 404.

### 3. Configurar Variaveis do Frontend

- [ ] Criar/conferir `ingressosZ/.env.local`.

Como fazer:

1. Usar `ingressosZ/.env.example` como modelo.
2. Preencher os valores reais do Firebase Web App.
3. Preencher Mercado Pago, reCAPTCHA, App Check e dados legais.
4. Garantir flags de producao:

```env
VITE_FUNCTIONS_REGION=southamerica-east1
VITE_USE_EMULATORS=false
VITE_APPCHECK_DEBUG_TOKEN=false
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

Variaveis que precisam estar reais:

- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_MERCADOPAGO_PUBLIC_KEY`
- [ ] `VITE_RECAPTCHA_V2_SITE_KEY`
- [ ] `VITE_APPCHECK_RECAPTCHA_ENTERPRISE_KEY`
- [ ] `VITE_LEGAL_BRAND_NAME`
- [ ] `VITE_LEGAL_CONTROLLER_NAME`
- [ ] `VITE_LEGAL_CONTROLLER_DOCUMENT`
- [ ] `VITE_LEGAL_CONTROLLER_ADDRESS`
- [ ] `VITE_LEGAL_SUPPORT_EMAIL`
- [ ] `VITE_LEGAL_PRIVACY_EMAIL`

### 4. Configurar reCAPTCHA e App Check

- [ ] Autorizar dominio no reCAPTCHA v2.

Como fazer:

1. Abrir o painel do reCAPTCHA v2.
2. Adicionar `<your-project>.web.app`.
3. Copiar site key para `VITE_RECAPTCHA_V2_SITE_KEY`.
4. Copiar secret key para `RECAPTCHA_V2_SECRET`.

- [ ] Autorizar dominio no Firebase App Check.

Como fazer:

1. Firebase Console > App Check.
2. Configurar reCAPTCHA Enterprise para o Web App.
3. Autorizar `<your-project>.web.app`.
4. Copiar a chave para `VITE_APPCHECK_RECAPTCHA_ENTERPRISE_KEY`.

- [ ] Ativar enforcement do App Check.

Como fazer:

1. Fazer deploy primeiro e testar sem enforcement agressivo.
2. Confirmar que login, cadastro, checkout, Pix, QR e logs funcionam.
3. Ativar enforcement para Firestore, Storage e Functions.
4. Monitorar recusas 401/403 no console.

### 5. Rodar Qualidade Local Final

- [x] Instalar dependencias.

Status 2026-06-01: dependencias ja estavam instaladas para as rodadas locais.

- [x] Rodar checagens frontend.

Como fazer:

```bash
npm --prefix ingressosZ run lint
npm --prefix ingressosZ run typecheck
npm --prefix ingressosZ run build
npm --prefix ingressosZ run test
```

- [x] Rodar checagens backend.

Como fazer:

```bash
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions run test
```

- [ ] Rodar emulador quando Java estiver instalado.

Como fazer:

```bash
java -version
npm run test:emulator
```

Se `java -version` falhar, instalar JDK antes de rodar os emuladores Firebase.

### 6. Fazer Deploy

- [x] Confirmar que nao ha alteracoes locais inesperadas.

Como fazer:

```bash
git status -sb
```

- [x] Fazer deploy completo.

Como fazer:

```bash
npx firebase-tools deploy --only firestore:rules,storage,functions,hosting --project <your-firebase-project-id>
```

Alternativa por partes:

```bash
npx firebase-tools deploy --only firestore:rules --project <your-firebase-project-id>
npx firebase-tools deploy --only storage --project <your-firebase-project-id>
npx firebase-tools deploy --only functions --project <your-firebase-project-id>
npm --prefix ingressosZ run build
npx firebase-tools deploy --only hosting --project <your-firebase-project-id>
```

Status 2026-06-02:

- [x] Functions redeployadas com sucesso depois do realinhamento de
  `WEB_BASE_URL`.
- [x] `npm.cmd --prefix ingressosZ run build` passou antes do deploy de
  Hosting.
- [x] Firestore Rules, Storage Rules e Hosting publicados com sucesso.

Status 2026-06-05:

- [x] `npm.cmd --prefix ingressosZ run build` passou antes do deploy de
  Hosting.
- [x] `npm.cmd --prefix ingressosZ run lint` passou.
- [x] `npm.cmd --prefix ingressosZ run test -- HomePage EventCard ValidationResult Ticket`
  passou com 9 arquivos e 66 testes.
- [x] Hosting publicado com as mudancas visuais e URL oficial respondeu HTTP
  200.

- [x] Guardar URL publica da Function `receiveWebhook`.

Como fazer:

1. Conferir output do deploy.
2. Copiar a URL HTTP da Function `receiveWebhook`.
3. Registrar a URL neste arquivo e no painel Mercado Pago.

URL do webhook Mercado Pago:

```text
https://<your-webhook-url>
```

### 7. Configurar Mercado Pago

- [ ] Confirmar credenciais de producao.

Como fazer:

1. Entrar no painel Mercado Pago.
2. Conferir se `MP_ACCESS_TOKEN` e `VITE_MERCADOPAGO_PUBLIC_KEY` sao de
   producao.
3. Evitar misturar credenciais sandbox/teste com producao.

- [ ] Cadastrar webhook.

Como fazer:

1. Mercado Pago > Webhooks.
2. Cadastrar a URL publica de `receiveWebhook`.
3. Habilitar evento `Payments`.
4. Configurar o mesmo segredo usado em `MP_WEBHOOK_SECRET`.

- [ ] Validar assinatura do webhook.

Como fazer:

1. Fazer pagamento real de baixo valor.
2. Conferir logs:

```bash
firebase functions:log --only receiveWebhook
```

Resultado esperado: webhook processado sem erro de assinatura.

### 8. Testar Compra Real Ponta a Ponta

- [ ] Criar evento barato de teste.

Como fazer:

1. Entrar como admin/organizer.
2. Criar evento com poucos ingressos.
3. Definir preco baixo.

- [ ] Comprar via Checkout/cartao.

Como validar:

1. Compra aprovada no Mercado Pago.
2. `paymentSessions.status` atualizado.
3. `purchases.status` atualizado.
4. Ticket criado em `tickets`.
5. Estoque decrementado.
6. E-mail recebido.

- [ ] Comprar via Pix.

Como validar:

1. Pix gerado corretamente.
2. Pagamento aprovado.
3. Webhook processado.
4. Ticket criado uma unica vez.

- [ ] Testar pagamento rejeitado/cancelado.

Como validar:

1. Pagamento recusado ou cancelado nao cria ticket.
2. Compra fica com status correto.
3. Estoque nao fica inconsistente.

### 9. Testar Ticket, QR Code e Roles

- [ ] Abrir "Meus ingressos" e conferir ticket emitido.

Como fazer:

1. Entrar com usuario comprador.
2. Abrir pagina de ingressos.
3. Conferir evento, QR Code e status.

- [ ] Validar QR Code com roles permitidas.

Como fazer:

1. Criar/confirmar usuarios com role `validator`, `organizer` e `admin`.
2. Validar o QR Code com cada role.
3. Confirmar que a primeira validacao funciona.
4. Confirmar que QR Code ja usado nao valida de novo.

- [ ] Confirmar bloqueio de usuario comum.

Como fazer:

1. Entrar com usuario sem role elevada.
2. Tentar acessar admin/validador.
3. Confirmar bloqueio no frontend e nas Functions.

### 10. Testar Reembolso/Admin

- [ ] Reembolsar compra elegivel.

Como fazer:

1. Entrar como admin.
2. Selecionar uma compra de teste.
3. Executar reembolso.
4. Conferir Mercado Pago, `purchases`, auditoria e logs.

Logs uteis:

```bash
firebase functions:log --only refundPayment
```

### 11. Observabilidade e Alertas

- [ ] Confirmar Sentry frontend, se usado.

Como fazer:

1. Preencher `VITE_SENTRY_DSN`.
2. Gerar erro controlado no frontend.
3. Verificar evento no Sentry.

- [ ] Confirmar Sentry backend, se usado.

Como fazer:

1. Preencher `SENTRY_DSN`.
2. Gerar erro controlado seguro em ambiente de teste.
3. Verificar evento no Sentry.

- [ ] Criar alertas de erro/custo/quota.

Como fazer:

1. Google Cloud Billing > Budgets & alerts.
2. Criar alerta de custo.
3. Cloud Logging/Monitoring > criar alertas para picos de 401, 403, 429 e 5xx.
4. Monitorar Functions, Firestore, Auth, Storage e Hosting.

### 12. Pendencias Tecnicas Monitoradas

- [ ] Monitorar vulnerabilidades moderadas transitivas do backend ligadas a
  `uuid`.

Como fazer:

```bash
npm --prefix functions audit --omit=dev
```

Nao aplicar `npm audit fix --force` sem revisar, porque ele pode fazer downgrade
quebravel de Mercado Pago/Firebase.

- [ ] Avaliar token consumivel/replay protection para operacoes criticas.

Como fazer:

1. Validar primeiro o fluxo em producao com App Check.
2. Se houver risco real de replay, desenhar token de uso unico por acao critica.
3. Implementar com expiracao curta e registro transacional no Firestore.

### 13. Legal e Conformidade Brasil

- [ ] Revisar Termos de Uso com advogado antes do lancamento publico.
- [ ] Revisar Politica de Privacidade com advogado antes do lancamento publico.
- [ ] Confirmar CNPJ/CPF publico, razao/nome, endereco e canais de contato.
- [ ] Confirmar se ha exigencia de nota fiscal, contrato com organizadores ou
  tributacao especifica.
- [ ] Definir regra publica de cancelamento, adiamento, reembolso e direito de
  arrependimento.
- [ ] Definir tratamento para meia-entrada quando aplicavel.
- [ ] Criar procedimento de resposta a incidentes LGPD.
- [ ] Definir rotina para direitos dos titulares: acesso, correcao, exclusao,
  portabilidade, oposicao e revogacao de consentimento.
- [ ] Confirmar contratos/termos de operador com Firebase/Google, Mercado Pago,
  provedor de e-mail e Sentry.

### 14. Limpeza Leve Pre-Lancamento

- [x] Trocar favicon/OG/Twitter default de `/vite.svg` por asset proprio da
  marca IngressosZ.
- [x] Remover `ingressosZ/src/assets/react.svg` sem uso.
- [x] Remover `ingressosZ/.firebaserc` e `ingressosZ/firebase.json`.

Status 2026-06-02: deploy oficial deve ser executado a partir da raiz do repo,
usando o `firebase.json` da raiz e `--project <your-firebase-project-id>`. O par
`ingressosZ/.firebaserc` + `ingressosZ/firebase.json` foi removido para evitar
deploy acidental a partir de `ingressosZ/`.

- [ ] Revisar rotas e utilitarios dev (`/dev-auto`, `/debug/firebase`, `/doc`,
  `/teste-qr`, `testDataService` e `seedData`) depois do teste real, mantendo
  apenas o que ainda ajuda na operacao.

## Criterios de Pronto para Publico

- [ ] Firebase Auth, Firestore, Storage, Functions e Hosting ativos e
  conferidos no console.
- [ ] Secrets e envs reais configurados e validados com teste real.
- [ ] Dominios autorizados no Firebase Auth, reCAPTCHA e App Check.
- [x] Deploy completo executado sem erro.
- [ ] Mercado Pago webhook configurado e recebendo `Payments`.
- [ ] Checkout/cartao e Pix reais testados.
- [ ] Compra aprovada gera ticket uma unica vez.
- [ ] Compra recusada/cancelada nao gera ticket.
- [ ] E-mail de confirmacao chega corretamente.
- [ ] QR Code valida com roles permitidas e bloqueia reuso.
- [ ] Usuario comum nao acessa admin/validador.
- [ ] Reembolso/admin funciona em compra elegivel.
- [x] Firestore/Storage Rules publicadas.
- [ ] App Check enforcement ativo e testado.
- [ ] Logs/Sentry/alertas confirmados.
- [ ] Pendencias legais revisadas para lancamento publico.

## Historico do Que Ja Foi Feito

- [x] Repositorio limpo de artefatos locais e alinhado com `origin/main`.
- [x] Frontend React/Vite organizado em paginas, componentes, hooks, services e
  rotas protegidas.
- [x] Backend Firebase Functions modularizado por dominio em
  `functions/src/endpoints/`.
- [x] Checkout/Pix usam `paymentSessions`.
- [x] `paymentSessions.paymentMethod` aceita `checkout` ou `pix`.
- [x] Webhook Mercado Pago valida HMAC com `MP_WEBHOOK_SECRET`.
- [x] Tickets usam QR Code JWT assinado com `JWT_SECRET`.
- [x] Regras Firestore bloqueiam escrita direta em `tickets` e `purchases`.
- [x] Regras Firestore confirmam `paymentSessions.userId` e `userEmail`.
- [x] Role comum nao altera `users.role`.
- [x] Paginas publicas de Termos e Privacidade reforcadas para LGPD,
  CDC/e-commerce, contato publico, incidentes e reembolso.
- [x] Sentry frontend inicializa apenas com DSN configurado e sem PII padrao.
- [x] Sentry backend inicializa apenas com DSN configurado e amostragem menor.
- [x] `logClientError` aplica rate limit e sanitiza dados sensiveis.
- [x] PWA nao faz cache automatico de respostas Firestore com dados pessoais.
- [x] Callables sensiveis exigem App Check.
- [x] Endpoints HTTP publicos de pagamento/validacao exigem App Check.
- [x] `seedDatabase` fica desabilitada fora do emulador.
- [x] Rate limiter falha fechado quando nao consegue avaliar o controle.
- [x] `validateTicket` envia `X-Firebase-AppCheck` pelo frontend.
- [x] `createPaymentPreference`: App Check e limite de 10 requisicoes/minuto por
  usuario autenticado.
- [x] `createPixPayment`: App Check e limite de 10 requisicoes/minuto por
  usuario autenticado.
- [x] `createPaymentPreferencePublic`: App Check e limite de 10
  requisicoes/minuto por IP.
- [x] `createPixPaymentPublic`: App Check e limite de 10 requisicoes/minuto por
  IP.
- [x] `validateTicket`: Firebase ID token, role permitida e limite de 30
  validacoes/minuto por validador.
- [x] `refundPayment`: App Check, admin e limite de 10 reembolsos/minuto.
- [x] `setAdminRole`: App Check, admin e limite de 10 alteracoes/minuto.
- [x] `setUserRole`: App Check e limite de 20 alteracoes/minuto.
- [x] Storage limita upload a usuarios autenticados/organizadores e imagens ate
  5 MB nos caminhos permitidos.
- [x] `.firebaserc` aponta para `<your-firebase-project-id>`.
- [x] Region das Functions confirmada como `southamerica-east1`.
- [x] Hosting atual confirmado:
  `https://<your-project>.web.app`.
- [x] `WEB_BASE_URL` default alinhado para o Hosting atual.
- [x] Configuracao local de Data Connect/Cloud SQL removida do repo para evitar
  recriacao acidental da instancia `ingressosz-main-fdc`.
- [x] `SMTP_EMAIL` deixou de ser Secret Manager e passou a ser param/env comum
  para reduzir superficie de custo.
- [x] Cloud SQL `ingressosz-main-fdc` removida no Google Cloud.
- [x] Secret Manager `SMTP_EMAIL` removido apos novo deploy das Functions.
- [x] Deploy de Functions concluido em 2026-06-01.
- [x] URL publica de `receiveWebhook` registrada:
  `https://<your-webhook-url>`.
- [x] Rodada 2026-06-02: `functions/.env.<your-firebase-project-id>`
  realinhado com o Hosting oficial e Functions redeployadas com sucesso.
- [x] Rodada 2026-06-02: `npm.cmd --prefix ingressosZ run build` passou, e
  Firestore Rules, Storage Rules e Hosting foram publicados com sucesso.
- [x] Rodada 2026-06-02: fluxo documental revisado para preferir
  `npx firebase-tools ... --project <your-firebase-project-id>` e registrar
  limpeza leve pre-lancamento.
- [x] Rodada 2026-06-02: `/vite.svg`, `src/assets/react.svg`,
  `ingressosZ/.firebaserc` e `ingressosZ/firebase.json` removidos; favicon e
  imagens sociais/SEO passaram a usar os assets PWA do app.
- [x] `README.md`, `ops/CONTEXT.md`, `planning/CONTEXT.md` e demais
  `CONTEXT.md` atualizados.
- [x] Rodada 2026-06-05: visual publico simplificado para fundo preto, sem
  gradientes/degrades, sem vidro-morfismo, sem animacoes de scroll e com
  botoes de cantos retos.
- [x] Rodada 2026-06-05: Home simplificada, removendo copy introdutoria longa,
  cards de metricas e ponto final do titulo principal.
- [x] Rodada 2026-06-05: datas exibidas no frontend/PDF passaram a usar
  formato `DD/MM/YYYY` via `ingressosZ/src/lib/date.ts`.
- [x] Rodada 2026-06-05: `npm.cmd --prefix ingressosZ run build`, `lint` e
  testes focados `HomePage EventCard ValidationResult Ticket` passaram; Hosting
  publicado e URL oficial respondeu HTTP 200.
- [x] CI GitHub passou apos o push do commit `de58e3f`.
- [x] Rodada 2026-05-25: frontend lint/typecheck/build/test passaram; backend
  lint/build/test passaram; Cypress smoke passou.
- [x] Rodada 2026-05-26: `npm.cmd --prefix functions run lint`, `build` e
  `test` passaram. Backend: 9 passing, 1 pending no E2E webhook sem emulador.
- [x] Rodada 2026-06-01: `npm.cmd --prefix functions run lint/build/test`
  passaram. Backend: 9 passing, 1 pending no E2E webhook sem emulador.
- [x] Rodada 2026-06-01: `npm.cmd --prefix ingressosZ run qa` passou.
  Frontend: 42 arquivos passaram, 1 skipped; 290 testes passaram, 18 skipped.
- [x] Rodada 2026-06-01: `npm.cmd --prefix ingressosZ audit --omit=dev`
  retornou 0 vulnerabilidades.
- [x] Rodada 2026-06-01: `npm.cmd --prefix functions audit --omit=dev`
  manteve vulnerabilidades moderadas transitivas em `uuid`; sem fix seguro
  automatico no momento.
