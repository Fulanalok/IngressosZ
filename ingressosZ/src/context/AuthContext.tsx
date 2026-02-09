import type { User } from "firebase/auth";
import { signOut as firebaseSignOut, onIdTokenChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { userService } from "../services/firestore";
import { postClientError } from "../services/logger";
import type { UserProfile } from "../types";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Buscar perfil do usuário no Firestore
        try {
          const profile = await userService.getUserProfile(currentUser.uid);
          if (profile) {
            setUserProfile(profile);
          } else {
            // Criar perfil básico se não existir
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || "",
              displayName: currentUser.displayName || "",
              role: "user",
              createdAt: new Date().toISOString(),
            };
            await userService.createUserProfile(currentUser.uid, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.error("Erro ao buscar perfil do usuário:", error);
          void postClientError({
            type: "profile-load-error",
            message: String(error),
            route: window.location.pathname,
            ua: navigator.userAgent,
            uid: currentUser.uid,
            ts: Date.now(),
          });
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  };

  const getFreshIdToken = async () => {
    const u = auth.currentUser;
    if (!u) return null;
    try {
      const token = await u.getIdToken(true);
      return token;
    } catch {
      return null;
    }
  };

  const getAuthHeaders = async () => {
    const token = await getFreshIdToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const value = {
    user,
    userProfile,
    loading,
    signOut,
    getFreshIdToken,
    getAuthHeaders,
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        🎫 Carregando IngressosZ...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
