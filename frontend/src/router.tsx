import { createBrowserRouter, Navigate } from "react-router"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AuthLayout } from "@/layouts/AuthLayout"
import { DashboardLayout } from "@/layouts/DashboardLayout"

import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { PatientListPage } from "@/pages/PatientListPage"
import { PatientDetailPage } from "@/pages/PatientDetailPage"
import { SettingsPage } from "@/pages/SettingsPage"

export const router = createBrowserRouter([
    // Public landing page
    {
        path: "/",
        element: <LandingPage />,
    },

    // Auth pages (centered card layout, no sidebar)
    {
        element: <AuthLayout />,
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
        ],
    },
])
