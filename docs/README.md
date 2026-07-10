# Documentacao do IngressosZ

Esta pasta organiza a documentacao publica do projeto para leitura no GitHub,
portfolio e apresentacao no LinkedIn.

## Guia rapido

| Documento | Quando usar |
| --- | --- |
| [PROJECT.md](PROJECT.md) | Entender o produto, escopo e principais recursos. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Explicar arquitetura, fluxo de pagamento e emissoes de ingressos. |
| [OPERATIONS.md](OPERATIONS.md) | Rodar localmente, testar, configurar ambiente e fazer deploy. |
| [SECURITY.md](SECURITY.md) | Apresentar decisoes de seguranca, regras e pendencias de producao. |
| [PUBLIC_RELEASE_SECURITY.md](PUBLIC_RELEASE_SECURITY.md) | Conferir se o repositorio pode ficar publico sem expor dados sensiveis. |
| [LINKEDIN.md](LINKEDIN.md) | Preparar a apresentacao do projeto no LinkedIn. |

## Status resumido

- Site publicado: https://<your-firebase-project-id>.web.app
- Backend: Firebase Functions v2 em `southamerica-east1`.
- Banco e storage: Firestore e Firebase Storage.
- Pagamentos: Mercado Pago Checkout Pro e Pix.
- Estado para portfolio: pronto para demonstracao controlada.
- Estado para uso comercial amplo: ainda depende dos testes reais e revisoes
  listados em [OPERATIONS.md](OPERATIONS.md).

## Documentos operacionais internos

Os arquivos abaixo mantem historico, checklist detalhado e contexto para
manutencao:

- [planning/CHECKLIST_FINALIZACAO.md](../planning/CHECKLIST_FINALIZACAO.md)
- [planning/CONTEXT.md](../planning/CONTEXT.md)
- [ops/CONTEXT.md](../ops/CONTEXT.md)
- [architecture/CONTEXT.md](../architecture/CONTEXT.md)
- [functions/API.md](../functions/API.md)
