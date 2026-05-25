describe("Fluxo de autenticacao", () => {
  it("renderiza a tela de login sem depender de servicos externos", () => {
    cy.visit("/login");

    cy.contains("Bem-vindo de volta!").should("be.visible");
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("be.visible").and("not.be.disabled");
    cy.contains("Criar conta gratuita").should("be.visible");
  });
});
