# Checklist de Finalizacao - IngressosZ

Atualizado em 2026-05-26.

Este arquivo consolida o que falta para levar o IngressosZ a um estado pronto
para uso publico controlado. Marque os itens conforme forem concluidos e deixe
observacoes curtas quando algum item depender de acesso externo, conta ou
validacao manual.

## Leitura Rapida

- [x] Repositorio limpo de artefatos locais e alinhado com `origin/main`.
- [x] Frontend React/Vite organizado em paginas, componentes, hooks, services e
  rotas protegidas.
- [x] Backend Firebase Functions modularizado por dominio em
  `functions/src/endpoints/`.
- [x] Checkout/Pix usam `paymentSessions`.
- [x] Webhook Mercado Pago valida HMAC com `MP_WEBHOOK_SECRET`.
- [x] Tickets usam QR Code JWT assinado com `JWT_SECRET`.
- [x] Regras Firestore bloqueiam escrita direta em `tickets` e `purchases`.
- [x] Paginas publicas de Termos e Privacidade foram reforcadas para LGPD,
  CDC/e-commerce, contato publico, incidentes e reembolso.
- [x] Sentry e logs de erro foram reduzidos para evitar coleta excessiva de
  dados pessoais.
- [x] App Check e rate limits foram aplicados nas Functions sensiveis.
- [x] `seedDatabase` fica bloqueada fora do emulador.
- [ ] Ambiente de producao conferido ponta a ponta.
- [ ] Deploy completo executado apos nova rodada de qualidade.
- [ ] Fluxos reais de pagamento, ticket, e-mail, QR e reembolso validados.

## 1. Ambiente Firebase

- [x] Confirmar que `.firebaserc` aponta para `<your-firebase-project-id>`.
- [x] Rodar `firebase use` e confirmar o projeto ativo antes do deploy.
- [x] Confirmar URL final do Hosting atual.
  - 2026-05-25: `firebase hosting:sites:list` mostrou o site
    `https://<your-project>.web.app`.
  - 2026-05-26: defaults e documentacao foram alinhados para essa URL.
    Dominio proprio/curto pode ser configurado depois, mas nao e requisito
    para o primeiro deploy controlado.
- [x] Confirmar que a regiao das Functions e `southamerica-east1`.
- [ ] Confirmar que Auth, Firestore, Storage, Functions e Hosting estao ativos
  no projeto Firebase.
  - 2026-05-25: Firestore, Functions, Hosting e Web Apps confirmados via CLI.
    Storage/Auth e dominios autorizados ainda exigem conferencia no console.
- [ ] Confirmar dominios autorizados no Firebase Auth.

## 2. Secrets e Params das Functions

Configure secrets com `firebase functions:secrets:set`.

- [ ] `MP_ACCESS_TOKEN` configurado com token de producao do Mercado Pago.
- [ ] `MP_WEBHOOK_SECRET` configurado e igual ao segredo usado no painel do
  Mercado Pago.
- [ ] `JWT_SECRET` configurado com valor forte e exclusivo de producao.
- [ ] `SMTP_EMAIL` configurado.
- [ ] `SMTP_PASSWORD` configurado com app password ou credencial apropriada.
- [ ] `RECAPTCHA_V2_SECRET` configurado.
- [ ] `functions/.env` criado localmente quando necessario.
  - 2026-05-25: nao existe `functions/.env`; existe
    `functions/.env.<your-firebase-project-id>` gerado pelo Firebase CLI.
    Conferir valores sem versionar secrets.
- [ ] `SMTP_HOST=smtp.gmail.com` confirmado ou ajustado para o provedor real.
- [ ] `SMTP_PORT=465` confirmado ou ajustado para o provedor real.
- [x] `WEB_BASE_URL=https://<your-project>.web.app` confirmado como
  default do projeto.
- [ ] `SENTRY_DSN` definido se o monitoramento backend for usado em producao.

## 3. Variaveis do Frontend

Use `ingressosZ/.env.example` como base para `ingressosZ/.env.local`.

2026-05-25: existe `ingressosZ/.env`; nao existe `ingressosZ/.env.local`.
Conferir se este arquivo local aponta para a URL final escolhida e se nao usa
emuladores em producao.

- [ ] `VITE_FIREBASE_API_KEY` configurado.
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` configurado.
- [ ] `VITE_FIREBASE_PROJECT_ID` configurado.
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` configurado.
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` configurado.
- [ ] `VITE_FIREBASE_APP_ID` configurado.
- [ ] `VITE_FIREBASE_MEASUREMENT_ID` configurado, se Analytics for usado.
- [ ] `VITE_FUNCTIONS_REGION=southamerica-east1` confirmado.
- [ ] `VITE_API_URL` conferido para o modo de chamada usado pelo frontend.
- [ ] `VITE_MERCADOPAGO_PUBLIC_KEY` configurado com chave publica correta.
- [ ] `VITE_RECAPTCHA_V2_SITE_KEY` configurado.
- [ ] `VITE_APPCHECK_RECAPTCHA_ENTERPRISE_KEY` configurado.
- [ ] `VITE_APPCHECK_DEBUG_TOKEN=false` em producao.
- [ ] `VITE_USE_EMULATORS=false` em producao.
- [ ] `VITE_SENTRY_DSN` definido se o monitoramento frontend for usado.
- [ ] `VITE_SENTRY_TRACES_SAMPLE_RATE=0.1` ou menor em producao.
- [ ] `VITE_LEGAL_BRAND_NAME` configurado.
- [ ] `VITE_LEGAL_CONTROLLER_NAME` configurado.
- [ ] `VITE_LEGAL_CONTROLLER_DOCUMENT` configurado com CNPJ/CPF publico.
- [ ] `VITE_LEGAL_CONTROLLER_ADDRESS` configurado.
- [ ] `VITE_LEGAL_SUPPORT_EMAIL` configurado e funcionando.
- [ ] `VITE_LEGAL_PRIVACY_EMAIL` configurado e funcionando.
- [ ] `VITE_LEGAL_DPO_NAME` configurado, quando houver encarregado formal.

## 4. Dominios, reCAPTCHA e App Check

- [ ] Dominio `<your-project>.web.app` autorizado no Firebase Auth.
- [ ] Dominio final de producao autorizado no Firebase Auth, se houver dominio
  proprio.
- [ ] Dominio `<your-project>.web.app` autorizado no reCAPTCHA v2.
- [ ] Dominio final de producao autorizado no reCAPTCHA v2, se houver dominio
  proprio.
- [ ] Dominio `<your-project>.web.app` autorizado no reCAPTCHA
  Enterprise/App Check.
- [ ] App Check testado sem token de debug.
- [ ] Login e cadastro testados sem erro de reCAPTCHA em producao.
- [ ] Enforcement do App Check ativado no console Firebase para Firestore,
  Storage e Functions depois de confirmar dominio final.
- [ ] Conferir no console se App Check esta recebendo trafego valido apos o
  deploy.

## 5. Qualidade Local Antes do Deploy

Instale dependencias antes da rodada de qualidade.

- [x] Rodar `npm install`.
- [x] Rodar `npm run install:all`.
  - 2026-05-25: script ajustado para instalar frontend/backend em sequencia;
    passou localmente.
- [x] Rodar `npm --prefix ingressosZ run lint`.
- [x] Rodar `npm --prefix ingressosZ run typecheck`.
- [x] Rodar `npm --prefix ingressosZ run build`.
- [x] Rodar `npm --prefix ingressosZ run test`.
- [x] Rodar `npm --prefix functions run lint`.
- [x] Rodar `npm --prefix functions run build`.
- [x] Rodar `npm --prefix functions run test`.
- [ ] Rodar teste com emulador quando possivel:
  `npm run test:emulator`.
  - [ ] Instalar Java/JDK e garantir `java -version` no PATH para rodar os
    emuladores Firebase nesta maquina.
- [x] Registrar aqui qualquer teste pendente ou pulado:
  `2026-05-25: frontend Vitest 42 arquivos passaram, 1 skipped; 290 testes passaram, 18 skipped. Backend Mocha 9 passing, 1 pending no E2E webhook sem emulador no teste normal. Cypress E2E smoke passou com 1 spec/1 teste. npm run test:emulator nao rodou nesta maquina porque Java nao esta instalado/no PATH.`
- [x] Registrar rodada apos melhorias LGPD/App Check/rate limit:
  `2026-05-25: npm.cmd --prefix ingressosZ run lint/typecheck/build/test passaram. npm.cmd --prefix functions run lint/build/test passaram. Backend segue com 9 passing e 1 pending no E2E webhook sem emulador.`
- [x] Registrar rodada apos alinhamento de URL/contextos:
  `2026-05-26: npm.cmd --prefix functions run lint/build/test passaram. Backend segue com 9 passing e 1 pending no E2E webhook sem emulador.`
- [x] Validar localmente os passos do GitHub Actions `Quality Check (Lint &
  Tests)` e `Build Verification`, incluindo Cypress E2E smoke test.
- [x] Confirmar no GitHub que o workflow mais recente passou.
  - 2026-05-26: usuario confirmou que o pipeline passou sem defeitos apos o
    push do commit `de58e3f`.

## 6. Deploy

- [x] Confirmar que nao ha alteracoes locais inesperadas com `git status`.
  - 2026-05-26: branch local partiu de `1baef6c`; apos alinhar URL,
    checklist e contextos, confirmar novamente antes do deploy final.
- [ ] Fazer deploy das regras Firestore:
  `firebase deploy --only firestore:rules`.
- [ ] Fazer deploy das regras Storage:
  `firebase deploy --only storage`.
- [ ] Fazer deploy das Functions:
  `firebase deploy --only functions`.
- [ ] Fazer build do frontend:
  `npm --prefix ingressosZ run build`.
- [ ] Fazer deploy do Hosting:
  `firebase deploy --only hosting`.
- [ ] Alternativamente, executar deploy completo:
  `firebase deploy --only firestore:rules,storage,functions,hosting`.
- [ ] Guardar URL publica da Function `receiveWebhook`.
- [ ] Conferir logs iniciais apos deploy.

## 7. Mercado Pago

- [ ] Confirmar que as credenciais usadas sao de producao.
- [ ] Cadastrar a URL publica da Function `receiveWebhook` no painel Mercado
  Pago.
- [ ] Habilitar evento `Payments`.
- [ ] Confirmar que o segredo do webhook no Mercado Pago bate com
  `MP_WEBHOOK_SECRET`.
- [ ] Fazer pagamento real de baixo valor via Checkout/cartao.
- [ ] Fazer pagamento real de baixo valor via Pix.
- [ ] Confirmar que webhooks chegam sem erro de assinatura.
- [ ] Confirmar que pagamentos rejeitados/cancelados nao emitem tickets.
- [ ] Confirmar que reprocessamento de webhook nao duplica tickets.

## 8. Validacao Funcional Ponta a Ponta

- [ ] Criar ou revisar evento barato de teste.
- [ ] Comprar ingresso via Checkout.
- [ ] Comprar ingresso via Pix.
- [ ] Confirmar `paymentSessions.status`.
- [ ] Confirmar `purchases.status`.
- [ ] Confirmar decremento de estoque global.
- [ ] Confirmar decremento de estoque por tipo de ingresso, quando aplicavel.
- [ ] Confirmar criacao dos documentos em `tickets`.
- [ ] Confirmar que e-mail transacional foi enviado.
- [ ] Abrir pagina "Meus ingressos" e conferir ticket emitido.
- [ ] Validar QR Code com usuario `validator`.
- [ ] Validar QR Code com usuario `organizer`.
- [ ] Validar QR Code com usuario `admin`.
- [ ] Confirmar que usuario sem role nao acessa admin/validador.
- [ ] Confirmar que QR Code ja usado nao valida novamente.
- [ ] Testar reembolso/admin em compra elegivel.
- [ ] Confirmar estado de auditoria apos reembolso.

## 9. Seguranca e Regras

- [x] Revisar `firestore.rules` antes do deploy final.
- [x] Revisar `storage.rules` antes do deploy final.
- [x] Rodar `npm --prefix ingressosZ audit --omit=dev` e confirmar 0
  vulnerabilidades de producao no frontend.
- [ ] Resolver vulnerabilidades moderadas transitivas de producao no backend
  ligadas a `uuid` quando houver caminho sem `npm audit fix --force`
  quebrando Mercado Pago/Firebase.
  - 2026-05-25: `npm --prefix functions audit --omit=dev` ainda aponta
    vulnerabilidades moderadas transitivas por `uuid`; `npm audit fix --force`
    faria downgrade quebravel de `mercadopago`, entao ficou como pendencia
    monitorada.
- [x] Confirmar que cliente nao escreve diretamente em `tickets`.
- [x] Confirmar que cliente nao escreve diretamente em `purchases`.
- [x] Confirmar que `paymentSessions.userId` precisa bater com
  `request.auth.uid`.
- [x] Confirmar que `paymentSessions.userEmail` bate com o e-mail autenticado
  quando presente.
- [x] Confirmar que `paymentMethod` aceita apenas `checkout` ou `pix`.
- [x] Confirmar que role comum nao altera `users.role`.
- [ ] Confirmar custom claims reais do admin:
  `admin: true` e `role: "admin"`.
- [x] Sentry frontend inicializa somente com DSN configurado e sem PII padrao.
- [x] Sentry backend inicializa somente com DSN configurado e amostragem menor.
- [x] `logClientError` aplica rate limit e sanitiza campos sensiveis.
- [x] PWA nao faz cache automatico de respostas Firestore com dados pessoais.
- [x] Callables sensiveis exigem App Check.
- [x] Endpoints HTTP publicos de pagamento/validacao exigem App Check.
- [x] `seedDatabase` fica desabilitada fora do emulador.
- [x] Rate limiter falha fechado quando o controle nao consegue ser avaliado.
- [x] `validateTicket` envia `X-Firebase-AppCheck` pelo frontend.
- [ ] Avaliar token consumivel/replay protection para operacoes criticas apos
  validar compatibilidade do frontend em producao.
- [ ] Ativar enforcement do App Check no console para Firestore/Storage/
  Functions quando o dominio final estiver validado.
- [ ] Testar em producao que App Check nao bloqueia login, cadastro, checkout,
  Pix, validacao de QR, logs e reembolso.

## 10. Observabilidade e Operacao

- [ ] Confirmar Sentry frontend, se usado.
- [ ] Confirmar Sentry backend, se usado.
- [ ] Gerar erro controlado no frontend e verificar captura.
- [ ] Gerar erro controlado/backend seguro e verificar captura.
- [ ] Conferir logs de `receiveWebhook`.
- [ ] Conferir logs de `createPaymentPreference`.
- [ ] Conferir logs de `createPixPayment`.
- [ ] Conferir logs de `refundPayment`.
- [ ] Definir rotina de acompanhamento apos primeiras compras reais.
- [ ] Criar alertas de pico de erros 401/403/429 nas Functions.
- [ ] Criar alertas de custo/quota para Functions, Firestore, Auth, Storage e
  Hosting.

## 11. Documentacao e Handoff

- [x] Atualizar `planning/CONTEXT.md` com data e commit atuais.
- [ ] Atualizar `ops/CONTEXT.md` apos deploy real.
- [x] Revisar `specs/CONTEXT.md`, pois ha trechos antigos sobre QR Code com
  hash/TICKET_SECRET que devem refletir o fluxo atual com JWT_SECRET.
- [ ] Registrar URL final do webhook Mercado Pago.
- [x] Registrar quais comandos de qualidade passaram e em qual data.
- [x] Registrar qualquer limitacao que ainda ficou para depois do lancamento.

## 12. Pos-Lancamento

Itens desejaveis, mas nao bloqueiam o primeiro uso controlado.

- [ ] Desenhar fluxo de validacao offline de QR Code, se for requisito real.
- [ ] Melhorar dashboard operacional com metricas de venda e falhas.
- [ ] Criar rotina de reconciliacao Mercado Pago x Firestore.
- [ ] Criar playbook de incidentes para webhook/pagamentos.
- [ ] Automatizar smoke tests pos-deploy.
- [ ] Regenerar grafo local `.code-review-graph/` apenas quando for usar
  ferramentas de analise; a pasta deve continuar ignorada pelo Git.

## 13. Legal e Conformidade Brasil

- [ ] Revisar Termos de Uso com advogado antes do lancamento publico.
- [ ] Revisar Politica de Privacidade com advogado antes do lancamento publico.
- [ ] Preencher CNPJ/CPF, razao/nome publico, endereco e canais de contato nos
  envs `VITE_LEGAL_*`.
- [ ] Confirmar se a operacao exige CNPJ, nota fiscal, contrato com
  organizadores, tributacao especifica ou emissao de documentos fiscais.
- [ ] Definir regra publica para cancelamento, adiamento, reembolso e direito
  de arrependimento.
- [ ] Definir como a plataforma tratara meia-entrada quando o evento estiver
  sujeito a regras brasileiras de meia-entrada.
- [ ] Publicar canal de atendimento ao consumidor e fluxo de acompanhamento de
  reclamacoes.
- [ ] Criar procedimento interno de resposta a incidentes LGPD, incluindo
  registro por pelo menos 5 anos quando houver incidente com dados pessoais.
- [ ] Definir rotina para atendimento de direitos dos titulares: acesso,
  correcao, exclusao, portabilidade, oposicao e revogacao de consentimento.
- [ ] Confirmar contratos ou termos de operador com Firebase/Google, Mercado
  Pago, provedor de e-mail e Sentry.

## 14. Rate Limit, DDoS e Banco

Camada ja implementada no codigo:

- [x] `createPaymentPreference`: App Check obrigatorio e limite de 10
  requisicoes/minuto por usuario autenticado.
- [x] `createPixPayment`: App Check obrigatorio e limite de 10
  requisicoes/minuto por usuario autenticado.
- [x] `createPaymentPreferencePublic`: `X-Firebase-AppCheck` obrigatorio e
  limite de 10 requisicoes/minuto por IP.
- [x] `createPixPaymentPublic`: `X-Firebase-AppCheck` obrigatorio e limite de
  10 requisicoes/minuto por IP.
- [x] `validateTicket`: `X-Firebase-AppCheck`, Firebase ID token, role
  `validator`/`organizer`/`admin` e limite de 30 validacoes/minuto por
  validador.
- [x] `logClientError`: App Check obrigatorio, sanitizacao de payload e limite
  de 30 logs/minuto por usuario/IP.
- [x] `refundPayment`: App Check obrigatorio, admin e limite de 10
  reembolsos/minuto por admin.
- [x] `setAdminRole`: App Check obrigatorio, admin e limite de 10 alteracoes de
  admin/minuto.
- [x] `setUserRole`: App Check obrigatorio e limite de 20 alteracoes de
  role/minuto.
- [x] Firestore bloqueia escrita direta em `tickets`, `purchases` e qualquer
  colecao nao mapeada.
- [x] Storage limita upload a usuarios autenticados/organizadores e imagens de
  ate 5 MB nos caminhos permitidos.

Camada que depende do Firebase/GCP:

- [ ] Ativar enforcement do App Check no console para Firestore, Storage e
  Functions.
- [ ] Confirmar metricas do App Check sem queda indevida de usuarios reais.
- [ ] Definir quotas e alertas de custo no Google Cloud Billing.
- [ ] Definir alertas para crescimento anormal de leitura/escrita no Firestore.
- [ ] Avaliar Cloud Armor/load balancer ou arquitetura equivalente para DDoS
  volumetrico antes de divulgacao publica grande.
- [ ] Registrar procedimento de resposta: pausar campanha, reduzir quotas,
  bloquear dominio/origem abusiva, rotacionar secrets e revisar logs.

## Criterios de Pronto para Publico

- [x] Lint, typecheck, build e testes passam em frontend e backend.
- [ ] Deploy completo foi executado sem erro.
- [ ] Webhook Mercado Pago recebeu pagamentos reais em Checkout e Pix.
- [ ] Compra aprovada gerou tickets apenas uma vez.
- [ ] E-mail de confirmacao chegou corretamente.
- [ ] QR Code validou presencialmente com roles permitidas.
- [ ] Reembolso/admin funcionou em compra elegivel.
- [ ] Firestore/Storage Rules publicadas e revisadas.
- [ ] App Check enforcement ativo e testado em producao.
- [ ] Alertas de custo/quota/erros configurados.
- [ ] Sentry/logs confirmados.
- [ ] Pendencias criticas deste arquivo estao marcadas como concluidas.
