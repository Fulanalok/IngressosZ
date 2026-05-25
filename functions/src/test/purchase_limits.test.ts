import { expect } from "chai";
import { describe, it } from "mocha";
import {
  MAX_PURCHASE_QUANTITY,
  resolveMaxPerPurchase,
} from "../../lib/domain/purchaseLimits.js";

describe("Purchase Limits", () => {
  it("uses the default purchase limit when event config is absent", () => {
    expect(resolveMaxPerPurchase({})).to.equal(MAX_PURCHASE_QUANTITY);
  });

  it("uses a valid event-specific purchase limit", () => {
    expect(resolveMaxPerPurchase({ maxPerPurchase: 12 })).to.equal(12);
  });

  it("rejects invalid event-specific purchase limits", () => {
    expect(resolveMaxPerPurchase({ maxPerPurchase: 0 })).to.equal(
      MAX_PURCHASE_QUANTITY
    );
    expect(resolveMaxPerPurchase({ maxPerPurchase: 51 })).to.equal(
      MAX_PURCHASE_QUANTITY
    );
    expect(resolveMaxPerPurchase({ maxPerPurchase: 2.5 })).to.equal(
      MAX_PURCHASE_QUANTITY
    );
  });
});
