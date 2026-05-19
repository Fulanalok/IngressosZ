import { expect } from "chai";
import { describe, it } from "mocha";
import { planSaleInventoryUpdate } from "../../lib/domain/inventory.js";

describe("Webhook Inventory Logic", () => {
  it(
    "rejeita compra VIP quando o inventario VIP esta esgotado mas Standard tem estoque",
    () => {
      const plan = planSaleInventoryUpdate(
        {
          availableTickets: 50,
          inventory: { standard: 50, vip: 0 },
          pricing: { standard: 100, vip: 200 },
        },
        "vip",
        1
      );

      expect(plan.oversold).to.equal(true);
      expect(plan.currentStock).to.equal(50);
      expect(plan.currentTypeStock).to.equal(0);
      expect(plan.unitPrice).to.equal(200);
      expect(plan.nextAvailableTickets).to.equal(undefined);
      expect(plan.nextTypeStock).to.equal(undefined);
    }
  );

  it("decrementa o inventario global e especifico ao aprovar pagamento VIP", () => {
    const plan = planSaleInventoryUpdate(
      {
        availableTickets: 100,
        inventory: { standard: 50, vip: 50 },
        pricing: { standard: 100, vip: 200 },
      },
      "vip",
      2
    );

    expect(plan.oversold).to.equal(false);
    expect(plan.currentStock).to.equal(100);
    expect(plan.currentTypeStock).to.equal(50);
    expect(plan.unitPrice).to.equal(200);
    expect(plan.nextAvailableTickets).to.equal(98);
    expect(plan.nextTypeStock).to.equal(48);
  });

  it("usa estoque global como fallback quando nao ha inventario por tipo", () => {
    const plan = planSaleInventoryUpdate(
      {
        availableTickets: 3,
        price: 75,
      },
      "standard",
      2
    );

    expect(plan.oversold).to.equal(false);
    expect(plan.currentTypeStock).to.equal(3);
    expect(plan.unitPrice).to.equal(75);
    expect(plan.nextAvailableTickets).to.equal(1);
    expect(plan.nextTypeStock).to.equal(undefined);
  });
});
