/* eslint-disable require-jsdoc, max-len, complexity */
import admin from "firebase-admin";
import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type Transaction,
} from "firebase-admin/firestore";
import {
  defaultOperationId,
  ROLE_CHANGE_ERROR_CODES,
  RoleChangeFailure,
  type RoleChangeDependencies,
  type RoleChangeRepository,
  type RoleReservation,
} from "../auth/roleChange.js";
import type { UserRole } from "../auth/authorization.js";

type ReservationInput = Parameters<RoleChangeRepository["reserve"]>[0];

function validRole(value: unknown): value is UserRole {
  return value === "user" || value === "validator" ||
    value === "organizer" || value === "admin";
}

function reservationFromData(
  targetUid: string,
  data: DocumentData,
  completed = false
): RoleReservation {
  if (!validRole(data.role) || !validRole(data.desiredRole) ||
    typeof data.operationId !== "string" ||
    !Number.isSafeInteger(data.roleVersion) || data.roleVersion < 1) {
    throw new RoleChangeFailure("AUTHORIZATION_INVALID", "Estado de autorização inválido.");
  }
  return {
    targetUid,
    previousRole: data.role,
    desiredRole: data.desiredRole,
    roleVersion: data.roleVersion,
    operationId: data.operationId,
    completed,
  };
}

function updateExistingOperation(
  transaction: Transaction,
  authRef: FirebaseFirestore.DocumentReference,
  data: DocumentData,
  desiredRole: UserRole
) {
  if (data.desiredRole !== desiredRole) {
    throw new RoleChangeFailure(
      "ROLE_CHANGE_CONFLICT",
      "Há outra mudança de role pendente para este usuário."
    );
  }
  const reservation = reservationFromData(authRef.id, data);
  const operationRef = authRef.collection("operations").doc(reservation.operationId);
  transaction.update(authRef, {
    status: "applying",
    lastErrorCode: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  transaction.set(operationRef, {
    status: "applying",
    attempts: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return reservation;
}

function reserveExistingAuthorization(
  transaction: Transaction,
  authRef: FirebaseFirestore.DocumentReference,
  data: DocumentData,
  input: ReservationInput
): RoleReservation {
  if (data.status === "applying" || data.status === "error") {
    return updateExistingOperation(
      transaction,
      authRef,
      data,
      input.desiredRole
    );
  }
  if (data.status !== "active" || !validRole(data.role) ||
      !Number.isSafeInteger(data.roleVersion) || data.roleVersion < 1) {
    throw new RoleChangeFailure(
      "AUTHORIZATION_INVALID",
      "Estado de autorização inválido."
    );
  }
  if (data.role === input.desiredRole) {
    return {
      targetUid: input.targetUid,
      previousRole: data.role,
      desiredRole: input.desiredRole,
      roleVersion: data.roleVersion,
      operationId: input.operationId,
      completed: true,
    };
  }
  const roleVersion = data.roleVersion + 1;
  const reservation = {
    targetUid: input.targetUid,
    previousRole: data.role,
    desiredRole: input.desiredRole,
    roleVersion,
    operationId: input.operationId,
    completed: false,
  };
  const operationRef = authRef.collection("operations").doc(input.operationId);
  transaction.update(authRef, {
    roleVersion,
    status: "applying",
    desiredRole: input.desiredRole,
    operationId: input.operationId,
    requestedBy: input.requestedBy,
    requestedAt: FieldValue.serverTimestamp(),
    appliedAt: null,
    lastErrorCode: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  transaction.create(operationRef, {
    operationId: input.operationId,
    targetUid: input.targetUid,
    previousRole: data.role,
    desiredRole: input.desiredRole,
    roleVersion,
    status: "applying",
    requestedBy: input.requestedBy,
    attempts: 1,
    requestedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return reservation;
}

function createInitialReservation(
  transaction: Transaction,
  authRef: FirebaseFirestore.DocumentReference,
  input: ReservationInput
): RoleReservation {
  const reservation = {
    targetUid: input.targetUid,
    previousRole: "user" as const,
    desiredRole: input.desiredRole,
    roleVersion: 1,
    operationId: input.operationId,
    completed: false,
  };
  transaction.create(authRef, {
    role: "user",
    roleVersion: 1,
    status: "applying",
    desiredRole: input.desiredRole,
    operationId: input.operationId,
    requestedBy: input.requestedBy,
    requestedAt: FieldValue.serverTimestamp(),
    appliedAt: null,
    lastErrorCode: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  transaction.create(authRef.collection("operations").doc(input.operationId), {
    operationId: input.operationId,
    targetUid: input.targetUid,
    previousRole: "user",
    desiredRole: input.desiredRole,
    roleVersion: 1,
    status: "applying",
    requestedBy: input.requestedBy,
    attempts: 1,
    requestedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return reservation;
}

export const firebaseRoleChangeRepository: RoleChangeRepository = {
  async reserve(input) {
    const db = getFirestore();
    const authRef = db.collection("authorization").doc(input.targetUid);
    return db.runTransaction(
      // eslint-disable-next-line complexity
      async (transaction) => {
        const snapshot = await transaction.get(authRef);
        if (!snapshot.exists) return null;
        return reserveExistingAuthorization(
          transaction,
          authRef,
          snapshot.data() ?? {},
          input
        );
      }
    );
  },

  async initializeLegacy(input) {
    const db = getFirestore();
    const authRef = db.collection("authorization").doc(input.targetUid);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(authRef);
      if (snapshot.exists) {
        return reserveExistingAuthorization(
          transaction,
          authRef,
          snapshot.data() ?? {},
          input
        );
      }
      if (input.discovery.kind === "contradictory") {
        throw new RoleChangeFailure(
          "MANUAL_REVIEW_REQUIRED",
          "Claims privilegiadas contraditórias exigem revisão manual."
        );
      }
      if (input.discovery.kind === "privileged") {
        throw new RoleChangeFailure(
          "MIGRATION_REQUIRED",
          "Usuário privilegiado precisa ser migrado antes da alteração."
        );
      }
      return createInitialReservation(transaction, authRef, input);
    });
  },

  async markFailed(reservation, errorCode) {
    const db = getFirestore();
    const authRef = db.collection("authorization").doc(reservation.targetUid);
    const operationRef = authRef.collection("operations").doc(reservation.operationId);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(authRef);
      const data = snapshot.data();
      if (!snapshot.exists || data?.operationId !== reservation.operationId ||
        data?.roleVersion !== reservation.roleVersion) return;
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
  },

  async finalize(reservation) {
    const db = getFirestore();
    const authRef = db.collection("authorization").doc(reservation.targetUid);
    const profileRef = db.collection("users").doc(reservation.targetUid);
    const operationRef = authRef.collection("operations").doc(reservation.operationId);
    await db.runTransaction(async (transaction) => {
      const [snapshot, operationSnapshot] = await Promise.all([
        transaction.get(authRef),
        transaction.get(operationRef),
      ]);
      const data = snapshot.data() ?? {};
      const operation = operationSnapshot.data() ?? {};
      const operationConsistent = operationSnapshot.exists &&
        operation.operationId === reservation.operationId &&
        operation.targetUid === reservation.targetUid &&
        operation.desiredRole === reservation.desiredRole &&
        operation.roleVersion === reservation.roleVersion;
      const alreadyFinalized = snapshot.exists && operationConsistent &&
        data.status === "active" &&
        data.role === reservation.desiredRole &&
        data.roleVersion === reservation.roleVersion &&
        operation.status === "succeeded";
      if (alreadyFinalized) return;
      const pending = snapshot.exists && operationConsistent &&
        data.operationId === reservation.operationId &&
        data.roleVersion === reservation.roleVersion &&
        data.desiredRole === reservation.desiredRole &&
        (data.status === "applying" || data.status === "error") &&
        (operation.status === "applying" || operation.status === "failed");
      if (!pending) {
        throw new RoleChangeFailure(
          ROLE_CHANGE_ERROR_CODES.finalizeConflict,
          "A operação não corresponde ao estado autoritativo atual."
        );
      }
      transaction.update(authRef, {
        role: reservation.desiredRole,
        status: "active",
        desiredRole: null,
        operationId: null,
        requestedBy: null,
        requestedAt: null,
        appliedAt: FieldValue.serverTimestamp(),
        lastErrorCode: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(profileRef, { role: reservation.desiredRole }, { merge: true });
      transaction.set(operationRef, {
        status: "succeeded",
        appliedAt: FieldValue.serverTimestamp(),
        failedAt: FieldValue.delete(),
        lastErrorCode: null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  },
};

export const firebaseRoleChangeDependencies: RoleChangeDependencies = {
  repository: firebaseRoleChangeRepository,
  operationId: defaultOperationId,
  auth: {
    async getClaims(uid) {
      const user = await admin.auth().getUser(uid);
      return user.customClaims ?? {};
    },
    async setClaims(uid, claims) {
      await admin.auth().setCustomUserClaims(uid, claims);
    },
    async revokeRefreshTokens(uid) {
      await admin.auth().revokeRefreshTokens(uid);
    },
  },
};
