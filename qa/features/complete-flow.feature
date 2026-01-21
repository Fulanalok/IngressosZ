Feature: Fluxo Completo do Sistema IngressosZ

  Background:
    Given os emuladores Firebase estão rodando
    And o frontend está rodando em "https://localhost:5173"

  Scenario: Cadastro de novo usuário
    Given eu acesso a página inicial
    When eu clico no link "Cadastrar"
    Then eu devo ver o formulário de cadastro
    When eu preencho email "teste@ingressosz.com"
    And eu preencho senha "Teste123456"
    And eu clico no botão "Criar Conta"
    Then eu devo ser redirecionado para a home
    And eu devo estar autenticado

  Scenario: Login de usuário existente
    Given existe um usuário com email "login@test.com" e senha "Test123"
    When eu acesso a página de login
    And eu preencho email "login@test.com"
    And eu preencho senha "Test123"
    And eu clico no botão "Entrar"
    Then eu devo estar autenticado
    And eu devo ver meu perfil na navbar

  Scenario: Visualizar eventos disponíveis
    Given eu estou autenticado
    When eu navego para "Eventos"
    Then eu devo ver a lista de eventos
    And cada evento deve ter título, data, local e preço

  Scenario: Filtrar eventos por categoria
    Given eu estou na página de eventos
    When eu seleciono a categoria "Música"
    Then eu devo ver apenas eventos da categoria "Música"

  Scenario: Buscar eventos por nome
    Given eu estou na página de eventos
    When eu digito "Rock" no campo de busca
    Then eu devo ver apenas eventos que contêm "Rock" no título

  Scenario: Ver detalhes de um evento
    Given eu estou na página de eventos
    When eu clico no primeiro evento
    Then eu devo ver a página de detalhes do evento
    And eu devo ver os tipos de ingresso disponíveis
    And eu devo ver o botão "Comprar Ingresso"

  Scenario: Comprar ingresso standard
    Given eu estou na página de detalhes de um evento
    When eu seleciono o tipo "standard"
    And eu clico no botão de compra "Comprar Ingresso"
    Then devo ver a tela de pagamento Mercado Pago

  Scenario: Comprar ingresso VIP
    Given eu estou na página de detalhes de um evento
    When eu seleciono o tipo "vip"
    And eu clico no botão de compra "Comprar Ingresso"
    Then o pedido deve ser criado com valor R$ 150

  Scenario: Comprar ingresso Premium
    Given eu estou na página de detalhes de um evento
    When eu seleciono o tipo "premium"
    And eu clico no botão de compra "Comprar Ingresso"
    Then o pedido deve ser criado com valor R$ 300

  Scenario: Ver meus ingressos
    Given eu comprei um ingresso
    When eu navego para "Meus Ingressos"
    Then eu devo ver a lista dos meus ingressos
    And cada ingresso deve ter QR code único
    And cada ingresso deve ter status "active"

  Scenario: Mostrar QR Code do ingresso
    Given eu estou em "Meus Ingressos"
    When eu clico em "Mostrar QR Code" no primeiro ingresso
    Then eu devo ver o QR code ampliado
    And o QR code deve conter o código do ticket

  Scenario: Validar ingresso válido
    Given eu sou um organizador
    And existe um ingresso com código "TICKET-123-abc"
    When eu acesso a página de validação
    And eu preencho o código "TICKET-123-abc"
    And eu clico no botão de validação "Validar Ingresso"
    Then eu devo ver mensagem "Ingresso Válido"
    And o status do ingresso deve mudar para "used"

  Scenario: Validar ingresso já usado
    Given existe um ingresso usado com código "TICKET-456-used"
    When eu tento validar o código "TICKET-456-used"
    Then eu devo ver mensagem "Ingresso já foi utilizado"

  Scenario: Validar ingresso inválido
    When eu tento validar o código "TICKET-INVALIDO"
    Then eu devo ver mensagem "Ingresso não encontrado"

  Scenario: Verificar dados no Firebase Firestore
    Given eu acessei o emulator UI
    When eu navego para Firestore
    Then eu devo ver a collection "events"
    And eu devo ver a collection "users"
    And eu devo ver a collection "tickets"
    And eu devo ver a collection "orders"

  Scenario: Verificar autenticação no Firebase Auth
    Given existem usuários cadastrados
    When eu acesso o Firebase Auth no emulator
    Then eu devo ver a lista de usuários
    And cada usuário deve ter email e UID

  Scenario: Verificar logs das Cloud Functions
    Given uma compra foi realizada
    When eu acesso os logs no emulator UI
    Then eu devo ver chamadas para "mercadoPagoCreatePreference"
    And não deve haver erros críticos

  Scenario: Modo dev - compra sem Mercado Pago
    Given o token do Mercado Pago está inválido ou vazio
    When eu tento comprar um ingresso
    Then o ingresso deve ser criado automaticamente
    And eu devo ver mensagem de "Modo Dev"

  Scenario: Logout de usuário
    Given eu estou autenticado
    When eu clico em "Sair" na navbar
    Then eu devo ser deslogado
    And eu devo ser redirecionado para a página inicial

  Scenario: Tentar acessar área protegida sem login
    Given eu não estou autenticado
    When eu tento acessar "Meus Ingressos"
    Then eu devo ser redirecionado para login

  Scenario: Persistência de dados no Firestore
    Given eu criei um ingresso
    When eu recarrego a página
    Then o ingresso ainda deve estar visível
    And todos os dados devem estar preservados

  Scenario: CORS - requisições do frontend para functions
    Given o frontend está em "localhost:5173"
    When eu faço uma requisição para as functions
    Then a requisição não deve ser bloqueada por CORS
    And eu devo receber uma resposta válida

  Scenario: Verificar integração Mercado Pago
    Given o token do Mercado Pago está configurado
    When eu tento criar uma preferência de pagamento
    Then a API do Mercado Pago deve responder
    And eu devo receber um init_point válido

  Scenario: Sistema completo funcionando
    Given todos os componentes estão rodando
    When eu faço um fluxo completo de compra
    Then o ingresso deve ser criado no Firestore
    And eu devo poder visualizar o ingresso
    And eu devo poder validar o ingresso
    And todas as etapas devem funcionar sem erros
