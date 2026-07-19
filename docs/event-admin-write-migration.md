# Centralizacao das escritas administrativas de eventos

Fluxos substituidos neste PR:

- `eventService.createEvent`, `updateEvent` e `deleteEvent` deixaram de escrever
  em `events` pelo SDK Web e agora chamam as Functions homonimas.
- `TestDataService.createTestEvents` e `seedSampleEvents` passaram a reutilizar
  `eventService.createEvent`, eliminando seeds diretos pelo navegador.
- o helper sem uso `decrementAvailableTickets` foi removido para que nenhum
  cliente mantenha uma escrita direta de estoque.

As atribuicoes de organizer e validator ja eram centralizadas em
`setEventOrganizer` e `setEventValidator` e continuam assim. A criacao aceita a
configuracao inicial validada de capacidade e precos; alteracoes posteriores de
identidade, estoque, vendas, pricing e valores financeiros nao fazem parte da
edicao administrativa comum. Checkout, pagamentos e validacao de tickets nao
foram alterados.
