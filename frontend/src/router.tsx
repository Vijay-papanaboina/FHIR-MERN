import { createBrowserRouter, Navigate } from "react-router"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { PublicOnlyRoute } from "@/components/PublicOnlyRoute"
import { AuthLayout } from "@/layouts/AuthLayout"
import { DashboardLayout } from "@/layouts/DashboardLayout"

import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { PatientListPage } from "@/pages/PatientListPage"
import { PatientDetailPage } from "@/pages/PatientDetailPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { NotFoundPage } from "@/pages/NotFoundPage"

export const router = createBrowserRouter([
    // Public landing page
    {
        path: "/",
        element: <LandingPage />,
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
            <ProtectedRoute>
                <DashboardLayout />
            </ProtectedRoute>
        ),
        children: [
            // /dashboard → redirect to /dashboard/patients
            { index: true, element: <Navigate to="patients" replace /> },
            { path: "patients", element: <PatientListPage /> },
            { path: "patients/:id", element: <PatientDetailPage /> },
            { path: "settings", element: <SettingsPage /> },
            { path: "*", element: <NotFoundPage /> },
        ],
    },

    // 404 catch-all
    {
        path: "*",
        element: <NotFoundPage />,
    },
])
