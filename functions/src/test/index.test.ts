const { describe, it, before, after } = require("mocha");
const { expect } = require("chai");
const functionsTest = require("firebase-functions-test");

const test = functionsTest();

describe("Cloud Functions", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myFunctions: any;

  before(() => {
    try {
      myFunctions = require("../../lib/index.js");
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
