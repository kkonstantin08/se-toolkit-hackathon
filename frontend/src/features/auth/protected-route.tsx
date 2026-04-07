import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useI18n } from "../../lib/i18n";
import { isUnauthorized, useCurrentUser } from "./use-auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data, isLoading, error } = useCurrentUser();
  const { messages } = useI18n();

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-sand text-slate-500">{messages.auth.loadingWorkspace}</div>;
  }

  if (!data && isUnauthorized(error)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!data) {
    return <div className="grid min-h-screen place-items-center bg-sand text-slate-500">{messages.auth.profileLoadFailed}</div>;
  }

  return <>{children}</>;
}
