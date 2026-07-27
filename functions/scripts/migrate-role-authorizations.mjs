import admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

if (process.env.FUNCTIONS_EMULATOR !== "true" &&
    process.env.CONFIRM_ROLE_MIGRATION !== "true") {
  throw new Error(
    "Defina CONFIRM_ROLE_MIGRATION=true para executar o backfill administrativo."
  );
}

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();
const auth = admin.auth();

function privilegedRole(claims = {}) {
  if (claims.role === "admin" || claims.admin === true) return "admin";
  if (claims.role === "organizer") return "organizer";
  if (claims.role === "validator") return "validator";
  return null;
}

async function reserveMigration(user, role) {
  const ref = db.collection("authorization").doc(user.uid);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) {
      const data = snapshot.data();
      if (data.status !== "active" || data.role !== role ||
          !Number.isSafeInteger(data.roleVersion) || data.roleVersion < 1) {
        throw new Error(`MANUAL_REVIEW_REQUIRED:${user.uid}`);
      }
      return data.roleVersion;
    }
    transaction.create(ref, {
      role,
      roleVersion: 1,
      status: "active",
      desiredRole: null,
      operationId: null,
      requestedBy: "role-migration",
      requestedAt: FieldValue.serverTimestamp(),
      appliedAt: null,
      lastErrorCode: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return 1;
  });
}

async function migrateUser(user, role) {
  const roleVersion = await reserveMigration(user, role);
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims ?? {}),
    role,
    admin: role === "admin",
    roleVersion,
  });
  await auth.revokeRefreshTokens(user.uid);

  const authRef = db.collection("authorization").doc(user.uid);
  const operationRef = authRef.collection("operations").doc("initial-migration");
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(authRef);
    const data = snapshot.data();
    if (!snapshot.exists || data.role !== role ||
        data.roleVersion !== roleVersion || data.status !== "active") {
      throw new Error(`FINALIZE_CONFLICT:${user.uid}`);
    }
    transaction.set(db.collection("users").doc(user.uid), { role }, { merge: true });
    transaction.update(authRef, {
      appliedAt: FieldValue.serverTimestamp(),
      lastErrorCode: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(operationRef, {
      operationId: "initial-migration",
      targetUid: user.uid,
      previousRole: role,
      desiredRole: role,
      roleVersion,
      status: "succeeded",
      requestedBy: "role-migration",
      attempts: 1,
      requestedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      appliedAt: FieldValue.serverTimestamp(),
      lastErrorCode: null,
    }, { merge: true });
  });
}

let pageToken;
let migrated = 0;
let skipped = 0;
do {
  const page = await auth.listUsers(500, pageToken);
  for (const user of page.users) {
    const role = privilegedRole(user.customClaims);
    if (!role) {
      skipped += 1;
      continue;
    }
    await migrateUser(user, role);
    migrated += 1;
    process.stdout.write(`migrated ${user.uid}\n`);
  }
  pageToken = page.pageToken;
} while (pageToken);

process.stdout.write(`complete migrated=${migrated} skipped=${skipped}\n`);
