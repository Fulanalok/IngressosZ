import { Button } from "@/components/ui/button";
import { normalizeUserRole, type UserRole } from "@/constants/roles";
import { useAuth } from "@/hooks/auth/useAuth";
import type { ReactNode } from "react";
import { Link, Navigate } from "react-router";

type RequireRoleProps = {
  role: UserRole | UserRole[];
  children: ReactNode;
};

export function RequireRole({ role, children }: RequireRoleProps) {
  const { userProfile } = useAuth();
  const allowedRoles = Array.isArray(role) ? role : [role];
  const userRole = normalizeUserRole(userProfile?.role);
  const hasRole = allowedRoles.includes(userRole);

  if (hasRole) return <>{children}</>;

  if (import.meta.env.DEV) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Acesso Restrito (DEV Mode)</h2>
        <p className="text-muted-foreground mb-4">
          Esta rota exige um dos seguintes papeis:{" "}
          <code className="bg-muted px-1 rounded">
            {allowedRoles.join(", ")}
          </code>
        </p>
        <p className="mb-6">
          Seu papel atual e:{" "}
          <code className="bg-muted px-1 rounded">{userRole}</code>
        </p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link to="/">Voltar para Inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <Navigate to="/" replace />;
}
