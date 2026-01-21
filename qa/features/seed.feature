Feature: Seed de dados de teste via rota Dev Auto

  Scenario: Usuário semeia dados e visualiza ingressos
    Given o app está rodando
    When eu visito "/dev-auto"
    Then eu devo ver "Meus Ingressos"

  Scenario: Navegar para Validador pela Navbar e validar código
    Given o app está rodando
    When eu visito "/dev-auto"
    Then eu devo ver "Meus Ingressos"
    When eu clico "Validador"
    Then eu devo ver cabeçalho ou login "Validador de Ingressos"
    When eu preencho código "TICKET-1756295230187-lxfcondum"
    When eu clico "Validar Ingresso"
    Then eu devo ver status de validação

  Scenario: Exibir opcionalmente QR Code
    Given o app está rodando
    When eu visito "/dev-auto"
    Then eu devo ver "Meus Ingressos"
    When eu clico opcional "Mostrar QR Code"
    Then eu devo ver opcional "QR CODE"

  Scenario: Abrir Debug Firebase pela Navbar
    Given o app está rodando
    When eu visito "/dev-auto"
    Then eu devo ver "Meus Ingressos"
    When eu clico "Debug"
    Then eu devo ver "Debug Firebase"

  Scenario: Meus Ingressos lista ou vazio
    Given o app está rodando
    When eu visito "/dev-auto"
    Then eu devo ver "Meus Ingressos"
    Then eu devo ver lista ou vazio

  Scenario: Eventos com filtros
    Given o app está rodando
    When eu visito "/dev-auto"
    Then eu devo ver "Meus Ingressos"
    When eu clico "Eventos"
    Then eu devo ver cabeçalho ou login "Eventos Disponíveis"
    Then eu devo ver campo busca
    When eu busco por "Evento"
    When eu seleciono categoria "Todos"
