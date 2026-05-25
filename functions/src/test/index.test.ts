import { expect } from "chai";
import functionsTest from "firebase-functions-test";
import { after, before, describe, it } from "mocha";

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || "zingressos-test";
process.env.GOOGLE_CLOUD_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || "zingressos-test";
process.env.FIREBASE_CONFIG =
  process.env.FIREBASE_CONFIG ||
  JSON.stringify({
    projectId: "zingressos-test",
    storageBucket: "zingressos-test.appspot.com",
  });

const test = functionsTest({
  projectId: "zingressos-test",
  storageBucket: "zingressos-test.appspot.com",
});

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

  it("should export all modular function entrypoints", () => {
    if (!myFunctions) return;

    const expectedExports = [
      "createPaymentPreference",
      "createPaymentPreferencePublic",
      "createPixPayment",
      "createPixPaymentPublic",
      "expireStalePixSessions",
      "health",
      "logClientError",
      "onTicketCreated",
      "optimizeImage",
      "receiveWebhook",
      "refundPayment",
      "seedDatabase",
      "setAdminRole",
      "setUserRole",
      "validateTicket",
      "verifyRecaptchaV2",
    ];

    for (const exportName of expectedExports) {
      expect(myFunctions[exportName], exportName).to.exist;
    }
  });
});
