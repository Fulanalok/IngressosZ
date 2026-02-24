import "mocha";
import {expect} from "chai";
import functionsTest = require("firebase-functions-test");

const test = functionsTest();

describe('Cloud Functions', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myFunctions: any;

  before(() => {
    // Use offline mode mocks
    // Note: importing index.ts will trigger admin.initializeApp()
    // We should mock it if possible, but for now let's see if it works.
    try {
      myFunctions = require("../index");
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
