# Guia para Apresentar no LinkedIn

Este guia ajuda a falar do IngressosZ de forma clara, honesta e interessante
para portfolio.

## Mensagem principal

IngressosZ e uma plataforma de ingressos digitais com React, Firebase e Mercado
Pago. O projeto demonstra um fluxo completo: eventos, checkout, Pix, webhook,
emissao de tickets com QR Code e validacao presencial.

## O que destacar

- Produto realista, nao apenas tela estatica.
- Frontend publicado em Firebase Hosting.
- Backend serverless com Firebase Functions v2.
- Pagamento rastreavel com `paymentSessions`.
- Webhook Mercado Pago validado por assinatura HMAC.
- QR Code assinado com JWT.
- Regras Firestore/Storage para proteger dados sensiveis.
- Painel admin, roles e reembolso.
- Checklist separando portfolio de producao comercial.

## O que evitar prometer

Evite escrever que o sistema ja esta pronto para vender ao publico sem ressalva.
O mais correto e dizer:

> Projeto pronto para demonstracao/portfolio, com pendencias finais mapeadas
> para uso comercial em producao.

## Roteiro curto para video ou post

1. Mostrar a home e a listagem de eventos.
2. Abrir um evento e explicar a compra.
3. Explicar rapidamente `paymentSessions`.
4. Mostrar a ideia do QR Code em "Meus ingressos".
5. Mostrar a tela do validador.
6. Fechar com stack, seguranca e proximos passos.

## Sugestao de post

```text
Publiquei o IngressosZ, uma plataforma de ingressos digitais que desenvolvi
como projeto de portfolio.

A ideia foi construir um fluxo completo, indo alem da interface:

- listagem de eventos;
- checkout com Mercado Pago;
- Pix;
- webhook de pagamento;
- emissao de tickets digitais;
- QR Code assinado;
- validacao presencial;
- painel admin;
- regras de seguranca no Firestore/Storage.

Stack principal:
React, TypeScript, Vite, Tailwind CSS, Firebase Auth, Firestore, Storage,
Cloud Functions v2, Mercado Pago e Sentry.

O projeto esta pronto para demonstracao controlada e tem um checklist claro do
que ainda precisa ser validado antes de uso comercial amplo, como compra real,
webhook em producao, e-mail transacional, App Check e revisao legal.

Demo:
https://<your-project>.web.app

Repositorio:
https://github.com/Fulanalok/IngressosZ
```

## Checklist antes de postar

- [ ] Abrir a demo em aba anonima.
- [ ] Conferir que a home nao fica em tela branca.
- [ ] Conferir cards de evento com imagem.
- [ ] Conferir README no GitHub.
- [ ] Conferir se o repositorio nao expoe secrets.
- [ ] Fazer pelo menos uma captura de tela limpa da home/eventos.
- [ ] Usar linguagem de portfolio/demo, nao promessa comercial ampla.

## Perguntas que podem aparecer

**Por que Firebase?**

Para reduzir custo operacional, acelerar deploy e usar Auth, Firestore,
Storage, Functions e Hosting em uma base unica.

**Por que `paymentSessions`?**

Para ter rastreabilidade entre a intencao criada no frontend, a resposta do
Mercado Pago, o webhook e a emissao final dos tickets.

**Como evita ticket falso?**

O QR Code usa JWT assinado e a validacao consulta o backend. O cliente nao
escreve diretamente em `tickets`.

**Ja esta pronto para vender?**

Esta pronto para demonstracao controlada. Para venda publica ampla, ainda ha
testes reais e revisoes operacionais/legais listadas na documentacao.
