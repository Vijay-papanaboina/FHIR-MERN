import { useRef, useCallback } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"

/**
 * Shared sign-out hook with in-flight guard (ref-based for stable callback).
 * Navigates to /login (with replace) only on success.
 */
export function useSignOut() {
    const navigate = useNavigate()
    const isSigningOutRef = useRef(false)

    const signOut = useCallback(async () => {
        if (isSigningOutRef.current) return
        isSigningOutRef.current = true
        try {
            await authClient.signOut()
            navigate("/login", { replace: true })
        } catch (err) {
            console.error("Sign out failed:", err)
            toast.error("Sign out failed")
            isSigningOutRef.current = false
        }
    }, [navigate])

    return { signOut, isSigningOut: isSigningOutRef.current }
}
