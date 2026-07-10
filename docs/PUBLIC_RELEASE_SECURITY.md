# Public Release Security Checklist

Use this checklist before making the repository public.

## Repository contents

- [ ] Keep real `.env`, `.env.local`, `.env.<project-id>` and Firebase dotenv
      files untracked.
- [ ] Keep service account files, private keys, certificates and provider
      credentials out of Git.
- [ ] Use placeholders in documentation for project IDs, webhook URLs and
      production domains unless the value is intentionally public.
- [ ] Do not commit logs that may contain request headers, webhook payloads,
      emails, user IDs or provider responses.
- [ ] Keep development routes guarded by `import.meta.env.DEV`.

## Firebase

- [ ] Replace `demo-ingressosz` in `.firebaserc` with your own Firebase project
      locally before deploying.
- [ ] Restrict Firebase Web API keys by HTTP referrer in Google Cloud Console.
- [ ] Confirm Firebase Auth authorized domains only include expected domains.
- [ ] Enable App Check enforcement after validating the frontend and Functions.
- [ ] Review Firestore and Storage rules before allowing real users.

## Secrets

- [ ] Store `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `JWT_SECRET`,
      `SMTP_PASSWORD` and `RECAPTCHA_V2_SECRET` in Firebase Secret Manager.
- [ ] Rotate any token or password that may have been committed, shared in chat,
      pasted in logs or used in a public demo.
- [ ] Use separate sandbox and production credentials for Mercado Pago.
- [ ] Keep Sentry DSNs and sample rates in environment files, not hardcoded.

## Webhooks and payments

- [ ] Configure Mercado Pago webhook only in the provider dashboard.
- [ ] Verify webhook signature validation with the same value stored in
      `MP_WEBHOOK_SECRET`.
- [ ] Test idempotency with repeated webhook deliveries before accepting real
      payments.
- [ ] Avoid documenting the concrete production webhook URL in public files.

## Before publishing

Run a final local scan:

```bash
rg -n --hidden -S "gh[pousr]_|sk_live|sk_test|xox[baprs]-|BEGIN .*PRIVATE KEY|MP_ACCESS_TOKEN|MP_WEBHOOK_SECRET|JWT_SECRET|SMTP_PASSWORD|RECAPTCHA_V2_SECRET|private_key|client_secret" .
```

Expected result: only placeholders, code references or documentation naming the
required secret variables.
