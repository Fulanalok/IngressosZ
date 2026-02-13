import { getRedirectResult, onAuthStateChanged, signOut, User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { createContext, ReactNode, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { userService } from "../services/firestore";
import type { UserProfile } from "../types";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        const profile = await userService.getUserProfile(currentUser.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          const newUserProfile: Omit<UserProfile, "uid" | "createdAt"> = {
            email: currentUser.email || "",
            displayName: currentUser.displayName || "",
            phone: currentUser.phoneNumber || "",
            role: "user",
            avatarUrl: currentUser.photoURL || "",
          };
          await userService.createUserProfile(currentUser.uid, newUserProfile);
          const createdProfile = await userService.getUserProfile(currentUser.uid);
          setUserProfile(createdProfile || null);
        }
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
        console.error("Erro no login com redirecionamento: ", error);
      });
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const value = { user, userProfile, loading, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
