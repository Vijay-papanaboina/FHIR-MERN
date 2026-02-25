import { Navigate } from "react-router"
import { authClient } from "@/lib/auth-client"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = authClient.useSession()

    if (isPending) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}
