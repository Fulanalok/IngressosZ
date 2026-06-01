# Plano de Reducao de Custos - IngressosZ

Atualizado em 2026-06-01.

Base analisada: `Pagamento do Firebase_Relatorios, 2025-06-01 - 2026-06-30.csv`.

## Resumo do Relatorio

Total arredondado do periodo analisado: **R$ 49,49**.

| Servico | Total arredondado | Observacao |
| --- | ---: | --- |
| Cloud SQL | R$ 28,12 | Principal custo. O repo tinha configuracao de Data Connect/SQL Connect para a instancia `ingressosz-main-fdc`, mas o app atual usa Firestore. |
| Secret Manager | R$ 21,37 | Segundo maior custo. Cobranca costuma crescer com versoes ativas de secrets e acessos. |
| Cloud Run Functions | R$ 0,00 | Dentro de credito/free tier no periodo. |
| Cloud Storage | R$ 0,00 | Uso residual. |

## Mudancas Aplicadas no Codigo

- [x] Removida a configuracao local de Data Connect/SQL Connect do repo para
  evitar redeploy acidental de Cloud SQL nao usado.
- [x] `SMTP_EMAIL` deixou de ser `defineSecret` e virou `defineString`, pois o
  remetente de e-mail nao precisa ocupar versao ativa no Secret Manager.
- [x] `onTicketCreated` e `receiveWebhook` nao montam mais `SMTP_EMAIL` como
  secret.
- [x] Documentacao atualizada para configurar `SMTP_EMAIL` em `functions/.env`.

## Corte Imediato Recomendado

1. **Cloud SQL/Data Connect**
   - Confirmar no console se a instancia `ingressosz-main-fdc` nao esta sendo
     usada.
   - Se nao estiver em uso, excluir o servico Data Connect/SQL Connect e a
     instancia Cloud SQL associada.
   - Impacto esperado: remove a maior fonte de custo recorrente.

2. **Secret Manager**
   - Apos novo deploy das Functions, excluir ou destruir versoes antigas do
     secret `SMTP_EMAIL`.
   - Para os secrets que continuam necessarios, manter apenas a versao atual
     ativa e destruir versoes antigas.
   - Secrets que continuam necessarios:
     - `MP_ACCESS_TOKEN`
     - `MP_WEBHOOK_SECRET`
     - `JWT_SECRET`
     - `SMTP_PASSWORD`
     - `RECAPTCHA_V2_SECRET`

3. **Billing e Quotas**
   - Criar budget mensal baixo com alerta em 50%, 80% e 100%.
   - Criar alertas para crescimento anormal de Cloud SQL, Secret Manager,
     Firestore reads/writes e Functions invocations.

## Comandos de Conferencia

Use estes comandos apenas se `gcloud` estiver instalado e autenticado.

```powershell
gcloud sql instances list --project <your-firebase-project-id>
gcloud secrets list --project <your-firebase-project-id>
gcloud secrets versions list SMTP_EMAIL --project <your-firebase-project-id>
```

Depois do deploy novo, se `SMTP_EMAIL` nao for mais usado como secret:

```powershell
gcloud secrets delete SMTP_EMAIL --project <your-firebase-project-id>
```

Para secrets que ainda precisam existir, destruir versoes antigas em vez de
apenas desabilitar:

```powershell
gcloud secrets versions destroy VERSION --secret=SECRET_NAME --project <your-firebase-project-id>
```

## Nao Cortar Agora

- Nao remover `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `JWT_SECRET`,
  `SMTP_PASSWORD` ou `RECAPTCHA_V2_SECRET`.
- Nao reduzir seguranca removendo App Check/rate limit.
- Nao excluir buckets Storage se houver imagens de eventos em uso.

## Referencias Oficiais

- Firebase Pricing: https://firebase.google.com/pricing
- Cloud SQL Pricing: https://cloud.google.com/sql/pricing
- Secret Manager Pricing: https://cloud.google.com/secret-manager/pricing

