import admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { initSentry } from "./sentry.js";

initSentry();

setGlobalOptions({ region: "southamerica-east1" });

if (typeof admin.initializeApp === "function") {
  admin.initializeApp();
}
