import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useCurrentUser, isUnauthorized } from "./use-auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data, isLoading, error } = useCurrentUser();

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-sand text-slate-500">Загружаем пространство PlanSync...</div>;
  }

  if (!data && isUnauthorized(error)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!data) {
    return <div className="grid min-h-screen place-items-center bg-sand text-slate-500">Не удалось загрузить профиль.</div>;
  }

  return <>{children}</>;
}
