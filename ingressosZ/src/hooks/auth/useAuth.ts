import { useContext } from "react";
import { AuthContext, type AuthContextType } from "@/context/auth/authContext";

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
