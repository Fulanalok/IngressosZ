# planning/ - Roadmap e Pendencias

Atualizado em 2026-06-29.

A documentacao publica para GitHub/LinkedIn foi consolidada em `docs/`. Este
arquivo continua como contexto operacional e roadmap interno.

Este arquivo resume o roadmap. O acompanhamento operacional detalhado fica em
`planning/CHECKLIST_FINALIZACAO.md`.

## Status Tecnico Atual

- [x] Repositorio limpo de configs locais/agentes e artefatos gerados.
- [x] Functions usam `getFirestore()` e API moderna `defineSecret` /
  `defineString`.
- [x] Backend modularizado em `functions/src/endpoints/`.
- [x] Checkout cria `paymentSessions` antes de chamar Mercado Pago.
- [x] Pix cria `paymentSessions` antes de chamar Mercado Pago.
- [x] `paymentSessions.paymentMethod` identifica `checkout` ou `pix`.
- [x] Firestore Rules validam `paymentSessions`, email autenticado e
  `paymentMethod`.
- [x] Webhook valida assinatura HMAC com `MP_WEBHOOK_SECRET`.
- [x] Teste E2E do webhook simula assinatura Mercado Pago.
- [x] Reembolso/admin foi reforcado no backend.
- [x] QR Codes usam JWT assinado com `JWT_SECRET`.
- [x] Roles atuais: `user`, `validator`, `organizer`, `admin`.
- [x] Rotas protegidas usam `RequireAuth` e `RequireRole`.
- [x] Rodada local de lint, typecheck, build e testes passou antes do ultimo
  push confirmado no GitHub.
- [x] Cloud SQL/Data Connect removidos para reduzir custo.
- [x] `SMTP_EMAIL` removido do Secret Manager e migrado para param/env comum.
- [x] Functions implantadas em producao em 2026-06-01.
- [x] `WEB_BASE_URL` realinhado no dotenv local das Functions e Functions
  redeployadas em 2026-06-02.
- [x] Firestore Rules, Storage Rules e Hosting publicados em 2026-06-02.
- [x] UI publica simplificada em junho/2026: fundo preto absoluto, paleta
  preto/azul, sem gradientes, sem vidro-morfismo, sem animacoes de scroll,
  botoes com cantos retos, home direta e datas exibidas como `DD/MM/YYYY`.
- [x] Documentacao reorganizada para apresentacao no GitHub e LinkedIn em
  `README.md` e `docs/`.
- [x] ESLint `complexity` configurado com limite 10 em frontend e Functions em
  2026-06-29.
- [x] Frontend refatorado para passar `complexity` sem excecoes locais.
- [x] Functions passam lint/build/test; handlers legados criticos mantem
  excecoes pontuais de `complexity` para reduzir risco antes do lancamento
  controlado.

## Alta Prioridade Antes de Publico

- [ ] Conferir ambiente Firebase de producao.
- [ ] Confirmar valores reais dos secrets das Functions.
- [ ] Configurar/confirmar `ingressosZ/.env.local`.
- [ ] Confirmar dominios do Firebase Auth, reCAPTCHA v2 e App Check.
- [x] Fazer limpeza leve de arquivos/configs frontend antes do lancamento:
  substituir `/vite.svg`, remover `react.svg` sem uso e remover/alinhar
  `ingressosZ/.firebaserc` + `ingressosZ/firebase.json`.
- [x] Rodar qualidade local completa em 2026-06-29.
- [x] Executar deploy final de `functions`, `firestore:rules`, `storage` e
  `hosting`.
- [ ] Cadastrar URL real de `receiveWebhook` no Mercado Pago com evento
  `Payments`: `https://<your-region>-<your-project>.cloudfunctions.net/receiveWebhook`.
- [ ] Testar compra real controlada via Checkout/cartao.
- [ ] Testar compra real controlada via Pix.
- [ ] Validar ticket, e-mail, QR Code e reembolso/admin em producao.

## Secrets Obrigatorios

Configure via `firebase functions:secrets:set`.

| Secret | Finalidade |
| --- | --- |
| `MP_ACCESS_TOKEN` | Token de producao do Mercado Pago |
| `MP_WEBHOOK_SECRET` | Assinatura HMAC do webhook Mercado Pago |
| `JWT_SECRET` | Assinatura dos QR Codes JWT |
| `SMTP_PASSWORD` | Senha/app password do remetente |
| `RECAPTCHA_V2_SECRET` | Validacao do reCAPTCHA v2 |

## Params das Functions

Configure em `functions/.env` ou pelo prompt do Firebase deploy.

| Param | Default recomendado | Finalidade |
| --- | --- | --- |
| `SENTRY_DSN` | vazio ou DSN Sentry | Monitoramento backend |
| `WEB_BASE_URL` | `https://<your-firebase-project-id>.web.app` | URLs em e-mails/back URLs |
| `SMTP_EMAIL` | vazio | Remetente dos e-mails |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | `465` | Porta SMTP TLS |

## Variaveis Frontend

Referencia completa em `ingressosZ/.env.example`.

Obrigatorias para producao:

- Firebase Web App: `VITE_FIREBASE_*`
- Mercado Pago: `VITE_MERCADOPAGO_PUBLIC_KEY`
- reCAPTCHA v2: `VITE_RECAPTCHA_V2_SITE_KEY`
- App Check: `VITE_APPCHECK_RECAPTCHA_ENTERPRISE_KEY`
- Regiao Functions: `VITE_FUNCTIONS_REGION=southamerica-east1`
- `VITE_USE_EMULATORS=false`
- Sentry opcional: `VITE_SENTRY_DSN`

## Ordem Recomendada

1. Marcar itens em `planning/CHECKLIST_FINALIZACAO.md`.
2. Confirmar projeto Firebase ativo com `npx firebase-tools use`.
3. Configurar/confirmar secrets:
   `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `JWT_SECRET`, `SMTP_PASSWORD`,
   `RECAPTCHA_V2_SECRET`.
4. Confirmar `functions/.env`: `WEB_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_EMAIL`, `SENTRY_DSN`.
5. Confirmar `ingressosZ/.env.local`.
6. Conferir que `WEB_BASE_URL` segue apontando para o Hosting oficial.
7. Rodar qualidade local:
   `npm --prefix ingressosZ run lint`,
   `npm --prefix ingressosZ run typecheck`,
   `npm --prefix ingressosZ run build`,
   `npm --prefix ingressosZ run test`,
   `npm --prefix functions run lint`,
   `npm --prefix functions run build`,
   `npm --prefix functions run test`.
   Status 2026-06-29: `npm.cmd --prefix ingressosZ run qa` passou com
   288 testes passing e 18 skipped; `npm.cmd --prefix functions run test`
   passou com 9 passing e 1 pending.
8. Fazer deploy quando houver nova alteracao, sempre pela raiz do repo:
   `npx firebase-tools deploy --only firestore:rules,storage,functions,hosting --project <your-firebase-project-id>`.
9. Registrar URL de `receiveWebhook` no Mercado Pago.
10. Fazer compra controlada de baixo valor com Checkout e Pix.
11. Validar `paymentSessions`, `purchases`, `tickets`, e-mail, QR Code,
    reembolso/admin, logs e Sentry.

## Criterios de Aceite para Publicacao

- Compra aprovada gera tickets apenas uma vez.
- Estoque global e por tipo e decrementado corretamente.
- Oversell cria estado de falha/reembolso rastreavel.
- Usuario sem role nao acessa admin/validador.
- Webhook sem assinatura valida e rejeitado.
- Sentry recebe erros de frontend/backend, se habilitado.
- Regras Firestore impedem escrita direta em `tickets` e `purchases`.
- Checklist final esta marcado nos itens criticos.

## Limpeza Leve Monitorada

- `ingressosZ/public/vite.svg` foi removido; favicon usa `/pwa-192.png` e
  Open Graph/Twitter/SEO default usam `/pwa-512.png`.
- `ingressosZ/src/assets/react.svg` foi removido por falta de uso.
- `ingressosZ/.firebaserc` e `ingressosZ/firebase.json` foram removidos para
  evitar deploy acidental fora da raiz.
- Home/listagem agora seguem visual direto em preto e azul: sem
  gradientes/degrades, sem vidro-morfismo, sem animacoes de scroll, sem cards de
  metricas na dobra inicial e com a chamada principal "Compre seus ingressos com
  seguranca aqui".
- Datas devem usar `formatDisplayDate` de `ingressosZ/src/lib/date.ts` para
  evitar exibicao crua com hifens.
- Rotas/dev tools existem apenas em `import.meta.env.DEV`; manter ate o teste
  real se ainda ajudarem, depois revisar para reduzir superficie de manutencao.
