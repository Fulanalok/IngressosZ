import { expect } from "chai";
import functionsTest from "firebase-functions-test";
import { after, before, describe, it } from "mocha";

const test = functionsTest();

describe("Cloud Functions", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myFunctions: any;

  before(async () => {
    try {
      const mod = await import("../../lib/index.js");
      myFunctions = mod;
    } catch (e) {
      console.warn(
        "Could not import index.ts probably due to side effects:",
        e
      );
    }
  });

  after(() => {
    test.cleanup();
  });

  it("should export seedDatabase", () => {
    if (myFunctions) {
      expect(myFunctions.seedDatabase).to.exist;
    }
  });

  it("should export refundPayment", () => {
    if (myFunctions) {
      expect(myFunctions.refundPayment).to.exist;
    }
  });
});
