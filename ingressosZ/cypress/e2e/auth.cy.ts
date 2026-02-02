
// cypress/e2e/auth.cy.ts

describe('Fluxo de Autenticação', () => {
  it('deve permitir que o usuário faça login e logout', () => {
    cy.visit('/login');

    // Mock da resposta do Firebase para evitar chamadas reais
    cy.intercept('POST', 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=*', {
      fixture: 'login-success.json' // Usaremos um fixture para a resposta
    }).as('firebaseLogin');

    // Preencher o formulário
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Esperar a chamada ser completada e verificar o redirecionamento
    cy.wait('@firebaseLogin');
    cy.url().should('include', '/'); // Deve redirecionar para a Home

    // Fazer logout
    cy.get('[data-testid="navbar-user-dropdown"]').click();
    cy.contains('Sair').click();
    cy.url().should('include', '/login'); // Deve redirecionar para o Login
  });
});
