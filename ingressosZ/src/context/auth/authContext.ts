import { createContext } from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/types";

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getFreshIdToken: () => Promise<string | null>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

