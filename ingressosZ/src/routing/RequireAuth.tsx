import { useAuth } from "@/hooks/auth/useAuth";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
