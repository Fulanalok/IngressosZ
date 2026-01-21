# IngressosZ

Sistema completo de gerenciamento e venda de ingressos com Firebase (Auth, Firestore, Functions) e integração Mercado Pago. Frontend em React + Vite.

## Pré‑requisitos

- Node.js 18+ (recomendado 20/22)
- Firebase CLI (`npm install -g firebase-tools`)
- Conta Firebase e projeto criado
- Conta Mercado Pago (token de acesso)

## Setup Rápido (Windows, PowerShell)

1. Clonar e entrar no projeto

```
git clone https://github.com/Fulanalok/IngressosZ.git
cd IngressosZ
```

2. Backend (Functions)

```
cd functions
Copy-Item .env.example .env
# Edite .env e preencha:
# MERCADOPAGO_ACCESS_TOKEN=SEU_TOKEN
# ALLOWED_ORIGINS=http://localhost:5173
# FRONTEND_URL=http://localhost:5173
npm install
npm run serve
```

3. Frontend (Vite)

```
cd ../ingressosZ
Copy-Item .env.example .env.local
# Edite .env.local com credenciais Firebase
npm install
npm run dev
# ou
npm run dev:https
```

4. Acessar

- Frontend: `http://localhost:5173` ou `https://localhost:5173`
- Emulator UI (se usado): `http://localhost:4000`

## Emuladores Firebase

Rodar em terminais separados:

```
npm run emulators:auth-firestore
npm run functions:serve
npm run web:dev:https
```

Se preferir HTTP: `npm run web:dev`.

## Testes QA (Cucumber + Playwright)

Execução básica:

```
$env:BASE_URL='https://localhost:5173'
npm run qa:test
```

Visualização em tempo real (navegador visível):

```
$env:HEADED='1'; $env:SLOWMO='150'; $env:BASE_URL='https://localhost:5173'
npm run qa:test
```

Inspector do Playwright:

```
$env:PWDEBUG='1'; $env:BASE_URL='https://localhost:5173'
npm run qa:test
```

Trace interativo:

```
npx playwright show-trace .\playwright-trace.zip
```

Relatório HTML (se habilitado):

```
$env:BASE_URL='https://localhost:5173'
npm run qa:report
```

## Boas Práticas de Segredos

- Não comitar arquivos `.env` e `.env.local`. Use os arquivos de exemplo (`functions/.env.example`, `ingressosZ/.env.example`) e copie localmente.
- O `.gitignore` está configurado para evitar que segredos e artefatos temporários sejam versionados.

## Problemas Comuns

- `ERR_CONNECTION_REFUSED`: garanta que o frontend esteja rodando (`npm run dev`/`npm run dev:https`) e ajuste `BASE_URL` conforme o endereço no console do Vite.
- PowerShell interpretando comandos com `-`: digite `npm run ...` diretamente, sem prefixos ou hífens isolados.
- Script `dev:all`: se houver erros de sintaxe no `start.ps1`, suba manualmente os três serviços (emuladores, functions, frontend) conforme comandos acima.

## Deploy (opcional)

```
cd functions
npm run deploy
```

