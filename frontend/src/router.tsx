import { createBrowserRouter, Navigate } from "react-router";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/PublicOnlyRoute";
import { DashboardRoleGuard } from "@/components/DashboardRoleGuard";
import { PortalGuard } from "@/components/PortalGuard";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PortalLayout } from "@/layouts/PortalLayout";

import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { PatientListPage } from "@/pages/PatientListPage";
import { PatientDetailPage } from "@/pages/PatientDetailPage";
import { AlertsPage } from "@/pages/AlertsPage";
import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { UsersPage } from "@/pages/UsersPage";
import { PortalHealthPage } from "@/pages/PortalHealthPage";
import { PortalVitalsPage } from "@/pages/PortalVitalsPage";
import { PortalCareTeamPage } from "@/pages/PortalCareTeamPage";
import { PortalMedicationsPage } from "@/pages/PortalMedicationsPage";
import { PortalAppointmentsPage } from "@/pages/PortalAppointmentsPage";
import { PortalConditionsPage } from "@/pages/PortalConditionsPage";
import { PortalAllergiesPage } from "@/pages/PortalAllergiesPage";
import { PortalDiagnosticsPage } from "@/pages/PortalDiagnosticsPage";
import { PendingRolePage } from "@/pages/PendingRolePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/pending-role",
    element: <PendingRolePage />,
  },

  // Public landing page (logged-in users are redirected by role)
  {
    path: "/",
    element: (
      <PublicOnlyRoute>
        <LandingPage />
      </PublicOnlyRoute>
    ),
  },

  // Auth pages (centered card layout, no sidebar)
  // Redirects to dashboard if already logged in
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
    ],
  },

  // Protected dashboard (sidebar layout)
  {
    path: "dashboard",
    element: (
      <ProtectedRoute allowedRoles={["admin", "practitioner"]}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // /dashboard → redirect to /dashboard/patients
      { index: true, element: <Navigate to="patients" replace /> },
      { path: "patients", element: <PatientListPage /> },
      { path: "patients/:id", element: <PatientDetailPage /> },
      { path: "alerts", element: <AlertsPage /> },
      {
        path: "assignments",
        element: (
          <DashboardRoleGuard allowedRoles={["admin"]}>
            <AssignmentsPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: "users",
        element: (
          <DashboardRoleGuard allowedRoles={["admin"]}>
            <UsersPage />
          </DashboardRoleGuard>
        ),
      },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },

  // Protected portal routes (patient)
  {
    path: "portal",
    element: (
      <ProtectedRoute allowedRoles={["patient"]}>
        <PortalGuard>
          <PortalLayout />
        </PortalGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="health" replace /> },
      { path: "health", element: <PortalHealthPage /> },
      { path: "vitals", element: <PortalVitalsPage /> },
      { path: "care-team", element: <PortalCareTeamPage /> },
      { path: "medications", element: <PortalMedicationsPage /> },
      { path: "appointments", element: <PortalAppointmentsPage /> },
      { path: "conditions", element: <PortalConditionsPage /> },
      { path: "allergies", element: <PortalAllergiesPage /> },
      { path: "diagnostics", element: <PortalDiagnosticsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },

  // 404 catch-all
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
