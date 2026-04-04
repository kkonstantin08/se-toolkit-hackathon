import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "../components/layout/app-shell";
import { ProtectedRoute } from "../features/auth/protected-route";
import { AiDraftPage } from "../pages/ai-draft-page";
import { IntegrationsPage } from "../pages/integrations-page";
import { LoginPage } from "../pages/login-page";
import { PlannerPage } from "../pages/planner-page";
import { RegisterPage } from "../pages/register-page";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/planner" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/planner",
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlannerPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: "/ai/drafts/:draftId",
    element: (
      <ProtectedRoute>
        <AppShell>
          <AiDraftPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings/integrations",
    element: (
      <ProtectedRoute>
        <AppShell>
          <IntegrationsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
]);
