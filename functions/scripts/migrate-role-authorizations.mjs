import admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.ROLE_MIGRATION_PROJECT_ID;
if (!projectId) {
  throw new Error("ROLE_MIGRATION_PROJECT_ID é obrigatório.");
}
if (process.env.CONFIRM_ROLE_MIGRATION !== projectId) {
  throw new Error(
    "CONFIRM_ROLE_MIGRATION deve ser exatamente igual a ROLE_MIGRATION_PROJECT_ID."
  );
}

process.stdout.write(`role authorization migration project=${projectId}\n`);
if (!admin.apps.length) admin.initializeApp({ projectId });
const db = getFirestore();
const auth = admin.auth();
const operationId = "initial-migration";

function classifyClaims(claims = {}) {
  if (claims.role === "admin") {
    return claims.admin === true ? { kind: "privileged", role: "admin" } :
      { kind: "contradictory" };
  }
  if (claims.role === "organizer" || claims.role === "validator") {
    return claims.admin === true ? { kind: "contradictory" } :
      { kind: "privileged", role: claims.role };
  }
  if (claims.admin === true) return { kind: "contradictory" };
  return { kind: "common" };
}

function validVersion(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function claimsMatch(claims, role, roleVersion) {
  return claims.role === role && claims.roleVersion === roleVersion &&
    (role === "admin" ? claims.admin === true : claims.admin !== true);
}

function operationMatches(data, uid, role, roleVersion, status) {
  return data?.operationId === operationId && data?.targetUid === uid &&
    data?.desiredRole === role && data?.roleVersion === roleVersion &&
    data?.status === status;
}

async function completedMigration(user, role) {
  const authRef = db.collection("authorization").doc(user.uid);
  const operationRef = authRef.collection("operations").doc(operationId);
  const [authorization, operation] = await db.getAll(authRef, operationRef);
  const data = authorization.data();
  if (!authorization.exists || data?.status !== "active" ||
      data.role !== role || !validVersion(data.roleVersion) ||
      !operationMatches(
        operation.data(), user.uid, role, data.roleVersion, "succeeded"
      )) {
    return false;
  }
  return claimsMatch(user.customClaims ?? {}, role, data.roleVersion);
}

async function reserveMigration(user, role) {
  const authRef = db.collection("authorization").doc(user.uid);
  const operationRef = authRef.collection("operations").doc(operationId);
  return db.runTransaction(async (transaction) => {
    const [authorization, operation] = await Promise.all([
      transaction.get(authRef),
      transaction.get(operationRef),
    ]);
    const data = authorization.data() ?? {};
    const operationData = operation.data() ?? {};
    if (authorization.exists && data.status === "active" &&
        data.role === role && validVersion(data.roleVersion) &&
        operationMatches(
          operationData, user.uid, role, data.roleVersion, "succeeded"
        )) {
      return { completed: true, roleVersion: data.roleVersion };
    }

    let roleVersion = 1;
    let requestedAt = FieldValue.serverTimestamp();
    if (authorization.exists) {
      const resumable = (data.status === "applying" || data.status === "error") &&
        data.role === role && data.desiredRole === role &&
        data.operationId === operationId && validVersion(data.roleVersion) &&
        operationMatches(
          operationData, user.uid, role, data.roleVersion,
          data.status === "error" ? "failed" : "applying"
        );
      const legacyActive = data.status === "active" && data.role === role &&
        validVersion(data.roleVersion) && !operation.exists;
      if (!resumable && !legacyActive) {
        throw new Error(`MANUAL_REVIEW_REQUIRED:${user.uid}`);
      }
      roleVersion = data.roleVersion;
      requestedAt = data.requestedAt ?? requestedAt;
      transaction.update(authRef, {
        status: "applying",
        desiredRole: role,
        operationId,
        requestedBy: "role-migration",
        requestedAt,
        appliedAt: null,
        lastErrorCode: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(operationRef, {
        operationId,
        targetUid: user.uid,
        previousRole: role,
        desiredRole: role,
        roleVersion,
        status: "applying",
        requestedBy: "role-migration",
        requestedAt,
        attempts: FieldValue.increment(1),
        failedAt: FieldValue.delete(),
        lastErrorCode: null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      transaction.create(authRef, {
        role,
        roleVersion,
        status: "applying",
        desiredRole: role,
        operationId,
        requestedBy: "role-migration",
        requestedAt,
        appliedAt: null,
        lastErrorCode: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(operationRef, {
        operationId,
        targetUid: user.uid,
        previousRole: role,
        desiredRole: role,
        roleVersion,
        status: "applying",
        requestedBy: "role-migration",
        attempts: 1,
        requestedAt,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { completed: false, roleVersion };
  });
}

function normalizedErrorCode(error) {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("MANUAL_REVIEW_REQUIRED:")) {
    return "MANUAL_REVIEW_REQUIRED";
  }
  if (message.startsWith("FINALIZE_CONFLICT:")) return "FINALIZE_CONFLICT";
  if (message.startsWith("MIGRATION_REVOKE_FAILED")) {
    return "MIGRATION_REVOKE_FAILED";
  }
  if (message.startsWith("MIGRATION_SET_CLAIMS_FAILED")) {
    return "MIGRATION_SET_CLAIMS_FAILED";
  }
  return "MIGRATION_FAILED";
}

async function markFailed(uid, role, roleVersion, errorCode) {
  const authRef = db.collection("authorization").doc(uid);
  const operationRef = authRef.collection("operations").doc(operationId);
  await db.runTransaction(async (transaction) => {
    const authorization = await transaction.get(authRef);
    const data = authorization.data();
    if (!authorization.exists || data?.operationId !== operationId ||
        data?.desiredRole !== role || data?.roleVersion !== roleVersion) return;
    transaction.update(authRef, {
      status: "error",
      lastErrorCode: errorCode,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(operationRef, {
      status: "failed",
      lastErrorCode: errorCode,
      failedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function finalizeMigration(uid, role, roleVersion) {
  const authRef = db.collection("authorization").doc(uid);
  const operationRef = authRef.collection("operations").doc(operationId);
  const profileRef = db.collection("users").doc(uid);
  await db.runTransaction(async (transaction) => {
    const [authorization, operation] = await Promise.all([
      transaction.get(authRef),
      transaction.get(operationRef),
    ]);
    const data = authorization.data();
    const operationData = operation.data();
    const pending = authorization.exists && data?.status === "applying" &&
      data.role === role && data.desiredRole === role &&
      data.operationId === operationId && data.roleVersion === roleVersion &&
      operationMatches(operationData, uid, role, roleVersion, "applying");
    if (!pending) throw new Error(`FINALIZE_CONFLICT:${uid}`);
    transaction.update(authRef, {
      status: "active",
      desiredRole: null,
      operationId: null,
      appliedAt: FieldValue.serverTimestamp(),
      lastErrorCode: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(profileRef, { role }, { merge: true });
    transaction.update(operationRef, {
      status: "succeeded",
      appliedAt: FieldValue.serverTimestamp(),
      failedAt: FieldValue.delete(),
      lastErrorCode: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function migrateUser(user, role) {
  if (await completedMigration(user, role)) return "alreadyMigrated";
  const reservation = await reserveMigration(user, role);
  if (reservation.completed) {
    const refreshed = await auth.getUser(user.uid);
    if (await completedMigration(refreshed, role)) return "alreadyMigrated";
    throw new Error(`MANUAL_REVIEW_REQUIRED:${user.uid}`);
  }

  try {
    try {
      await auth.setCustomUserClaims(user.uid, {
        ...(user.customClaims ?? {}),
        role,
        admin: role === "admin",
        roleVersion: reservation.roleVersion,
      });
    } catch {
      throw new Error("MIGRATION_SET_CLAIMS_FAILED");
    }
    try {
      await auth.revokeRefreshTokens(user.uid);
    } catch {
      throw new Error("MIGRATION_REVOKE_FAILED");
    }
    await finalizeMigration(user.uid, role, reservation.roleVersion);
    return "migrated";
  } catch (error) {
    const errorCode = normalizedErrorCode(error);
    await markFailed(user.uid, role, reservation.roleVersion, errorCode);
    throw new Error(`${errorCode}:${user.uid}`);
  }
}

let pageToken;
const totals = {
  migrated: 0,
  alreadyMigrated: 0,
  skipped: 0,
  manualReview: 0,
  failed: 0,
};
do {
  const page = await auth.listUsers(500, pageToken);
  for (const user of page.users) {
    const classification = classifyClaims(user.customClaims);
    if (classification.kind === "common") {
      totals.skipped += 1;
      continue;
    }
    if (classification.kind === "contradictory") {
      totals.manualReview += 1;
      process.stderr.write(`manual-review uid=${user.uid} code=MANUAL_REVIEW_REQUIRED\n`);
      continue;
    }
    try {
      const result = await migrateUser(user, classification.role);
      totals[result] += 1;
      process.stdout.write(`${result} uid=${user.uid}\n`);
    } catch (error) {
      const code = normalizedErrorCode(error);
      if (code === "MANUAL_REVIEW_REQUIRED") totals.manualReview += 1;
      else totals.failed += 1;
      process.stderr.write(`migration-error uid=${user.uid} code=${code}\n`);
    }
  }
  pageToken = page.pageToken;
} while (pageToken);

process.stdout.write(
  `complete migrated=${totals.migrated} ` +
  `alreadyMigrated=${totals.alreadyMigrated} skipped=${totals.skipped} ` +
  `manualReview=${totals.manualReview} failed=${totals.failed}\n`
);
if (totals.manualReview > 0 || totals.failed > 0) process.exitCode = 1;
