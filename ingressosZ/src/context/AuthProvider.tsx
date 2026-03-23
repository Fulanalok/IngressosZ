import { auth } from "@/firebaseConfig";
import { userService } from "@/services/firestore";
import { logger } from "@/services/logger";
import type { UserProfile } from "@/types";
import type { User } from "firebase/auth";
import { getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { ReactNode, useEffect, useState } from "react";
import { AuthContext, type AuthContextType } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        let profile = await userService.getUserProfile(currentUser.uid);
        if (!profile) {
          const newUserProfile: Omit<UserProfile, "uid" | "createdAt"> = {
            email: currentUser.email || "",
            displayName: currentUser.displayName || "",
            phone: currentUser.phoneNumber || "",
            role: "user",
            avatarUrl: currentUser.photoURL || "",
          };
          await userService.createUserProfile(currentUser.uid, newUserProfile);
          profile = await userService.getUserProfile(currentUser.uid);
        }

        let roleFromClaims: UserProfile["role"] = profile?.role || "user";
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          const claimsRole = tokenResult.claims.role;
          const isAdmin = tokenResult.claims.admin === true;
          if (isAdmin) {
            roleFromClaims = "admin";
          } else if (typeof claimsRole === "string") {
            const normalized = claimsRole.toLowerCase();
            if (
              normalized === "user" ||
              normalized === "organizer" ||
              normalized === "validator" ||
              normalized === "admin"
            ) {
              roleFromClaims = normalized as UserProfile["role"];
            }
          }
        } catch {
          roleFromClaims = profile?.role || "user";
        }

        if (profile && profile.role !== roleFromClaims) {
          await userService.updateUserProfile(currentUser.uid, {
            role: roleFromClaims,
          });
          profile = { ...profile, role: roleFromClaims };
        }

        setUserProfile(profile || null);
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
        if (result?.user) {
          const { user: authUser } = result;
          const profile = await userService.getUserProfile(authUser.uid);
          if (!profile) {
            const newUserProfile: Omit<UserProfile, "uid" | "createdAt"> = {
              email: authUser.email || "",
              displayName: authUser.displayName || "",
              phone: authUser.phoneNumber || "",
              role: "user",
              avatarUrl: authUser.photoURL || "",
            };
            await userService.createUserProfile(authUser.uid, newUserProfile);
          }
        }
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
      const token = await user.getIdToken(true);
      return token;
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
