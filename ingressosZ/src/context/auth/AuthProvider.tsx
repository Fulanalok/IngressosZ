import { normalizeUserRole, USER_ROLES } from "@/constants/roles";
import { auth } from "@/firebaseConfig";
import { userService } from "@/services/firestore";
import { logger } from "@/services/logger";
import type { UserProfile } from "@/types";
import type { User } from "firebase/auth";
import { getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { ReactNode, useEffect, useState } from "react";
import { AuthContext, type AuthContextType } from "./authContext";

function createProfilePayload(user: User): Omit<UserProfile, "uid" | "createdAt"> {
  return {
    email: user.email || "",
    displayName: user.displayName || "",
    phone: user.phoneNumber || "",
    role: USER_ROLES.USER,
    avatarUrl: user.photoURL || "",
  };
}

async function ensureUserProfile(user: User) {
  const profile = await userService.getUserProfile(user.uid);

  if (profile) return profile;

  await userService.createUserProfile(user.uid, createProfilePayload(user));
  return userService.getUserProfile(user.uid);
}

async function getRoleFromClaims(user: User, fallbackRole: UserProfile["role"]) {
  try {
    const tokenResult = await user.getIdTokenResult();
    const claimsRole = tokenResult.claims.role;

    if (tokenResult.claims.admin === true) return USER_ROLES.ADMIN;
    if (typeof claimsRole === "string") return normalizeUserRole(claimsRole);
    return normalizeUserRole(fallbackRole);
  } catch {
    return normalizeUserRole(fallbackRole);
  }
}

async function syncProfileRole(user: User, profile: UserProfile | null) {
  if (!profile) return null;

  const roleFromClaims = await getRoleFromClaims(user, profile.role);
  if (profile.role === roleFromClaims) return profile;

  await userService.updateUserProfile(user.uid, { role: roleFromClaims });
  return { ...profile, role: roleFromClaims };
}

async function getSyncedUserProfile(user: User) {
  const profile = await ensureUserProfile(user);
  return syncProfileRole(user, profile);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (currentUser) {
        setUserProfile(await getSyncedUserProfile(currentUser));
      } else {
        setUserProfile(null);
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) await ensureUserProfile(result.user);
      })
      .catch((error) => {
        logger.error("Erro no login com redirecionamento", error);
      });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      logger.error("Erro ao fazer logout", error);
    }
  };

  const getFreshIdToken: AuthContextType["getFreshIdToken"] = async () => {
    if (!user) return null;
    try {
      return await user.getIdToken(true);
    } catch {
      return null;
    }
  };

  const getAuthHeaders: AuthContextType["getAuthHeaders"] = async () => {
    const token = await getFreshIdToken();
    if (!token) return {} as Record<string, string>;
    return { Authorization: `Bearer ${token}` };
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signOut: handleSignOut,
    getFreshIdToken,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
